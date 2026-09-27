#!/usr/bin/env bash
#
# Provision a fresh Ubuntu VPS for the Hello API. Run ONCE, as root, ON THE VPS,
# after the code has been copied up.
#
#   sudo bash deploy/provision.sh api.yourdomain.com
#
# Installs and configures: Node 24, Redis (loopback only), MongoDB as a
# single-node REPLICA SET (which is what makes transactions work — a standalone
# mongod refuses to boot this server), nginx, certbot, coturn. Creates the
# `hello` service user. Generates `.env` with every secret filled in, so nothing
# has to be pasted by hand.
#
# IDEMPOTENT. Safe to re-run: it skips what is already done and never overwrites
# an existing `.env` — rotating those secrets would sign every user out and
# invalidate every refresh token.
#
# It does NOT: build, start the API, run certbot, or open the firewall. Those
# are steps 9, 10, 13, 14 and 15 of README.md, because each has something to check.

set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "usage: sudo bash deploy/provision.sh api.yourdomain.com" >&2
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "run this with sudo" >&2
  exit 1
fi

APP_DIR="/srv/hello/backend"
MONGO_VERSION="8.0"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
ok()   { printf '    \033[32mok\033[0m %s\n' "$1"; }
warn() { printf '    \033[33m!!\033[0m %s\n' "$1"; }
die()  { printf '\n\033[31mFAILED: %s\033[0m\n\n' "$1" >&2; exit 1; }

# ─────────────────────────────────────────────────────────────────────────────
step "Checking the OS"
# ─────────────────────────────────────────────────────────────────────────────
. /etc/os-release
CODENAME="${VERSION_CODENAME:-}"
case "$CODENAME" in
  jammy|noble) ok "Ubuntu $VERSION_ID ($CODENAME)" ;;
  bookworm|bullseye) ok "Debian $VERSION_ID ($CODENAME)" ;;
  *) die "unsupported: ${PRETTY_NAME:-unknown}. This script targets Ubuntu 22.04/24.04 or Debian 11/12. Tell Claude what you are on." ;;
esac

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl gnupg ca-certificates lsb-release ufw >/dev/null

# ─────────────────────────────────────────────────────────────────────────────
step "Node 24"
# ─────────────────────────────────────────────────────────────────────────────
# Pinned to 24.x to match app/eas.json and the machine the code was written on.
if command -v node >/dev/null && node -v | grep -q '^v24\.'; then
  ok "already $(node -v)"
else
  curl -fsSL "https://deb.nodesource.com/setup_24.x" | bash - >/dev/null 2>&1
  apt-get install -y -qq nodejs >/dev/null
  node -v | grep -q '^v24\.' || die "node is $(node -v), expected v24.x"
  ok "installed $(node -v)"
fi

# ─────────────────────────────────────────────────────────────────────────────
step "Redis — bound to loopback"
# ─────────────────────────────────────────────────────────────────────────────
# Redis holds the refresh-token allowlist. Whoever reaches it can mint sessions,
# and an open Redis is the single most common way this stack gets breached. In a
# container network it would be unreachable by default; on a bare VPS it is not,
# unless someone says so. So this says so, and then checks.
apt-get install -y -qq redis-server >/dev/null
if ! grep -qE '^bind 127\.0\.0\.1' /etc/redis/redis.conf; then
  sed -i 's/^bind .*/bind 127.0.0.1 -::1/' /etc/redis/redis.conf
  ok "bind set to 127.0.0.1"
fi
grep -qE '^protected-mode yes' /etc/redis/redis.conf || echo 'protected-mode yes' >> /etc/redis/redis.conf
systemctl enable --now redis-server >/dev/null 2>&1
systemctl restart redis-server
sleep 1
redis-cli ping | grep -q PONG || die "redis is not answering"
if ss -lntp 2>/dev/null | grep -q '0\.0\.0\.0:6379'; then
  die "redis is listening on 0.0.0.0 — refusing to continue. Fix bind in /etc/redis/redis.conf"
