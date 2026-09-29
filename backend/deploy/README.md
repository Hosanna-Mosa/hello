## Deploying Hello Backend on VPS

- Point domain to VPS
- Copy project files to VPS
- Install Node.js, MongoDB, Redis, Nginx
- Configure environment variables
- Build the project
- Run backend with systemd
- Configure Nginx reverse proxy
- Setup SSL certificate
- Setup TURN server for voice calls
- Configure firewall
- Verify deployment
- Connect the mobile app

Replace `api.yourdomain.com` and `root@your_vps_ip` everywhere below.

---

### 1. Point domain to VPS

In your domain DNS settings add an **A record**:

| Type | Name | Value |
|---|---|---|
| A | api | your_vps_ip |

Check it from your computer:

```bash
dig +short api.yourdomain.com
```

It must print your VPS IP. DNS can take a few minutes to a few hours. Steps 2 to 8 work while you wait, SSL in step 10 needs it ready.

---

### 2. Copy project files to VPS

Run this **on your computer**, from the project root folder:

```bash
rsync -av --delete --exclude node_modules --exclude dist --exclude .env backend/ root@your_vps_ip:/srv/hello/backend/
```

```bash
rsync -avR app/src/services/types.ts root@your_vps_ip:/srv/hello/
```

**Both commands are required.** The build generates a type file from `app/src/services/types.ts` and fails without it.

---

### 3. Connect to VPS

```bash
ssh root@your_vps_ip
```

Every command from here until step 13 runs on the VPS.

---

### 4. Installing Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
```

```bash
apt install -y nodejs
```

```bash
node -v
```

It must print `v24.x`. Other versions are not tested with this project.

---

### 5. Installing MongoDB

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
```

```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-8.0.list
```

```bash
apt update && apt install -y mongodb-org
```

#### Enable replica set

This project needs **transactions**, and MongoDB only provides them on a replica set. One node is enough — this is not about having multiple servers.

```bash
nano /etc/mongod.conf
```

Find `bindIp` and make sure it is `127.0.0.1`, then add these two lines at the end of the file:

```bash
replication:
  replSetName: rs0
```

Save and exit (Ctrl + X, then Y and Enter).

```bash
systemctl enable --now mongod
```

```bash
mongosh --eval 'rs.initiate()'
```

#### Check transactions work

```bash
mongosh --quiet --eval 'const s=db.getMongo().startSession();s.startTransaction();s.getDatabase("t").c.insertOne({a:1});s.commitTransaction();s.endSession();db.getSiblingDB("t").dropDatabase();print("TRANSACTIONS OK")'
```

It must print `TRANSACTIONS OK`. If it prints an error, do not continue — the backend will refuse to start.

---

### 6. Installing Redis

```bash
apt install -y redis-server
```

```bash
nano /etc/redis/redis.conf
```

Make sure the bind line is exactly this:

```bash
bind 127.0.0.1 -::1
```

Save and exit (Ctrl + X, then Y and Enter).

```bash
systemctl enable --now redis-server && systemctl restart redis-server
```

```bash
redis-cli ping
```

It must print `PONG`.

```bash
ss -lntp | grep 6379
```

It must show `127.0.0.1`, never `0.0.0.0`. Redis holds the login sessions, so it must never be reachable from the internet.

---

### 7. Create the service user

The backend should not run as root.

```bash
adduser --system --group --home /srv/hello --no-create-home hello
```

---

### 8. Configure environment variables

This command creates the `.env` file and generates all four secrets for you. Change `api.yourdomain.com` before running it.

```bash
cd /srv/hello/backend
```

```bash
cat > .env <<EOF
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

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

OTP_DEV_MODE=false
OTP_LOG_ONLY=true
OTP_TTL_SEC=300
OTP_RESEND_SEC=30

FREE_DAILY_LIKES=15

CORS_ORIGINS=https://api.yourdomain.com

STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
TURN_URLS=
TURN_SECRET=
TURN_TTL_SEC=600

SEED_ANCHOR_LAT=51.5074
SEED_ANCHOR_LNG=-0.1278
EOF
```

