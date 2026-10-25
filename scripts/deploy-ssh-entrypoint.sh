#!/usr/bin/env bash
set -euo pipefail
# Install root-owned; use as a forced command for the dedicated deployment SSH key.
if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  exec sudo -n /usr/local/sbin/windops-deploy "${BASH_REMATCH[1]}"
fi
echo "Only deploy <40-character commit SHA> is accepted." >&2
exit 64
