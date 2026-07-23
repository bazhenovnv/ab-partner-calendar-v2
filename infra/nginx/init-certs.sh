#!/bin/sh
# Runs as nginx container entrypoint.
# Creates a temporary self-signed certificate for test.ab-event.pro if the
# real Let's Encrypt certificate does not yet exist. This breaks the
# chicken-and-egg dependency: nginx must start before certbot can run,
# but nginx refuses to start if the ssl_certificate path is missing.
#
# Workflow:
#   1. Container starts → this script runs
#   2. If /etc/letsencrypt/live/test.ab-event.pro/fullchain.pem is absent:
#      - generates a 1-day self-signed cert at that path
#      - nginx starts (serves HTTP + HTTPS with dummy cert for staging)
#   3. Operator runs certbot (webroot challenge succeeds via HTTP:80)
#   4. Operator runs: nginx -s reload
#      - nginx picks up the real Let's Encrypt cert
#   5. On subsequent container restarts the real cert is already present → skipped

set -e

DOMAIN="test.ab-event.pro"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [ ! -f "${CERT_DIR}/fullchain.pem" ]; then
    echo "[init-certs] Certificate not found for ${DOMAIN} — creating temporary self-signed cert..."
    mkdir -p "${CERT_DIR}"
    openssl req -x509 -nodes -newkey rsa:2048 \
        -keyout "${CERT_DIR}/privkey.pem" \
        -out  "${CERT_DIR}/fullchain.pem" \
        -days 1 \
        -subj "/CN=${DOMAIN}" \
        2>/dev/null
    echo "[init-certs] Temporary cert written to ${CERT_DIR}"
    echo "[init-certs] Run certbot after nginx starts, then: nginx -s reload"
else
    echo "[init-certs] Certificate found for ${DOMAIN} — using existing cert."
fi

exec nginx -g 'daemon off;'
