#!/usr/bin/env bash
# Visual Contract Guardrails — rebuild surfaces only
# Enforces VISUAL_CONTRACT rules via ban-based guardrails.
# HARD-FAIL on motion/gradients/hype/gimmicks.
# WARN-ONLY on ad-hoc typography (until rebuild primitives exist).

set -euo pipefail

TARGETS=("app/rebuild" "lib/rebuild" "components/rebuild")
VIOLATIONS=""
WARNINGS=""
EXIT_CODE=0

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Visual Contract Guardrails (rebuild-only)"
echo "=================================================="
echo ""

# Helper: add violation
add_violation() {
  local rule="$1"
  local output="$2"
  local hint="$3"
  if [ -n "$output" ]; then
    VIOLATIONS="${VIOLATIONS}\n${RED}[HARD-FAIL] ${rule}${NC}\n${output}\n  Hint: ${hint}\n"
    EXIT_CODE=1
  fi
}

# Helper: add warning
add_warning() {
  local rule="$1"
  local output="$2"
  local hint="$3"
  if [ -n "$output" ]; then
    WARNINGS="${WARNINGS}\n${YELLOW}[WARN] ${rule}${NC}\n${output}\n  Hint: ${hint}\n"
  fi
}

for TARGET in "${TARGETS[@]}"; do
  if [ ! -d "$TARGET" ]; then
    echo "Skipping $TARGET (directory does not exist)"
    continue
  fi

  echo "Scanning: $TARGET"
  echo ""

  # ============================================================
  # HARD-FAIL RULES
  # ============================================================

  # A) Motion Contract — ban attention/layout animations
  echo "  [A] Motion Contract..."

  # transition-all
  output=$(rg -n --glob '!**/*.md' '\btransition-all\b' "$TARGET" 2>/dev/null || true)
  add_violation "Motion: transition-all" "$output" "Use transition-opacity, transition-colors, or transition-transform instead."

  # animate-*
  output=$(rg -n --glob '!**/*.md' '\banimate-[A-Za-z0-9_-]+' "$TARGET" 2>/dev/null || true)
  add_violation "Motion: animate-*" "$output" "Remove animation classes; use subtle transitions only."

  # motion-safe:animate-* or motion-safe:transition-all
  output=$(rg -n --glob '!**/*.md' '\bmotion-safe:(animate-|transition-all)' "$TARGET" 2>/dev/null || true)
  add_violation "Motion: motion-safe:animate/transition-all" "$output" "Remove motion-safe animation modifiers."

  # B) Color Contract — no decorative gradients
  echo "  [B] Color Contract..."

  # bg-gradient
  output=$(rg -n --glob '!**/*.md' '\bbg-gradient' "$TARGET" 2>/dev/null || true)
  add_violation "Gradient: bg-gradient" "$output" "Use solid background colors (bg-slate-*, bg-white, etc.)."

  # from-*, via-*, to-* (gradient stops)
  output=$(rg -n --glob '!**/*.md' '\b(from|via|to)-[A-Za-z0-9_-]+' "$TARGET" 2>/dev/null || true)
  add_violation "Gradient: from-/via-/to-*" "$output" "Remove gradient stops; use solid colors."

  # C) Hype / urgency copy bans
  echo "  [C] Hype/Urgency Copy..."

  output=$(rg -n -i --glob '!**/*.md' 'hot deal|limited time|hurry|🔥' "$TARGET" 2>/dev/null || true)
  add_violation "Hype Copy: hot deal/limited time/hurry/🔥" "$output" "Remove urgency/hype language; use neutral descriptive copy."

  # D) Gimmick UI bans
  echo "  [D] Gimmick UI..."

  # swiper, carousel, zoom
  output=$(rg -n --glob '!**/*.md' '\b(swiper|carousel|zoom)\b' "$TARGET" 2>/dev/null || true)
  add_violation "Gimmick: swiper/carousel/zoom" "$output" "Remove gimmick UI patterns; use simple static layouts."

  # hover:scale-*, active:scale-*, scale-105, scale-110
  output=$(rg -n --glob '!**/*.md' '\b(hover:scale-|active:scale-|scale-105|scale-110)' "$TARGET" 2>/dev/null || true)
  add_violation "Gimmick: scale transforms" "$output" "Remove scale transforms; avoid zoomy interactions."

  # ============================================================
  # WARN-ONLY RULES (do not fail CI)
  # ============================================================

  # E) Typography "ad-hoc" usage
  echo "  [E] Typography (warn-only)..."

  # text-xs, text-sm, etc.
  output=$(rg -n --glob '!**/*.md' '\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b' "$TARGET" 2>/dev/null || true)
  add_warning "Typography: ad-hoc text-* sizes" "$output" "Prefer rebuild typography primitives once introduced; do not expand ad-hoc typography usage."

  # tracking-*, leading-*
  output=$(rg -n --glob '!**/*.md' '\b(tracking|leading)-' "$TARGET" 2>/dev/null || true)
  add_warning "Typography: tracking-/leading-*" "$output" "Prefer rebuild typography primitives once introduced; do not expand ad-hoc typography usage."

  echo ""
done

# ============================================================
# Output Results
# ============================================================

if [ -n "$WARNINGS" ]; then
  echo "=================================================="
  echo "WARNINGS (do not block merge)"
  echo "=================================================="
  echo -e "$WARNINGS"
fi

if [ -n "$VIOLATIONS" ]; then
  echo "=================================================="
  echo "VIOLATIONS (blocking)"
  echo "=================================================="
  echo -e "$VIOLATIONS"
  echo ""
  echo "=================================================="
  echo -e "${RED}FAIL: Visual Contract Guardrails${NC}"
  echo "=================================================="
  echo "Fix the above violations in rebuild surfaces only."
  echo "Do not touch legacy or non-rebuild routes."
  exit 1
fi

echo "=================================================="
echo -e "${GREEN}PASS: Visual Contract Guardrails (rebuild-only)${NC}"
echo "=================================================="
exit 0
