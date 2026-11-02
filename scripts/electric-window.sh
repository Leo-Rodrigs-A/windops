#!/usr/bin/env bash
set -euo pipefail

cd /opt/windops
compose=(docker compose --env-file infra/.env.production --env-file .release.env -f infra/compose.production.yml)
hour=$(TZ=America/Sao_Paulo date +%H)

if (( 10#$hour >= 6 && 10#$hour < 18 )); then
  "${compose[@]}" up -d --wait --wait-timeout 180 electric
else
  "${compose[@]}" stop --timeout 60 electric
fi
