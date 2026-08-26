#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

TELEGRAM_IPV6="${TELEGRAM_IPV6:-2001:67c:4e8:f004::9}"
SYSCTL_FILE="/etc/sysctl.d/99-ab-afisha-telegram-ipv6.conf"

route_info="$(ip -6 route get "$TELEGRAM_IPV6" 2>/dev/null || true)"
uplink="$(printf '%s\n' "$route_info" | awk '{for(i=1;i<=NF;i++) if($i=="dev"){print $(i+1); exit}}')"
host_ipv6="$(printf '%s\n' "$route_info" | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"

if [[ -z "$uplink" || -z "$host_ipv6" ]]; then
  echo "ERROR: unable to resolve IPv6 uplink/source for Telegram" >&2
  echo "$route_info" >&2
  exit 1
fi

cat > "$SYSCTL_FILE" <<EOF
# Managed by AB Afisha. Required for Docker IPv6 egress to Telegram.
net.ipv6.conf.all.forwarding=1
net.ipv6.conf.${uplink}.accept_ra=2
EOF

sysctl -p "$SYSCTL_FILE"

curl -6 --connect-timeout 10 --max-time 15 -fsS -o /dev/null https://api.telegram.org/

printf '%s\n' \
  "TELEGRAM_IPV6_HOST_READY=true" \
  "IPV6_UPLINK=$uplink" \
  "DOCKER_HOST_IPV6=$host_ipv6" \
  "SYSCTL_FILE=$SYSCTL_FILE"
