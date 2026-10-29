#!/bin/bash
set -e

echo "═══════════════════════════════════════════════"
echo "  MGM FARM — Setup skripta"
echo "═══════════════════════════════════════════════"

# Provjeri da li je Docker instaliran
if ! command -v docker &> /dev/null; then
  echo "❌ Docker nije instaliran. Instaliraj Docker prvo: https://docs.docker.com/get-docker"
  exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo "❌ Docker Compose nije instaliran."
  exit 1
fi

# Provjeri da li je node instaliran (za generiranje JWT_SECRET)
if ! command -v node &> /dev/null; then
  echo "❌ Node.js nije instaliran. Instaliraj Node.js prvo: https://nodejs.org"
  exit 1
fi

# Kreiraj .env iz .env.example ako ne postoji
if [ ! -f .env ]; then
  echo "📋 Kreiram .env iz .env.example..."
  cp .env.example .env
else
  echo "✅ .env već postoji — preskačem."
fi

# Generiši JWT_SECRET ako je prazan
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

if grep -q "^JWT_SECRET=$" .env || grep -q "^JWT_SECRET= *$" .env; then
  echo "🔑 Generišem JWT_SECRET..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
  else
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" .env
  fi
  echo "✅ JWT_SECRET generisan."
else
  echo "✅ JWT_SECRET već postoji — preskačem."
fi

# Postavi NODE_ENV na production za Docker
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' 's|^NODE_ENV=.*|NODE_ENV=production|' .env
else
  sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' .env
fi

echo ""
# Generisi admin lozinku ako je prazna
if grep -q "^SEED_ADMIN_PASSWORD=$" .env || grep -q "^SEED_ADMIN_PASSWORD= *$" .env; then
  echo "🔑 Generišem admin lozinku..."
  ADMIN_PASS=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=${ADMIN_PASS}|" .env
  else
    sed -i "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=${ADMIN_PASS}|" .env
  fi
  echo "✅ Admin lozinka generisana: ${ADMIN_PASS}"
  echo "⚠️  SAČUVAJ OVO — ovo je tvoj admin password za prvi login!"
  echo ""
fi

echo "🚀 Pokrećem Docker kontejnere..."
if docker compose version &> /dev/null; then
  docker compose up -d --build
else
  docker-compose up -d --build
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Aplikacija je pokrenuta!"
echo "═══════════════════════════════════════════════"
echo ""
echo "  📱 App:       http://localhost:3000"
echo "  🔐 Admin:     http://localhost:3000/admin/login"
echo ""
echo "  📋 Provjeri status:  docker compose ps"
echo "  📄 Provjeri logove:  docker compose logs -f"
echo "  🛑 Zaustavi:          docker compose down"
echo ""
