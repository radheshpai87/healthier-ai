#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AuraHealth — Phase 5: feature/ui-polish
# Loading states, form error messages, clean component structure
# ─────────────────────────────────────────────────────────────────────────────
#  What this branch adds over feature/emergency-module:
#   ✓ Consistent 48 dp touch targets (accessible for rural users)
#   ✓ Brand gradient buttons (#FFB6C1 → #FF8FAB)
#   ✓ ActivityIndicator / loading states on all async screens
#   ✓ Skeleton placeholders (Risk screen during assessment)
#   ✓ Typing indicator in Chat while AI responds
#   ✓ Inline validation errors with red field highlight
#   ✓ Auto-scroll to first error on form submit
#   ✓ Fully separated /src/services, /src/components, /src/screens
#   ✓ SafeAreaView from react-native-safe-area-context on all screens
#
#  Demonstrate:  any form → leave fields blank → submit → see inline errors
#
#  Usage:
#    chmod +x scripts/start-ui-polish.sh
#    ./scripts/start-ui-polish.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
source "$(dirname "$0")/_common.sh"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   AuraHealth  ·  Branch: feature/ui-polish       ║${NC}"
echo -e "${CYAN}║   Phase 5 — UX Polish & Component Refactor       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}UI improvements:${NC}"
echo -e "  ${GREEN}✓${NC} Loading spinners on every async operation"
echo -e "  ${GREEN}✓${NC} Inline form validation (errors appear below each field)"
echo -e "  ${GREEN}✓${NC} Brand gradient buttons with 48 dp touch targets"
echo -e "  ${GREEN}✓${NC} Correct SafeAreaView (works on notch + tall displays)"
echo -e "  ${GREEN}✓${NC} Clean /src folder: services / components / screens / hooks"
echo ""
echo -e "  ${BOLD}Demo path:${NC} Profile Setup → leave name blank → tap Continue"
echo ""

echo -e "${YELLOW}Switching to branch: feature/ui-polish${NC}"
cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --staged --quiet; then
    git stash push -m "auto-stash before switch to feature/ui-polish" 2>/dev/null || true
fi

git checkout feature/ui-polish
git clean -fd app/ src/ 2>/dev/null || true
echo -e "${GREEN}  ✓ On branch: $(git branch --show-current)${NC}"
echo ""

clear_all_caches "$ROOT_DIR"
ensure_deps "$ROOT_DIR" "Mobile App" "--legacy-peer-deps"

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Starting Expo — Phase 5: UI Polish${NC}"
echo -e "  Scan QR code with ${BOLD}Expo Go${NC} · Press ${YELLOW}Ctrl+C${NC} to stop"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

cd "$ROOT_DIR" && npx expo start --lan --clear
