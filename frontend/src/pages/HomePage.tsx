import { Link } from 'react-router-dom';

/**
 * Početna stranica — dvije jasno odvojene opcije za prijavu.
 * MGM Farm dizajn: tamno zelena, Helvetica, profesionalan.
 */
export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Naslov */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-mgm-dark mb-3">
          Anonimni kanal za prijavu neusklađenosti
        </h1>
        <p className="text-mgm-muted max-w-2xl mx-auto">
          MGM Farm d.o.o. omogućava svim zaposlenicima i suradnicima sigurno i
          anonimno prijavljivanje nepravilnosti, kršenja etičkog kodeksa,
          korupcije, sukoba interesa i drugih neusklađenosti.
        </p>
      </div>

      {/* Dvije forme */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Forma 1 — Opšte neusklađenosti */}
        <div className="mgm-card p-8 flex flex-col">
          <div className="w-12 h-12 bg-mgm-light rounded-md flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-mgm-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-mgm-dark mb-2">
            Prijava neusklađenosti u organizaciji
          </h2>
          <p className="text-mgm-muted text-sm mb-6 flex-1">
            Za prijavu nepravilnosti u cjelokupnom radu kompanije — kršenje
            procedura, etičkog kodeksa, korupcija, sukob interesa, sigurnost na
            radu i slično. Obavijest se šalje na adresu za neusklađenosti.
          </p>
          <Link to="/prijavi-opstu" className="mgm-btn-primary text-center">
            Podnesi prijavu
          </Link>
        </div>

        {/* Forma 2 — Direktor / Compliance Officer */}
        <div className="mgm-card p-8 flex flex-col border-2 border-mgm-green/30">
          <div className="w-12 h-12 bg-mgm-green/10 rounded-md flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-mgm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-mgm-dark mb-2">
            Prijava koja se odnosi na direktora ili Compliance Officer-a
          </h2>
          <p className="text-mgm-muted text-sm mb-6 flex-1">
            Za prijave koje se odnose na direktora kompanije ili Compliance
            Officer-a. Obavijest se šalje direktno pravnom odjelu. Ove prijave
            su strogo odvojene i dostupne samo izričito ovlaštenim osobama.
          </p>
          <Link to="/prijavi-osjetljivu" className="mgm-green text-white text-center px-6 py-3 rounded-md font-medium hover:bg-mgm-green/90 transition-colors bg-mgm-green">
            Podnesi prijavu
          </Link>
        </div>
      </div>

      {/* Pristup postojećoj prijavi */}
      <div className="text-center">
        <Link to="/pristup" className="mgm-btn-outline inline-block">
          Pristupi postojećoj prijavi
        </Link>
      </div>

      {/* Zaštita anonimnosti */}
      <div className="mgm-card p-6">
        <h3 className="font-bold text-mgm-dark mb-4">▸ Kako je zaštićena vaša anonimnost</h3>
        <ul className="space-y-2 text-sm text-mgm-muted">
          <li className="flex gap-2"><span className="text-mgm-green">▸</span> Ne tražimo ime, prezime, e-mail, broj telefona niti bilo koje lične podatke.</li>
          <li className="flex gap-2"><span className="text-mgm-green">▸</span> Svaka prijava dobija jedinstveni referentni broj i tajni pristupni ključ.</li>
          <li className="flex gap-2"><span className="text-mgm-green">▸</span> Tajni ključ se čuva samo u hashiranom obliku — nitko ga ne može pročitati.</li>
          <li className="flex gap-2"><span className="text-mgm-green">▸</span> Komunikacija s ovlaštenom osobom je anonimna i dvosmjerna.</li>
          <li className="flex gap-2"><span className="text-mgm-green">▸</span> IP adrese prijavitelja se ne čuvaju u bazi aplikacije.</li>
        </ul>
      </div>

      {/* Rok i upute */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="mgm-card p-6">
          <h3 className="font-bold text-mgm-dark mb-2">▸ Očekivani rok odgovora</h3>
          <p className="text-sm text-mgm-muted">
            Ovlaštena osoba će odgovoriti na vašu prijavu u roku od 7 radnih dana.
            Ako su potrebne dodatne informacije, primit ćete poruku u
            komunikacijskom prozoru.
          </p>
        </div>
        <div className="mgm-card p-6">
          <h3 className="font-bold text-mgm-dark mb-2">▸ Čuvanje pristupnih podataka</h3>
          <p className="text-sm text-mgm-muted">
            Sačuvajte referentni broj i tajni ključ na sigurnom mjestu. Bez
            tajnog ključa pristup prijavi nije moguć. Preporučujemo da ih
            zapišete i čuvate izvan računara.
          </p>
        </div>
      </div>
    </div>
  );
}