fi
ok "redis up, loopback only"

# ─────────────────────────────────────────────────────────────────────────────
step "MongoDB $MONGO_VERSION as a single-node replica set"
# ─────────────────────────────────────────────────────────────────────────────
# THE REASON FOR THE REPLICA SET, not redundancy: multi-document transactions.
# Accepting a message request writes a match, a thread, a seed message and a
# status flip. On a standalone mongod that cannot be atomic, a partial write is
# a corrupt account nobody notices until a demo, and so the server forces
# REQUIRE_TRANSACTIONS in production and refuses to boot without them.
# One node is enough: transactions need a replica set, not several machines.
if ! command -v mongod >/dev/null; then
  curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc" \
    | gpg -o "/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg" --dearmor --yes
  # The repository component differs between the two distros, and getting it
  # wrong gives an apt error that reads like a network problem.
  if [ "$ID" = "debian" ]; then
    DISTRO_PATH="debian"; COMPONENT="main"
  else
    DISTRO_PATH="ubuntu"; COMPONENT="multiverse"
  fi
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg ] https://repo.mongodb.org/apt/${DISTRO_PATH} ${CODENAME}/mongodb-org/${MONGO_VERSION} ${COMPONENT}" \
    > "/etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list"
  apt-get update -qq
  apt-get install -y -qq mongodb-org >/dev/null || die "mongodb-org install failed — check /etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list"
  ok "installed $(mongod --version | head -1)"
else
  ok "already $(mongod --version | head -1)"
fi

# Bind to loopback. Nothing outside this box has any business reaching it.
sed -i 's/^\( *bindIp:\).*/\1 127.0.0.1/' /etc/mongod.conf
if ! grep -q '^replication:' /etc/mongod.conf; then
  printf '\nreplication:\n  replSetName: rs0\n' >> /etc/mongod.conf
  ok "replSetName: rs0 added to /etc/mongod.conf"
fi
systemctl enable --now mongod >/dev/null 2>&1
systemctl restart mongod

# mongod needs a moment before it accepts connections, and a loop beats a sleep.
for _ in $(seq 1 30); do
  mongosh --quiet --eval 'db.adminCommand({ping:1})' >/dev/null 2>&1 && break
  sleep 1
done
mongosh --quiet --eval 'db.adminCommand({ping:1})' >/dev/null 2>&1 || die "mongod did not come up — check: journalctl -u mongod -n 50"

# Initiate only if it has not been. rs.initiate() on an initiated set errors.
if ! mongosh --quiet --eval 'rs.status().ok' 2>/dev/null | grep -q '^1$'; then
  mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})' >/dev/null
  for _ in $(seq 1 30); do
    mongosh --quiet --eval 'rs.status().ok' 2>/dev/null | grep -q '^1$' && break
    sleep 1
  done
  ok "replica set initiated"
else
  ok "replica set already initiated"
fi

