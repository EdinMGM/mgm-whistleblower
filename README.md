# MGM FARM — Anonimni kanal za prijavu neusklađenosti

> **Od:** Edin Jasarspahic
> **Za:** Senior development tim
> **Datum:** Oktober 2026

---

## 1. O PROJEKTU

Ovaj projekat je sigurna web aplikacija za MGM Farm d.o.o. koja omogucava
zaposlenicima i suradnicima da anonimno prijave neuskladenosti u kompaniji —
korupciju, sukobe interesa, krsenje etickog kodeksa, nepravilnosti u poslovanju
i slicno.

Aplikacija ima dvije odvojene forme za prijavu, anonimni dvosmjerni komunikacijski
prozor izmedu prijavitelja i ovlastene osobe, te administratorski panel za obradu
prijava.

---

## 2. TEHNOLOSKI STACK

| Sloj | Tehnologija | Verzija | Zasto |
|------|-------------|---------|-------|
| Frontend | React + TypeScript | 18.x | Tipizacija, siroko poznat |
| Build alat | Vite | 5.x | Brzi dev server, jednostavan build |
| Stilizacija | Tailwind CSS | 3.x | Konzistentan dizajn bez teskih UI biblioteka |
| Backend | Node.js + Express + TypeScript | 20.x / 4.x | Najuniverzalnije poznat, jednostavan |
| Baza | PostgreSQL | 16 | Jedna relacijska baza, transakcijska |
| ORM | Prisma | 5.x | Tipizani upiti, migracije, minimalan boilerplate |
| Validacija | Zod | 3.x | Runtime validacija na backendu |
| Hashiranje | argon2 | 0.x | Najsigurniji algoritam za hashiranje lozinki |
| Auth | JWT + httpOnly cookie | — | Stateless sesija, sigurno |
| Email | Nodemailer | 6.x | SMTP slanje, red cekanja u bazi |
| Logging | Pino | 9.x | Brz, strukturiran, redakt osjetljivih polja |
| Kontejneri | Docker + Docker Compose | — | Reproducibilnost, prenosivost |

**Nema mikroservisa, nema Kubernetes, nema vise baza.** Jedan backend, jedan frontend,
jedna baza — u dva Docker kontejnera.

---

## 3. ARHITEKTURA

    Browser (javne stranice + admin)
         |
    Express Backend (Node.js)
    Routes -> Services -> Repository (Prisma)
    Middleware: auth, rateLimit, helmet, errorHandler
    Static: servira frontend build/ (produkcija)
         |
    PostgreSQL 16 (Docker volume)

Slojevi backend modula:
- Routes — HTTP rukovanje, pozivaju servise, ne sadrze poslovnu logiku
- Services — poslovna logika (kreiranje prijave, rokovi, autorizacija, email)
- Repositories — Prisma pristup podacima, izoluje SQL od logike
- Schemas — Zod validacija ulaza
- Middleware — auth (admin JWT + reporter ref+key), rate limiting, error handling

U produkciji, backend servira i API i buildani React frontend (jedan kontejner).
U razvoju, Vite dev server radi odvojeno sa proxy na backend.

---

## 4. DVIJE VRSTE PRIJAVA

| | Opsta prijava (Forma 1) | Osjetljiva prijava (Forma 2) |
|---|---|---|
| Polje u bazi | reportType = GENERAL | reportType = SENSITIVE |
| Namjena | Neuskladenosti u organizaciji | Prijave o direktoru / CO |
| Email ide na | NOTIFICATION_EMAIL_GENERAL | NOTIFICATION_EMAIL_LEGAL |
| Ko vidi | ADMIN bez flaga + SUPER_ADMIN | ADMIN sa flagom + SUPER_ADMIN |

Kljucno sigurnosno pravilo: Osoba na koju se osjetljiva prijava odnosi
ne dobija pristup toj prijavi na osnovu titule. canAccessSensitive se
dodjeljuje iskljucivo eksplicitno.

