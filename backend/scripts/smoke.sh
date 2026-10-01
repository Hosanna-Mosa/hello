#!/usr/bin/env bash
#
# Post-deploy smoke walk.
#
# PLAN's verification blocks have asked for this since Phase 0 and it had never
# been written, so "the deploy is up" has never been a checkable claim. This is
# that claim, as curl.
#
# It is deliberately UNAUTHENTICATED end to end: on a real server OTP_LOG_ONLY
# means the login code is only in the journal, so a scripted sign-in would need
# shell access and would stop being a smoke test. What it proves instead is
# everything that must be true before a sign-in could work at all — the process,
# both databases, transactions, the error envelope, the rate limiter, and the
# Socket.IO handshake, which is the one that silently degrades to polling and
# looks like "messages only arrive when I reopen the chat".
#
# USAGE
#   ./scripts/smoke.sh https://api.example.com
#   ./scripts/smoke.sh                       # defaults to http://127.0.0.1:4000
#
# Exit code is the verdict: 0 all passed, 1 something failed.

set -uo pipefail

BASE="${1:-http://127.0.0.1:4000}"
BASE="${BASE%/}"

PASS=0
FAIL=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass() { PASS=$((PASS + 1)); printf '  \033[32mok\033[0m   %s\n' "$1"; }
fail() { FAIL=$((FAIL + 1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; [ -n "${2:-}" ] && printf '       %s\n' "$2"; }

# Body to $TMP/body, status echoed. `--max-time` so a hung server fails rather
# than hangs the whole walk.
req() {
  local method="$1" path="$2" data="${3:-}"
  if [ -n "$data" ]; then
    curl -s -o "$TMP/body" -w '%{http_code}' --max-time 10 \
      -X "$method" "$BASE$path" -H 'Content-Type: application/json' -d "$data"
  else
    curl -s -o "$TMP/body" -w '%{http_code}' --max-time 10 -X "$method" "$BASE$path"
  fi
}

body() { cat "$TMP/body"; }

# Envelope check: the contract says EVERY failure is {"error":{"code","message"}}
# and nothing else. A bare string or an HTML error page from nginx is a failure
# even when the status is right.
expect_error() {
  local label="$1" want_status="$2" want_code="$3" got_status="$4" got_body="$5"
  if [ "$got_status" != "$want_status" ]; then
    fail "$label" "expected $want_status, got $got_status: $got_body"
    return
  fi
  if ! printf '%s' "$got_body" | grep -q "\"code\":\"$want_code\""; then
    fail "$label" "status $got_status correct but envelope wrong: $got_body"
    return
  fi
  pass "$label ($got_status $want_code)"
}

echo
echo "smoke: $BASE"
echo

# ── liveness ────────────────────────────────────────────────────────────────
S=$(req GET /health); B=$(body)
if [ "$S" = "200" ] && printf '%s' "$B" | grep -q '"status":"ok"'; then
  pass "GET /health"
else
  fail "GET /health" "$S $B"
fi

# ── readiness: the one that actually says whether the deploy works ──────────
S=$(req GET /ready); B=$(body)
if [ "$S" != "200" ]; then
  fail "GET /ready" "$S $B"
else
  pass "GET /ready (200)"
  printf '%s' "$B" | grep -q '"mongo":"up"' && pass "  mongo up" || fail "  mongo" "$B"
  printf '%s' "$B" | grep -q '"redis":"up"' && pass "  redis up" || fail "  redis" "$B"
  # On a production host this MUST be true: REQUIRE_TRANSACTIONS is forced there,
  # and a standalone mongod cannot write a match and its thread atomically.
  if printf '%s' "$B" | grep -q '"transactions":true'; then
    pass "  transactions available"
  else
    fail "  transactions" "not available — Atlas or a single-node replica set is required; accepting a request cannot be atomic without them"
  fi
fi

# ── the four envelope cases PLAN names verbatim ─────────────────────────────
S=$(req POST /v1/auth/login '{"identifier":"","password":""}'); B=$(body)
expect_error "validation" 400 validation "$S" "$B"

S=$(req GET /v1/me); B=$(body)
expect_error "unauthorized" 401 unauthorized "$S" "$B"

S=$(req GET /v1/definitely-not-a-route); B=$(body)
expect_error "notFound" 404 notFound "$S" "$B"

# Rate limit. The auth-code bucket is the tightest, so hammer that one; a server
# with no limiter in front of OTP sending is an SMS bill and an enumeration tool.
HIT=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  S=$(req POST /v1/auth/login '{"identifier":"smoke@example.invalid","password":"not-the-password-1"}'); B=$(body)
  if [ "$S" = "429" ]; then HIT="$B"; break; fi
done
if [ -n "$HIT" ]; then
  expect_error "rate limited" 429 rateLimited "429" "$HIT"
else
  fail "rate limited" "12 rapid sign-in attempts never produced a 429"
fi

# ── Socket.IO handshake ─────────────────────────────────────────────────────
# The polling handshake answers `0{"sid":...}`. If this 404s, the proxy is not
# passing /socket.io/ and live messages, receipts and calls are all dead while
# every REST check above still passes.
S=$(curl -s -o "$TMP/body" -w '%{http_code}' --max-time 10 \
  "$BASE/socket.io/?EIO=4&transport=polling"); B=$(body)
if [ "$S" = "200" ] && printf '%s' "$B" | grep -q '"sid"'; then
  pass "Socket.IO handshake"
else
  fail "Socket.IO handshake" "$S $B — check the /socket.io/ location block in nginx"
fi

# ── leak sweep, on everything unauthenticated ───────────────────────────────
# PLAN repeats this guard in every phase: only /me and /auth/* may carry these.
# None of the endpoints walked above is one of those.
LEAKS=""
for path in /health /ready /v1/definitely-not-a-route; do
  curl -s --max-time 10 "$BASE$path" >> "$TMP/sweep" 2>/dev/null
done
for word in latitude longitude coordinate birthday phone photo; do
  grep -qi "$word" "$TMP/sweep" 2>/dev/null && LEAKS="$LEAKS $word"
done
if [ -z "$LEAKS" ]; then
  pass "leak sweep (no location, birthday, phone or photo field)"
else
  fail "leak sweep" "found:$LEAKS"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  printf '\033[32m%s passed, 0 failed\033[0m\n\n' "$PASS"
  exit 0
fi
printf '\033[31m%s passed, %s FAILED\033[0m\n\n' "$PASS" "$FAIL"
exit 1
