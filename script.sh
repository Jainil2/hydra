#!/bin/zsh
set -euo pipefail

# Config
HYDRA_PUBLIC=http://localhost:4444
HYDRA_ADMIN=http://localhost:4445
CLIENT_ID=pkce-public
REDIRECT_URI=http://localhost:3000/result
SCOPE='openid offline'

# Simple helpers
rs() { openssl rand -hex 16 | cut -c1-24; }
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

# Pre-encode redirect_uri and scope safely
REDIRECT_URI_ENC=$(printf '%s' "$REDIRECT_URI" | sed -e 's/:/%3A/g' -e 's,/,%2F,g')
SCOPE_ENC=$(printf '%s' "$SCOPE" | sed 's/ /%20/g')

# 1) Generate PKCE verifier+challenge in shell (86+ char verifier)
VERIFIER=$(openssl rand 64 | b64url)
CHALLENGE=$(printf '%s' "$VERIFIER" | openssl dgst -binary -sha256 | b64url)
STATE=$(rs)
NONCE=$(rs)

echo "VERIFIER len=${#VERIFIER}"
echo "CHALLENGE=$CHALLENGE"
echo "STATE=$STATE"
echo "NONCE=$NONCE"

# 2) Start authorization request (Hydra will redirect to /auth/login?login_challenge=...)
AUTH_URL="${HYDRA_PUBLIC}/oauth2/auth?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI_ENC}&scope=${SCOPE_ENC}&state=${STATE}&nonce=${NONCE}&code_challenge=${CHALLENGE}&code_challenge_method=S256"
echo "AUTH_URL: $AUTH_URL"

# Grab the login URL (Location header)
curl -sS -D /tmp/h1 -o /dev/null "$AUTH_URL" >/dev/null
LOGIN_URL=$(awk 'BEGIN{IGNORECASE=1}/^Location:/{sub(/\r/,"");print $2}' /tmp/h1)
echo "LOGIN_URL: $LOGIN_URL"

# Extract login_challenge
LOGIN_CHALLENGE=${LOGIN_URL#*login_challenge=}
LOGIN_CHALLENGE=${LOGIN_CHALLENGE%%&*}
echo "LOGIN_CHALLENGE: $LOGIN_CHALLENGE"

if [ -z "$LOGIN_CHALLENGE" ] || [[ "$LOGIN_URL" != *login_challenge=* ]]; then
  echo "Error: Did not receive login_challenge. Response headers:" >&2
  cat /tmp/h1 >&2
  exit 1
fi

# 3) Accept login via Admin (impersonate demo-user) and get redirect_to
curl -sS -X PUT "$HYDRA_ADMIN/oauth2/auth/requests/login/accept?login_challenge=$LOGIN_CHALLENGE" \
  -H 'Content-Type: application/json' \
  -d '{"subject":"demo-user","remember":false}' \
  -o /tmp/accept_login.json

CONT_AFTER_LOGIN=$(sed -n 's/.*"redirect_to":"\([^"]*\)".*/\1/p' /tmp/accept_login.json | sed 's/\\u0026/\&/g')
echo "CONT_AFTER_LOGIN: $CONT_AFTER_LOGIN"

if [ -z "$CONT_AFTER_LOGIN" ]; then
  echo "Error: No redirect_to after login accept. Body:" >&2
  cat /tmp/accept_login.json >&2
  exit 1
fi

# 4) Follow redirect to trigger consent challenge
curl -sS -D /tmp/h2 -o /dev/null "$CONT_AFTER_LOGIN" >/dev/null
CONSENT_URL=$(awk 'BEGIN{IGNORECASE=1}/^Location:/{sub(/\r/,"");print $2}' /tmp/h2)
echo "CONSENT_URL: $CONSENT_URL"

CONSENT_CHALLENGE=${CONSENT_URL#*consent_challenge=}
CONSENT_CHALLENGE=${CONSENT_CHALLENGE%%&*}
echo "CONSENT_CHALLENGE: $CONSENT_CHALLENGE"

if [ -z "$CONSENT_CHALLENGE" ]; then
  echo "Error: No consent_challenge. Response headers:" >&2
  cat /tmp/h2 >&2
  exit 1
fi

# 5) Accept consent with the requested scopes; get final redirect with ?code=...
curl -sS -X PUT "$HYDRA_ADMIN/oauth2/auth/requests/consent/accept?consent_challenge=$CONSENT_CHALLENGE" \
  -H 'Content-Type: application/json' \
  -d '{"grant_scope":["openid","offline"],"grant_access_token_audience":[],"remember":false,"session":{}}' \
  -o /tmp/accept_consent.json

FINAL_REDIRECT=$(sed -n 's/.*"redirect_to":"\([^"]*\)".*/\1/p' /tmp/accept_consent.json | sed 's/\\u0026/\&/g')
echo "FINAL_REDIRECT: $FINAL_REDIRECT"

# 6) Parse authorization code and state
CODE=${FINAL_REDIRECT#*code=}; CODE=${CODE%%&*}
STATE_OUT=${FINAL_REDIRECT#*state=}; STATE_OUT=${STATE_OUT%%&*}
echo "CODE: ${CODE:0:16}..."
echo "STATE_OUT: $STATE_OUT"

if [ -z "$CODE" ]; then
  echo "Error: No authorization code in FINAL_REDIRECT. Body:" >&2
  cat /tmp/accept_consent.json >&2
  exit 1
fi

# 7) Exchange code for tokens (public client: send client_id, NO secret)
curl -sS -X POST "$HYDRA_PUBLIC/oauth2/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=authorization_code" \
  -d "code=$CODE" \
  -d "redirect_uri=$REDIRECT_URI" \
  -d "client_id=$CLIENT_ID" \
  -d "code_verifier=$VERIFIER" \
  -o /tmp/token.json

echo "Token response (first 200 lines):"
sed -n '1,200p' /tmp/token.json