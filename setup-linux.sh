#!/bin/bash
set -e

echo "═══════════════════════════════════════════════"
echo "  MGM FARM — Setup (Linux)"
echo "═══════════════════════════════════════════════"

# ── Node.js ──
if ! command -v node &> /dev/null; then
  echo "📦 Instaliram Node.js 20..."
  if command -v apt &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
  elif command -v dnf &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
  elif command -v yum &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
  else
    echo "❌ Nepoznat package manager. Instaliraj Node.js: https://nodejs.org"
    exit 1
  fi
else
  echo "✅ Node.js: $(node -v)"
fi

# ── Docker ──
if ! command -v docker &> /dev/null; then
  echo "🐳 Instaliram Docker..."
  if command -v apt &> /dev/null; then
    sudo apt update
    sudo apt install -y ca-certificates curl gnupg lsb-release
    DISTRO=$(. /etc/os-release && echo "$ID")
    CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/${DISTRO}/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO} ${CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  elif command -v dnf &> /dev/null || command -v yum &> /dev/null; then
    PM=$(command -v dnf &> /dev/null && echo "dnf" || echo "yum")
    sudo $PM install -y yum-utils
    sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo $PM install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  else
    echo "❌ Nepoznat package manager. Instaliraj Docker: https://docs.docker.com/get-docker"
    exit 1
  fi
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker $USER
  echo ""
  echo "⚠️  Docker instaliran. Da bi radilo bez sudo, izloguj se i uloguj ponovo, pa pokreni:"
  echo "   ./setup-linux.sh"
  exit 0
else
  echo "✅ Docker: $(docker --version)"
fi

if ! docker info &> /dev/null; then
  echo "⚠️  Docker daemon nije pokrenut. Pokreni: sudo systemctl start docker"
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
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env
  echo "✅ JWT_SECRET generisan"
else
  echo "✅ JWT_SECRET već postoji"
fi

# ── Admin lozinka ──
if grep -q "^SEED_ADMIN_PASSWORD=$" .env || grep -q "^SEED_ADMIN_PASSWORD= *$" .env; then
  PASS=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
  sed -i "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=${PASS}|" .env
  echo "✅ Admin lozinka: ${PASS}"
  echo "⚠️  SAČUVAJ OVO!"
fi

sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' .env

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