---

## 5. ULOGE KORISNIKA

| Uloga | Sta vidi | Dodatne dozvole |
|---|---|---|
| SUPER_ADMIN | Sve prijave (opste + osjetljive) | Kreira korisnike, upravlja svim |
| ADMIN (bez kvake) | Samo opste prijave | Pregled, odgovor, status, biljeske |
| ADMIN (sa kvakom) | Samo osjetljive prijave | Pregled, odgovor, status, biljeske |
| INVESTIGATOR | Samo dodijeljene prijave | Obrada dodijeljenih prijava |

Prvi admin (seed) je SUPER_ADMIN sa canAccessSensitive=true i isSuperAdmin=true.
Novi korisnici se kreiraju preko admin panela na /admin/users.

---

## 6. TOK PRIJAVE

1. Prijavitelj otvara pocetnu stranicu -> bira jednu od dvije forme
2. Popunjava formu (kategorija, opis, opciono: datum, lokacija, osobe, prilog)
3. Backend (transakcijski):
   a. Generise referentni broj (MGM-2026-XXXXXX) — crypto.randomBytes
   b. Generise tajni kljuc (24 bajta, base32) — crypto.randomBytes
   c. Hashira tajni kljuc (argon2id) — u bazi se cuva samo hash
   d. Kreira prijavu sa statusom ZAPRIMLJENA
   e. Racuna rokove (first_response_deadline, status_update_deadline)
   f. Stavlja email obavijest u red cekanja (email_queue tabela)
4. Prijavitelj dobija potvrdu: referentni broj + tajni kljuc (jedini put)
5. Prijavitelj kasnije pristupa: ref broj + tajni kljuc -> komunikacijski prozor
6. Ovlastena osoba vidi prijavu u admin panelu -> salje odgovor -> mijenja status
7. Sve promjene se zapisuju u activity_log i status_history

---

## 7. AUTENTIFIKACIJA

### Prijavitelj (anoniman)
- Referentni broj — identifikacija, nije dovoljan za pristup
- Tajni kljuc — crypto.randomBytes(24), base32 kodiran, hashiran argon2id
- Pristup zahtijeva i ref broj i tajni kljuc. Backend provjerava hash.
- Brute-force zastita: 5 neuspjesnih pokusaja -> zakljucavanje 15 minuta
- Ne otkriva postojanje: ista greska za nepostojeci ref broj i pogresan kljuc
- IP adrese se ne cuvaju u bazi (Pino logger redaktuje)

### Administrator
- argon2id hash lozinke (min 12 karaktera)
- JWT u httpOnly, Secure, SameSite=Strict cookie — ne izlozen JS-u
- Rate limiting na login (50 pokusaja / 15 min)
- Sve adminske akcije se logiraju u activity_log

---

## 8. EMAIL OBAVJESTI

Email se ne salje sinhrono — sprema se u email_queue tabelu u bazi, pa se
procesira zasebno. Ako slanje ne uspije, prijava nije izgubljena — email ostaje
u redu sa statusom PENDING i pokusava se ponovo.

Email sadrzaj: Samo referentni broj i osnovne informacije. Osjetljiv
sadrzaj prijave se ne salje emailom — dostupan je samo kroz admin panel.

SMTP konfiguracija: Unosi se rucno u .env fajl na serveru. Parametri
ce biti dostavljeni odvojeno. Do tada aplikacija normalno radi.

---

## 9. POKRETANJE (DOCKER)

### Preduslovi
- Docker Desktop instaliran
- Node.js instaliran (za generisanje JWT_SECRET u setup skripti)

### Brzi nacin — setup.sh skripta (preporuceno)

    git clone https://github.com/EdinMGM/mgm-whistleblower.git
    cd mgm-whistleblower
    ./setup.sh

