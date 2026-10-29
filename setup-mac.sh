#!/bin/bash
set -e

echo "═══════════════════════════════════════════════"
echo "  MGM FARM — Setup (macOS)"
echo "═══════════════════════════════════════════════"

# ── Homebrew ──
if ! command -v brew &> /dev/null; then
  echo "📦 Instaliram Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
fi

# ── Node.js ──
if ! command -v node &> /dev/null; then
  echo "📦 Instaliram Node.js..."
  brew install node
else
  echo "✅ Node.js: $(node -v)"
fi

# ── Docker ──
if ! command -v docker &> /dev/null; then
  echo "🐳 Instaliram Docker Desktop..."
  brew install --cask docker
  echo ""
  echo "⚠️  Otvori Docker Desktop aplikaciju, sačekaj da se pokrene, pa ponovo pokreni:"
  echo "   ./setup-mac.sh"
  exit 0
else
  echo "✅ Docker: $(docker --version)"
fi

if ! docker info &> /dev/null; then
  echo "⚠️  Docker Desktop nije pokrenut. Otvori aplikaciju i sačekaj da se pokrene, pa ponovo pokreni ./setup-mac.sh"
  exit 1
fi

# ── .env ──
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Kreiran .env"
else
  echo "✅ .env već postoji"
fi

# ── JWT_SECRET ──
if grep -q "^JWT_SECRET=$" .env || grep -q "^JWT_SECRET= *$" .env; then
  JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env
  echo "✅ JWT_SECRET generisan"
else
  echo "✅ JWT_SECRET već postoji"
fi

# ── Admin lozinka ──
if grep -q "^SEED_ADMIN_PASSWORD=$" .env || grep -q "^SEED_ADMIN_PASSWORD= *$" .env; then
  PASS=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
  sed -i '' "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=${PASS}|" .env
  echo "✅ Admin lozinka: ${PASS}"
  echo "⚠️  SAČUVAJ OVO!"
fi

sed -i '' 's|^NODE_ENV=.*|NODE_ENV=production|' .env

# ── Docker ──
echo "🚀 Pokrećem Docker..."
docker compose up -d --build

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Gotovo!"
echo "  📱 App:   http://localhost:3000"
echo "  🔐 Admin: http://localhost:3000/admin/login"
echo "  👤 User:  admin"
echo "═══════════════════════════════════════════════"
