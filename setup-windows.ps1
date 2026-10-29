Write-Host "═══════════════════════════════════════════════"
Write-Host "  MGM FARM — Setup (Windows)"
Write-Host "═══════════════════════════════════════════════"

# ── Node.js ──
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instaliram Node.js..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "❌ Winget nije dostupan. Instaliraj Node.js rucno: https://nodejs.org"
        exit 1
    }
    Write-Host "⚠️  Zatvori i ponovo otvori PowerShell, pa ponovo pokreni: .\setup-windows.ps1"
    exit 0
} else {
    Write-Host "✅ Node.js: $(node -v)"
}

# ── Docker ──
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "🐳 Instaliram Docker Desktop..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "❌ Winget nije dostupan. Instaliraj Docker Desktop: https://docs.docker.com/desktop/install/windows-install"
        exit 1
    }
    Write-Host "⚠️  Pokreni Docker Desktop, sacekaj da se pokrene, zatvori i ponovo otvori PowerShell, pa pokreni: .\setup-windows.ps1"
    exit 0
} else {
    Write-Host "✅ Docker: $(docker --version)"
}

if (-not (docker info 2>$null)) {
    Write-Host "⚠️  Docker Desktop nije pokrenut. Otvori Docker Desktop, sacekaj, pa ponovo pokreni: .\setup-windows.ps1"
    exit 1
}

# ── .env ──
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "✅ Kreiran .env"
} else {
    Write-Host "✅ .env vec postoji"
}

# ── JWT_SECRET ──
$envContent = Get-Content .env -Raw
if ($envContent -match "JWT_SECRET=\s*$") {
    $jwt = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    $envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$jwt"
    Set-Content .env $envContent
    Write-Host "✅ JWT_SECRET generisan"
} else {
    Write-Host "✅ JWT_SECRET vec postoji"
}

# ── Admin lozinka ──
$envContent = Get-Content .env -Raw
if ($envContent -match "SEED_ADMIN_PASSWORD=\s*$") {
    $pass = node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
    $envContent = $envContent -replace "SEED_ADMIN_PASSWORD=.*", "SEED_ADMIN_PASSWORD=$pass"
    Set-Content .env $envContent
    Write-Host "✅ Admin lozinka: $pass"
    Write-Host "⚠️  SACUVAJ OVO!"
}

$envContent = Get-Content .env -Raw
$envContent = $envContent -replace "NODE_ENV=.*", "NODE_ENV=production"
Set-Content .env $envContent

# ── Docker ──
Write-Host "🚀 Pokrecem Docker..."
docker compose up -d --build

Write-Host ""
Write-Host "═══════════════════════════════════════════════"
Write-Host "  ✅ Gotovo!"
Write-Host "  📱 App:   http://localhost:3000"
Write-Host "  🔐 Admin: http://localhost:3000/admin/login"
Write-Host "  👤 User:  admin"
Write-Host "═══════════════════════════════════════════════"