```bash
chmod 600 .env
```

#### Set the demo people location

```bash
nano .env
```

Change `SEED_ANCHOR_LAT` and `SEED_ANCHOR_LNG` to the city where your test phones are. Save and exit (Ctrl + X, then Y and Enter).

**Why this matters:** the app only shows people within 100 km. If the 40 demo people stay in London and your phones are somewhere else, the app shows an empty screen and looks broken.

`TURN_URLS` and `TURN_SECRET` stay empty for now — step 11 fills them.

---

### 9. Build the project

```bash
chown -R hello:hello /srv/hello
```

```bash
sudo -u hello -H npm ci
```

```bash
sudo -u hello -H npm run build
```

```bash
sudo -u hello -H npm run migrate
```

```bash
sudo -u hello -H npm run seed
```

```bash
ls -l dist/server.js
```

The file must exist. `npm run migrate` creates the database indexes and is required, not optional.

---

### 10. Run backend with systemd

```bash
cp deploy/hello-api.service /etc/systemd/system/
```

```bash
systemctl daemon-reload && systemctl enable --now hello-api
```

```bash
systemctl status hello-api
```

```bash
curl -s localhost:4000/ready
```

It must show `"transactions":true`. If it shows `false`, go back to step 5.

To see the logs at any time:

```bash
journalctl -u hello-api -f
```

---

### 11. Setup TURN server for voice calls

Without this, calls work between two phones on the **same wifi** and fail between two phones on **different mobile networks**. Mobile carriers block the direct connection and a relay is needed.

```bash
apt install -y coturn
```

```bash
sed -i 's/^#\?TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn
```

```bash
openssl rand -hex 32
```

Copy that value — you need it twice.

```bash
nano /etc/turnserver.conf
```

Delete everything in the file and paste this, replacing `PASTE_SECRET_HERE` and the domain:

```bash
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=PASTE_SECRET_HERE
realm=api.yourdomain.com
no-tls
no-dtls
no-multicast-peers
no-cli
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
min-port=49160
max-port=49200
```

Save and exit (Ctrl + X, then Y and Enter).

**Do not remove the `denied-peer-ip` lines.** Without them anyone on the internet can use your server to reach your own private network.

```bash
systemctl enable --now coturn && systemctl restart coturn
```

Now put the same secret into the backend:

```bash
nano /srv/hello/backend/.env
```

```bash
TURN_URLS=turn:api.yourdomain.com:3478?transport=udp,turn:api.yourdomain.com:3478?transport=tcp
TURN_SECRET=PASTE_SECRET_HERE
```

Save and exit, then restart the backend:

```bash
systemctl restart hello-api
```

---

### 12. Configure Nginx

```bash
apt install -y nginx
```

```bash
nano /etc/nginx/sites-available/hello-api
```

Paste this, replacing the domain:

```bash
upstream hello_api {
    server 127.0.0.1:4000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 256k;
    server_tokens off;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location /socket.io/ {
        proxy_pass http://hello_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://hello_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
}
```

Save and exit (Ctrl + X, then Y and Enter).

**The `/socket.io/` block must come before `location /`.** Without it live messages, read receipts and calls all stop working, and nothing shows an error — messages only appear when you reopen the chat.

```bash
ln -s /etc/nginx/sites-available/hello-api /etc/nginx/sites-enabled/
```

```bash
rm -f /etc/nginx/sites-enabled/default
```

```bash
mkdir -p /var/www/html && nginx -t
```

```bash
systemctl reload nginx
```

```bash
curl -s http://api.yourdomain.com/health
```

It must print `{"status":"ok",...}`.

---

### 13. Setup SSL certificate

```bash
apt install -y certbot python3-certbot-nginx
```

```bash
certbot --nginx -d api.yourdomain.com
```