Skripta automatski:
1. Kopira `.env.example` u `.env`
2. Generise `JWT_SECRET` i upisuje ga u `.env`
3. Postavlja `NODE_ENV=production`
4. Pokrece `docker compose up -d --build`

Nakon pokretanja:
- App: http://localhost:3000
- Admin login: http://localhost:3000/admin/login

**OBAVEZNO:** Promijeniti admin lozinku nakon prvog prijavljivanja!
(Default lozinka je dostavljena odvojeno — nije u ovom repozitoriju.)

### Rucni nacin

    cp .env.example .env
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    # Zalijepi rezultat u .env kao JWT_SECRET
    docker compose up -d --build
    curl http://localhost:3000/api/health

### Zaustavljanje

    docker compose down          # zaustavi
    docker compose down -v       # zaustavi + obrisi podatke (PAZI!)

---

## 10. ENVIRONMENT VARIJABLE

Sve varijable su u .env.example.

### Obavezne
- DATABASE_URL — Konekcija na bazu (Docker: postgresql://whistleblower:whistleblower@db:5432/whistleblower)
- JWT_SECRET — Tajna za JWT (min 32 karaktera) — setup.sh generise automatski
- NOTIFICATION_EMAIL_GENERAL — Email za opste prijave (neuskladjenost@mgmfarm.ba)

### SMTP (rucno konfigurisanje)
- SMTP_HOST — SMTP server (npr. smtp.gmail.com)
- SMTP_PORT — Port (587 za TLS, 465 za SSL)
- SMTP_USER — Korisnicko ime
- SMTP_PASSWORD — Lozinka (App Password ako je 2FA)
- SMTP_FROM — Adresa posiljaoca (noreply@mgmfarm.ba)
- NOTIFICATION_EMAIL_LEGAL — Email pravnog odjela za osjetljive prijave

Nakon unosa SMTP: docker compose restart app

### Opciono
- FIRST_RESPONSE_DAYS (default 7) — Rok prvog odgovora u danima
- STATUS_UPDATE_DAYS (default 30) — Rok info o statusu u danima
- MAX_ATTACHMENT_SIZE_MB (default 10) — Max velicina priloga
- RETENTION_DAYS (default 730) — Zadrzavanje podataka u danima
- APP_PORT (default 3000) — Port aplikacije

---

## 11. CI/CD PIPELINE

Pipeline ce biti postavljen tako da push na main granu automatski deploya na server.

Sta pipeline radi:
1. Builda Docker sliku
2. Pusha na server
3. Pokrene docker compose up -d --build
4. Migracije baze se automatski pokrecu pri startu (prisma db push)

Sta ja radim:
- Mijenjam kod lokalno -> testiram sa docker compose up -d --build -> pusham na main

Vazno: .env se NE pusha na GitHub (u .gitignore). Na serveru .env vec postoji.

---

## 12. BACKUP I RESTORE

    # Backup baze
    docker compose exec db pg_dump -U whistleblower whistleblower > backup_$(date +%Y%m%d).sql

    # Restore baze
    docker compose exec -T db psql -U whistleblower whistleblower < backup_20260101.sql

    # Backup priloga
    docker compose cp app:/app/uploads ./uploads-backup

---

## 13. AZURIRANJE APLIKACIJE

    docker compose exec db pg_dump -U whistleblower whistleblower > backup_pre_update.sql
    git pull origin main
    docker compose up -d --build
    docker compose logs app --tail 10

---

## 14. SIGURNOST

### Implementirano
- Anonimnost: Ne prikupljaju se licni podaci. IP adrese se ne cuvaju u bazi.
- Tajni kljuc: crypto.randomBytes(24), hashiran argon2id. U bazi samo hash.
- Brute-force zastita: 5 neuspjesnih pokusaja -> zakljucavanje 15 minuta.
- Admin auth: argon2id hash, JWT u httpOnly + Secure + SameSite cookie.
- Razdvajanje prijava: SENSITIVE zahtijeva eksplicitnu dozvolu.
- SQL injection: Prisma parametrizovani upiti.
- XSS: React escape.
- Prilozi: MIME validacija, max 10MB, cuvanje izvan public, UUID imena na disku.
- Security headers: Helmet (HSTS, X-Frame-Options, X-Content-Type-Options).
- .env je u .gitignore — tajne se ne pushaju na GitHub.

### Za podesiti na serveru
- HTTPS: Reverse proxy (nginx/Cloudflare) sa TLS. Aplikacija ne terminira HTTPS.
  Nakon HTTPS-a, omoguciti CSP u backend/src/app.ts (trenutno iskljucen zbog HTTP).
- SMTP: Konfigurisati u .env.
- Lozinke: Promijeniti seed admin lozinku.

### Napomene
- Apsolutna anonimnost ne moze se garantovati bez provjere cijele infrastrukture.
- Automatsko brisanje podataka nije implementirano do potvrde interne politike.

---

## 15. STRUKTURA PROJEKTA

    mgm-whistleblower/
    +-- backend/
    |   +-- src/
    |   |   +-- config/           # env.ts
    |   |   +-- lib/              # crypto, logger, errors, permissions, prisma
    |   |   +-- middleware/       # adminAuth, reporterAuth, errorHandler
    |   |   +-- modules/
    |   |   |   +-- reports/      # rute, servisi, seme, repo za prijave
    |   |   |   +-- messages/     # komunikacija
    |   |   |   +-- attachments/  # prilozi
    |   |   |   +-- auth/         # admin login/logout, JWT
    |   |   |   +-- admin/        # admin panel akcije
    |   |   |   +-- email/        # Nodemailer + queue
    |   |   +-- app.ts            # Express konfiguracija
    |   |   +-- server.ts         # Entry point
    |   +-- prisma/
    |   |   +-- schema.prisma     # Model baze (8 tabela)
    |   |   +-- seed.js           # Kreiranje prvog admina
    |   +-- uploads/              # Prilozi (izvan public, gitignored)
    +-- frontend/
    |   +-- src/
    |   |   +-- pages/            # Home, Submit, Confirmation, Access, Admin*
    |   |   +-- components/       # ReportForm
    |   |   +-- api/              # API klijent
    |   |   +-- types.ts          # Zajednicki tipovi
    |   +-- tailwind.config.js    # MGM Farm boje (#374B47, #44BB66)
    |   +-- postcss.config.cjs    # PostCSS config
    |   +-- vite.config.ts       # Vite config sa proxy
    +-- Dockerfile                # Multi-stage build
    +-- docker-compose.yml        # PostgreSQL + app
    +-- setup.sh                  # Automatski setup (kreira .env, generise JWT_SECRET, pokrece Docker)
    +-- .env.example              # Sve varijable okruzenja (bez tajni)
    +-- .gitignore
    +-- .dockerignore
    +-- README.md                 # Ovaj fajl

---

## 16. MODEL BAZE (8 TABELA)

| Tabela | Opis |
|--------|------|
| admin_users | Admin korisnici (username, password_hash, role, canAccessSensitive, isSuperAdmin) |
| reports | Prijave (referenceNumber, secretKeyHash, reportType, category, status, rokovi) |
| report_assignments | Dodjele prijava investigatorima |
| messages | Poruke (authorType: REPORTER / AUTHORIZED_PERSON) |
| attachments | Prilozi (originalFilename, storedFilename=UUID, mimeType, fileSize) |
| internal_notes | Interne biljeske (nije vidljivo prijavitelju) |
| status_history | Historija promjena statusa |
| activity_log | Audit log svih admin akcija |
| email_queue | Red cekanja za email obavijesti (PENDING, SENT, FAILED) |

---

## 17. KONTAKT

Za pitanja oko koda, konfiguracije ili pristupa — kontaktiraj Edina Jasarspahica.
SMTP parametri i admin lozinka ce biti dostavljeni odvojeno.
