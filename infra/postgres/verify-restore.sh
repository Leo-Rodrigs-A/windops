#!/bin/sh
set -eu
umask 077

compose_file=infra/compose.dev.yml
backup_file=$(mktemp "${TMPDIR:-/tmp}/windops-restore.XXXXXX")
restore_database="windops_restore_check_$$"

cleanup() {
  docker compose -f "$compose_file" exec -T postgres dropdb --if-exists -U windops "$restore_database" >/dev/null 2>&1 || true
  rm -f "$backup_file"
}
trap cleanup EXIT HUP INT TERM

docker compose -f "$compose_file" exec -T postgres pg_dump -U windops -d windops -Fc > "$backup_file"
docker compose -f "$compose_file" exec -T postgres createdb -U windops "$restore_database"
docker compose -f "$compose_file" exec -T postgres pg_restore -U windops -d "$restore_database" --no-owner < "$backup_file"

source_counts=$(docker compose -f "$compose_file" exec -T postgres psql -U windops -d windops -Atc \
  "SELECT (SELECT count(*) FROM public.workspaces)::text || ':' || (SELECT count(*) FROM drizzle.__drizzle_migrations)::text")
restored_counts=$(docker compose -f "$compose_file" exec -T postgres psql -U windops -d "$restore_database" -Atc \
  "SELECT (SELECT count(*) FROM public.workspaces)::text || ':' || (SELECT count(*) FROM drizzle.__drizzle_migrations)::text")

if [ "$source_counts" != "$restored_counts" ]; then
  printf 'Restore mismatch: source=%s restored=%s\n' "$source_counts" "$restored_counts" >&2
  exit 1
fi

printf 'Disposable restore verified: workspaces:migrations=%s\n' "$restored_counts"