Enter your email when asked and choose **redirect** when it offers. Certbot adds the HTTPS section to your Nginx file automatically.

```bash
curl -s https://api.yourdomain.com/health
```

```bash
systemctl list-timers | grep certbot
```

The timer means the certificate renews by itself.

---

### 14. Configure firewall

**Allow SSH first.** If you enable the firewall before this line, you lose access to your own VPS.

```bash
ufw allow OpenSSH
```

```bash
ufw allow 80,443/tcp
```

```bash
ufw allow 3478/tcp && ufw allow 3478/udp
```

```bash
ufw allow 49160:49200/udp
```

```bash
ufw enable
```

```bash
ufw status verbose
```

Ports 4000, 6379 and 27017 must **not** be in that list. They are only used inside the server.

---

### 15. Verify deployment

```bash
cd /srv/hello/backend && ./scripts/smoke.sh https://api.yourdomain.com
```

All 11 checks must pass: health, database, Redis, transactions, the four error types, rate limiting, the Socket.IO connection, and a check that no private data leaks.

---

### 16. Connect the mobile app

On your computer, edit `app/.env`:

```bash
EXPO_PUBLIC_API=https://api.yourdomain.com
EXPO_PUBLIC_SOCKET_URL=
```

Leave `EXPO_PUBLIC_SOCKET_URL` empty — it is taken from the API address.

Delete the cleartext plugin, which was only needed for plain HTTP:

```bash
rm app/plugins/withCleartextTraffic.js
```

Then remove the `"./plugins/withCleartextTraffic.js"` line from the `plugins` array in `app/app.json`, and build the app again. These values are built into the app file, so a rebuild is needed — a restart is not enough.

---

### 17. How to sign in

There is no SMS service connected, so the login code is printed in the server log instead of being sent.

```bash
journalctl -u hello-api -f | grep OTP
```

Enter the phone number in the app, read the 6 digit code from this screen, and type it in.

**Anyone who can read these logs can sign in as any user.** This is only for testing. Connect a real SMS provider in `src/services/sms.service.ts` and set `OTP_LOG_ONLY=false` before real users.

---

### 18. Redeploy after a code change

On your computer:

```bash
rsync -av --delete --exclude node_modules --exclude dist --exclude .env backend/ root@your_vps_ip:/srv/hello/backend/
```

```bash
rsync -avR app/src/services/types.ts root@your_vps_ip:/srv/hello/
```

On the VPS:

```bash
cd /srv/hello/backend && sudo -u hello -H npm ci && sudo -u hello -H npm run build
```

```bash
systemctl restart hello-api
```

```bash
./scripts/smoke.sh https://api.yourdomain.com
```

`.env` is excluded from the copy, so your secrets and TURN settings are safe.

#### One-time: voice messages (first deploy that includes them)

Voice audio is stored on this disk, in `/var/lib/hello/voice` — **never** inside
`/srv/hello/backend`, because the `rsync --delete` above would wipe every
recording on each redeploy.

On the VPS:

```bash
cp /srv/hello/backend/deploy/hello-api.service /etc/systemd/system/hello-api.service && systemctl daemon-reload
```

```bash
echo 'VOICE_DIR=/var/lib/hello/voice' >> /srv/hello/backend/.env
```

```bash
cp /srv/hello/backend/deploy/nginx-hello-api.conf /etc/nginx/sites-available/hello-api && nginx -t && systemctl reload nginx
```

(Re-apply your domain name to the nginx file first if you edited it in step 12.)
Then `systemctl restart hello-api`. The unit's `StateDirectory=hello` creates
`/var/lib/hello` owned by the `hello` user; the API creates `voice/` inside it.
Without the nginx step, uploads over 256 KB fail with `413`.

---

### 19. Troubleshooting

#### Following a call or a voice message in the log

Every step of a call is logged with `[call]`, every voice message with
`[voice]`, and socket logins with `[socket]`. The PHONES also report their own
side of a call (`[call] phone: …`), so one command shows the whole story:

