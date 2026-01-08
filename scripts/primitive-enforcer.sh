#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "Primitive Enforcer (rebuild-only)"
echo "=================================================="

echo "Scanning: app/rebuild"

echo "  [A] Inline primitive definitions..."

output=$(rg -n --glob '!**/*.md' 'function\s+ConfidenceBadge|const\s+ConfidenceBadge\s*=' app/rebuild 2>/dev/null || true)

if [ -n "$output" ]; then
  echo ""
  echo "[HARD-FAIL] Inline ConfidenceBadge definition found in rebuild routes."
  echo "$output"
  echo ""
  echo "Move ConfidenceBadge to components/rebuild and import it instead."
  exit 1
fi

echo ""
echo "PASS: Primitive Enforcer (rebuild-only)"
exit 0
