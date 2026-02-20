#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AuraHealth — Phase 3: feature/local-storage
# expo-secure-store persistence, history screen, profile merge
# ─────────────────────────────────────────────────────────────────────────────
#  What this branch adds over feature/core-logic:
#   ✓ expo-secure-store integration (src/utils/storage.js)
#   ✓ Health logs saved and retrieved across app restarts
#   ✓ User profile persisted (merge-on-save, no data loss)
#   ✓ Period dates merged with Set deduplication
#   ✓ Corrupted / missing data handled gracefully
#   ✓ Chat history persisted (last 50 messages)
#
#  Storage keys used:
#    aurahealth_user_profile   — profile fields
#    aurahealth_daily_logs     — daily symptom entries
#    aurahealth_period_dates   — period tracking
#    aurahealth_chat_history   — AI chat (last 50 msgs)
#    aura_user_location        — last known GPS coords
#
#  Demonstrate:  fill profile → close app → reopen → data still there
#
#  Usage:
#    chmod +x scripts/start-local-storage.sh
#    ./scripts/start-local-storage.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
source "$(dirname "$0")/_common.sh"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   AuraHealth  ·  Branch: feature/local-storage   ║${NC}"
echo -e "${CYAN}║   Phase 3 — Offline Persistence (SecureStore)    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Persisted data (survives restarts):${NC}"
echo -e "  ${GREEN}✓${NC} User profile  (name, age, cycle length)"
echo -e "  ${GREEN}✓${NC} Daily logs    (symptoms, mood, vitals)"
echo -e "  ${GREEN}✓${NC} Period dates  (no duplicates)"
echo -e "  ${GREEN}✓${NC} Chat history  (last 50 messages)"
echo -e "  ${GREEN}✓${NC} Last GPS fix  (used by emergency module)"
echo ""
echo -e "  ${BOLD}Demo path:${NC} Profile Setup → fill fields → close app → reopen"
echo ""

echo -e "${YELLOW}Switching to branch: feature/local-storage${NC}"
cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --staged --quiet; then
    git stash push -m "auto-stash before switch to feature/local-storage" 2>/dev/null || true
fi

git checkout feature/local-storage
git clean -fd app/ src/ 2>/dev/null || true
echo -e "${GREEN}  ✓ On branch: $(git branch --show-current)${NC}"
echo ""

clear_all_caches "$ROOT_DIR"
ensure_deps "$ROOT_DIR" "Mobile App" "--legacy-peer-deps"

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Starting Expo — Phase 3: Local Storage${NC}"
echo -e "  Scan QR code with ${BOLD}Expo Go${NC} · Press ${YELLOW}Ctrl+C${NC} to stop"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

cd "$ROOT_DIR" && npx expo start --lan --clear