```bash
journalctl -u hello-api -f -o cat | grep -E '\[call\]|\[voice\]|\[socket\]'
```

For a single call, add `| grep <callId>` (the id is in the `[call] started` line).

A healthy call reads, in order:

1. `[call] started — ring sent to callee` with `calleeSockets` ≥ 1
2. `[call] ice servers handed out` with `turn: true` — once per phone
3. `[call] phone: media ready` (callee) → `[call] accepted by callee`
4. `[call] phone: accepted received` → `offer sent` (caller)
5. `[call] relayed offer` → `phone: offer received` → `answer sent` → `relayed answer` → `phone: answer received`
6. many `[call] relayed ice candidate` lines (`candidate: host / srflx / relay`)
7. `[call] phone: ice state: checking` → `connected` → `phone: CONNECTED — audio path up`

Where it stops is the answer:

| Last thing you see | Meaning |
|---|---|
| `calleeSockets: 0` | The other phone is not connected — app closed, or its socket dropped. Nothing can ring it |
| `[socket] handshake REFUSED — invalid or expired token` repeating | A phone on an OLD build (before PLAN #223) cannot reconnect after 15 minutes. Install the new APK |
| No `phone: media ready` after accept | The callee's microphone failed — look for `phone: media FAILED` |
| `turn: false`, or `phone: ice-servers fetch FAILED` | `TURN_URLS` / `TURN_SECRET` missing from `.env`, or the phone could not fetch them |
| `offer re-sent` repeating, no `answer` | The callee never got the offer — check its `[socket]` lines |
| `offer FAILED to apply` / `answer FAILED to apply` | The error text says why |
| `ice state: failed` / `GAVE UP` | Setup fine, the network blocked the audio. `diagnosis` shows route types: no `relay` in `localTypes` with `turn: true` = coturn unreachable from that phone's network, or `TURN_SECRET` here differs from `static-auth-secret` in `/etc/turnserver.conf` |

Voice messages: `[voice] upload received` → `[voice] stored and sent` →
`[voice] play request`. `upload REFUSED at storage` with `EACCES`/`ENOENT` =
`VOICE_DIR` not writable (§18). No `upload received` at all while the app shows
"Couldn't send" = nginx rejected the body (the §18 nginx step).

| Problem | What to check |
|---|---|
| Backend will not start | `journalctl -u hello-api -n 50`. A missing setting says its own name and stops on purpose |
| `/ready` shows `transactions:false` | MongoDB is not a replica set. Run `mongosh --eval 'rs.status().ok'`, it must print `1` |
| 502 Bad Gateway | The backend is down. Step 10 |
| Messages only appear after reopening the chat | The `/socket.io/` block is missing or below `location /`. Step 12 |
| Login code never appears | `OTP_LOG_ONLY` is not `true` in `.env` |
| Calls work on wifi, fail on mobile data | TURN. Check `systemctl status coturn` and that UDP 3478 and 49160-49200 are open |
| App shows no people | `SEED_ANCHOR_LAT` / `SEED_ANCHOR_LNG` are not near your phones. Fix `.env` and run `npm run seed` again |

---

### Faster option

Steps 4 to 8, 11 and 12 are also available as one script, which installs everything, checks each part, generates `.env` with the secrets, and sets up TURN:

```bash
cd /srv/hello/backend && bash deploy/provision.sh api.yourdomain.com
```

Use this only if you do not want to run the steps one by one. You still need steps 9, 10, 13, 14 and 15. It is safe to run twice and will not overwrite an existing `.env`.

---

### Not finished yet

- Voice calls have never been tested on two real phones. This deployment is the first chance to test them.
- The speaker button does nothing. It needs another library that is not approved yet.
- Only one backend process is supported. A second one needs extra Nginx and code changes.
- There are no database backups. A nightly `mongodump` copied off the server is the next thing to add.
