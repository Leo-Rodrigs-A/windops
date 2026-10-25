#!/usr/bin/env bash
set -euo pipefail
# Installed root-owned as /usr/local/sbin/windops-deploy. Not writable by the SSH user.
[[ $# -eq 1 && "$1" =~ ^[0-9a-f]{40}$ ]] || exit 64
cd /opt/windops
exec 9>/run/lock/windops-deploy.lock
flock -n 9 || { echo "Deployment already running." >&2; exit 75; }
# Root-owned shell file containing IMAGE_PREFIX=ghcr.io/owner/repository
source /etc/windops/deploy.conf
[[ "$IMAGE_PREFIX" =~ ^ghcr\.io/[a-z0-9._/-]+$ ]] || exit 64
sha="$1"
api="$IMAGE_PREFIX-api:$sha"
web="$IMAGE_PREFIX-web:$sha"
docker pull "$api"
docker pull "$web"
umask 077
candidate=$(mktemp /opt/windops/.release.XXXXXX)
trap 'rm -f -- "$candidate"' EXIT
printf 'API_IMAGE=%s\nWEB_IMAGE=%s\n' \
  "$(docker image inspect --format '{{index .RepoDigests 0}}' "$api")" \
  "$(docker image inspect --format '{{index .RepoDigests 0}}' "$web")" > "$candidate"
compose=(docker compose --env-file infra/.env.production --env-file "$candidate" -f infra/compose.production.yml)
"${compose[@]}" config --quiet
"${compose[@]}" up -d --wait --wait-timeout 180 electric
# A failure here stops rollout. Migration rollback is deliberately not automated.
"${compose[@]}" run --rm --no-deps migrate
if "${compose[@]}" up -d --wait --wait-timeout 180; then
  if [[ -f .release.env ]]; then cp .release.env .release.previous.env; fi
  mv "$candidate" .release.env
  echo "Deployment healthy: $sha"
else
  echo "Health checks failed. Restoring previous images if available." >&2
  if [[ -f .release.env ]]; then
    docker compose --env-file infra/.env.production --env-file .release.env -f infra/compose.production.yml up -d --wait --wait-timeout 180
  fi
  exit 1
fi