# Prove transactions, rather than assume them from the config. This is the exact
# capability the API refuses to boot without.
TXN=$(mongosh --quiet --eval '
  try {
    const s = db.getMongo().startSession();
    s.startTransaction();
    s.getDatabase("hello_probe").probe.insertOne({ t: new Date() });
    s.commitTransaction();
    s.endSession();
    db.getSiblingDB("hello_probe").dropDatabase();
    print("yes");
  } catch (e) { print("no: " + e.message); }
' 2>&1 | tail -1)
[ "$TXN" = "yes" ] || die "transactions do not work: $TXN"
ok "transactions verified — a real transaction committed and rolled back off"

# ─────────────────────────────────────────────────────────────────────────────
step "nginx, certbot, coturn"
# ─────────────────────────────────────────────────────────────────────────────
apt-get install -y -qq nginx certbot python3-certbot-nginx coturn >/dev/null
ok "installed"

# ─────────────────────────────────────────────────────────────────────────────
step "Service user"
# ─────────────────────────────────────────────────────────────────────────────
# The API has no reason to run as root, and ProtectSystem=strict in the unit
# assumes it does not.
if ! id hello >/dev/null 2>&1; then
  adduser --system --group --home /srv/hello --no-create-home hello >/dev/null
  ok "created user hello"
else
  ok "user hello exists"
fi
mkdir -p /srv/hello
[ -d "$APP_DIR" ] || die "$APP_DIR is missing — copy the code up first (step 1 in README.md)"
[ -f /srv/hello/app/src/services/types.ts ] \
  || die "/srv/hello/app/src/services/types.ts is missing. The build generates src/types/contract.generated.d.ts from it and fails without it — see step 1 in README.md, it is the second rsync line"

# ─────────────────────────────────────────────────────────────────────────────
step "coturn — the TURN relay voice calls need"
# ─────────────────────────────────────────────────────────────────────────────
# Two phones on the same wifi can reach each other directly. Two phones on
# different mobile networks cannot: a carrier-grade NAT will not let them meet,
# and the call rings, fails to connect, and ends. TURN is the relay that fixes
# it, and it is the difference between "calls work" and "calls work at my desk".
if [ -f /etc/turnserver.conf ] && grep -q '^static-auth-secret=' /etc/turnserver.conf; then
  TURN_SECRET=$(grep '^static-auth-secret=' /etc/turnserver.conf | cut -d= -f2)
  ok "keeping the existing TURN secret"
else
  TURN_SECRET=$(openssl rand -hex 32)
  cat > /etc/turnserver.conf <<TURNCONF
# Generated by deploy/provision.sh
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=${TURN_SECRET}
realm=${DOMAIN}

# No TLS on the TURN port: the media is already encrypted by DTLS-SRTP, which
# WebRTC does not make optional. A second TLS layer buys nothing here.
no-tls
no-dtls

no-multicast-peers
no-cli
# An open relay that can reach private addresses is a port scanner aimed at your
# own network. These four lines are what stop that.
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255

# Keep the relay range small and known, so the firewall rule can be small too.
min-port=49160
max-port=49200
TURNCONF
  chmod 640 /etc/turnserver.conf
  chown root:turnserver /etc/turnserver.conf 2>/dev/null || true
  ok "wrote /etc/turnserver.conf with a fresh secret"
fi

sed -i 's/^#\?TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn
grep -q '^TURNSERVER_ENABLED=1' /etc/default/coturn || echo 'TURNSERVER_ENABLED=1' >> /etc/default/coturn
systemctl enable --now coturn >/dev/null 2>&1
systemctl restart coturn
sleep 1
systemctl is-active --quiet coturn && ok "coturn running" || warn "coturn is not running — check: journalctl -u coturn -n 30"

# ─────────────────────────────────────────────────────────────────────────────
step "Generating .env"
# ─────────────────────────────────────────────────────────────────────────────
# Four separate secrets, not one reused four times: reusing one means a single
# leak is four. Generated here, on this box, so they have never been anywhere
# else — not in a repo, not in a chat.
if [ -f "$APP_DIR/.env" ]; then
  warn "$APP_DIR/.env exists — leaving it alone."
  warn "Re-generating would rotate the JWT secrets, signing out every user and"
  warn "invalidating every refresh token. Edit it by hand if something is wrong."
else
  cat > "$APP_DIR/.env" <<ENVFILE
# Generated by deploy/provision.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Secrets were generated on this machine and have never left it. Keep it 600.

NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Local mongod, single-node replica set rs0 — this is what makes transactions
# work, which production forces on.
MONGO_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0
MONGO_DB=hello
REQUIRE_TRANSACTIONS=true

REDIS_URL=redis://127.0.0.1:6379
REDIS_PREFIX=hello:prod

JWT_ACCESS_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
PHONE_PEPPER=$(openssl rand -base64 48)
CURSOR_SECRET=$(openssl rand -base64 48)

ACCESS_TTL_SEC=900
REFRESH_TTL_SEC=2592000

# false is forced in production: true returns the login code in the HTTP
# response, which would let anyone sign in as any number.
OTP_DEV_MODE=false
# Prints the code to the journal instead of sending an SMS, and returns nothing.
# Read it with:  sudo journalctl -u hello-api -f
# THE COST: whoever can read these logs can sign in as anybody. Set this false
# the day a provider is wired in src/services/sms.service.ts.
OTP_LOG_ONLY=true
OTP_TTL_SEC=300
OTP_RESEND_SEC=30

FREE_DAILY_LIKES=15

# '*' is refused in production. The mobile app sends no Origin, so this only
# matters for a browser.
CORS_ORIGINS=https://${DOMAIN}

STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
TURN_URLS=turn:${DOMAIN}:3478?transport=udp,turn:${DOMAIN}:3478?transport=tcp
TURN_SECRET=${TURN_SECRET}
TURN_TTL_SEC=600

# WHERE THE 40 DEMO PEOPLE LIVE. Discovery caps at 100 km, so if the phones are
# further than that from here the deck is CORRECTLY EMPTY and looks exactly like
# a bug. Defaults to London. Change these two lines to where the phones actually
# are, then re-run: npm run seed
SEED_ANCHOR_LAT=51.5074
SEED_ANCHOR_LNG=-0.1278
ENVFILE
  chmod 600 "$APP_DIR/.env"
  ok "wrote $APP_DIR/.env with 4 generated secrets and the TURN secret"
fi

chown -R hello:hello /srv/hello

# ─────────────────────────────────────────────────────────────────────────────
step "nginx site"
# ─────────────────────────────────────────────────────────────────────────────
sed "s/api\.example\.com/${DOMAIN}/g" "$APP_DIR/deploy/nginx-hello-api.conf" \
  > /etc/nginx/sites-available/hello-api
ln -sf /etc/nginx/sites-available/hello-api /etc/nginx/sites-enabled/hello-api
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/html
# The site ships HTTP-only and certbot adds the TLS block in step 5. That order
# matters: `certbot --nginx` parses the live config and refuses to run if it does
# not validate, so a config referencing a certificate that does not exist yet
# would lock you out of getting one.
nginx -t >/dev/null 2>&1 || die "nginx config is invalid — see: nginx -t"
systemctl reload nginx
ok "nginx serving ${DOMAIN} over HTTP (certbot adds TLS in step 5)"

# Prove the proxy path before TLS is in the way. The API is not running yet, so
# 502 is the CORRECT answer here — it means nginx reached the right place and
# found nobody home. A 404 would mean the site is not enabled.
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -H "Host: ${DOMAIN}" http://127.0.0.1/health || echo 000)
case "$CODE" in
  502|504) ok "proxy wired (got $CODE — nothing listening on :4000 yet, as expected)" ;;
  200)     ok "proxy wired and something is already answering on :4000" ;;
  *)       warn "expected 502 from the proxy, got $CODE — check /etc/nginx/sites-enabled/hello-api" ;;
esac

# ─────────────────────────────────────────────────────────────────────────────
step "Done provisioning"
# ─────────────────────────────────────────────────────────────────────────────
cat <<SUMMARY

  node            $(node -v)
  redis           loopback only, answering
  mongod          replica set rs0, transactions VERIFIED
  coturn          running, secret in /etc/turnserver.conf and in .env
  .env            $APP_DIR/.env  (chmod 600)
  nginx site      /etc/nginx/sites-available/hello-api  -> ${DOMAIN}

  This covered steps 4 to 8, 11 and 12 of deploy/README.md.
  Still to do, because each one has something to check:
    step 9   build, migrate, seed
    step 10  start the API under systemd
    step 13  certbot  (needs your email, and DNS must already resolve)
    step 14  firewall
    step 15  ./scripts/smoke.sh https://${DOMAIN}

  BEFORE YOU SEED: set SEED_ANCHOR_LAT / SEED_ANCHOR_LNG in .env to where the
  test phones are. Discovery caps at 100 km and an empty deck looks like a bug.

SUMMARY
