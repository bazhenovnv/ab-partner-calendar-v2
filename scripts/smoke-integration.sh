#!/usr/bin/env bash
# Integration smoke tests against a running environment.
# Usage: BACKEND_URL=http://localhost:3001 FRONTEND_URL=http://localhost:3000 ./scripts/smoke-integration.sh

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
  local label="$1"
  local expected_status="$2"
  local url="$3"

  actual=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$actual" = "$expected_status" ]; then
    echo "  ✓ $label ($actual)"
    PASS=$((PASS+1))
  else
    echo "  ✗ $label — expected $expected_status, got $actual — $url"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "=== Backend smoke tests ($BACKEND_URL) ==="
check "health endpoint"                200 "$BACKEND_URL/api/health"
check "public events list"             200 "$BACKEND_URL/api/events/public"
check "public quotes list"             200 "$BACKEND_URL/api/quotes/public"
check "admin dashboard requires auth"  401 "$BACKEND_URL/api/admin/dashboard"
check "admin settings requires auth"   401 "$BACKEND_URL/api/admin/settings"

echo ""
echo "=== Frontend smoke tests ($FRONTEND_URL) ==="
check "home page"          200 "$FRONTEND_URL/"
check "events page"        200 "$FRONTEND_URL/events"
check "admin redirects"    307 "$FRONTEND_URL/admin"
check "admin login page"   200 "$FRONTEND_URL/admin/login"

echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "RESULT: $PASS passed, $FAIL FAILED"
  exit 1
else
  echo "RESULT: All $PASS smoke tests passed"
fi
