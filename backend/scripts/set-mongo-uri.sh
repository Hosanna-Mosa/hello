#!/usr/bin/env bash
# Sets MONGO_URI in backend/.env without the value ever appearing on screen,
# in your shell history, or in a chat transcript.
#
#   bash scripts/set-mongo-uri.sh
#
# Paste the Atlas string when prompted. Input is hidden.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "backend/.env not found. Copy .env.example to .env first." >&2
  exit 1
fi

printf 'Paste the Atlas connection string (input hidden), then press Enter:\n> '
read -rs URI
printf '\n'

if [ -z "$URI" ]; then
  echo "Nothing entered. No change made." >&2
  exit 1
fi

case "$URI" in
  *"<db_username>"*|*"<password>"*|*"USER:PASSWORD"*)
    echo "That string still has a placeholder in it (<db_username> or <password>)." >&2
    echo "Replace it with the real database user and password, then run this again." >&2
    exit 1
    ;;
  mongodb+srv://*|mongodb://*) ;;
  *)
    echo "That does not look like a MongoDB connection string." >&2
    exit 1
    ;;
esac

# Rewrite the MONGO_URI line in place, leaving every other line alone.
python3 - "$URI" <<'PY'
import sys, re, pathlib
uri = sys.argv[1]
p = pathlib.Path(".env")
lines = p.read_text().splitlines(keepends=True)
out, replaced = [], False
for line in lines:
    if re.match(r'^\s*MONGO_URI=', line) and not replaced:
        out.append(f"MONGO_URI={uri}\n")
        replaced = True
    else:
        out.append(line)
if not replaced:
    out.append(f"MONGO_URI={uri}\n")
p.write_text("".join(out))
PY

HOST=$(printf '%s' "$URI" | sed -E 's|^[^@]*@([^/?]+).*|\1|')
echo "MONGO_URI set. Host: ${HOST}"
echo "Now run:  npm run check-db"
