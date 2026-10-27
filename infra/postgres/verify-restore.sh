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
source_issue_schema=$(docker compose -f "$compose_file" exec -T postgres psql -U windops -d windops -Atc \
  "SELECT concat_ws(',', to_regclass('public.issues')::text, to_regclass('public.issue_events')::text, to_regclass('public.issue_location_references')::text, to_regclass('public.sync_commands')::text, to_regclass('public.issue_sync_rows')::text, to_regclass('public.issue_sync_events')::text)")
restored_issue_schema=$(docker compose -f "$compose_file" exec -T postgres psql -U windops -d "$restore_database" -Atc \
  "SELECT concat_ws(',', to_regclass('public.issues')::text, to_regclass('public.issue_events')::text, to_regclass('public.issue_location_references')::text, to_regclass('public.sync_commands')::text, to_regclass('public.issue_sync_rows')::text, to_regclass('public.issue_sync_events')::text)")

if [ "$source_counts" != "$restored_counts" ]; then
  printf 'Restore mismatch: source=%s restored=%s\n' "$source_counts" "$restored_counts" >&2
  exit 1
fi

if [ "$source_issue_schema" != "$restored_issue_schema" ]; then
  printf 'Issue schema restore mismatch: source=%s restored=%s\n' "$source_issue_schema" "$restored_issue_schema" >&2
  exit 1
fi

printf 'Disposable restore verified: workspaces:migrations=%s; issue schema=%s\n' "$restored_counts" "$restored_issue_schema"
