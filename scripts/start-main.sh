#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AuraHealth — Phase 1: main
# Base setup — navigation + UI screens, app runs successfully
# ─────────────────────────────────────────────────────────────────────────────
#  What this branch shows:
#   ✓ Expo Router tab-based navigation
#   ✓ Home, Calendar, Chat, Risk, Settings screens created
#   ✓ ASHA worker screen and role-selection flow
#   ✓ Basic UI layout with SafeAreaView and pastel theme
#   ✓ App boots and navigates without errors
#
#  Usage:
#    chmod +x scripts/start-main.sh
#    ./scripts/start-main.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── Colors & shared helpers ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
source "$(dirname "$0")/_common.sh"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   AuraHealth  ·  Branch: main                    ║${NC}"
echo -e "${CYAN}║   Phase 1 — Navigation Skeleton                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Features in this branch:${NC}"
echo -e "  ${GREEN}✓${NC} Expo Router tab navigation (5 tabs)"
echo -e "  ${GREEN}✓${NC} Placeholder screens: Home, Calendar, Chat, Risk, Settings"
echo -e "  ${GREEN}✓${NC} Pastel theme (#FFF5F5, #FFB6C1)"
echo -e "  ${YELLOW}○${NC} No logic, no storage, no AI — skeleton only"
echo ""

# ── Switch to branch ──────────────────────────────────────────────────────────
echo -e "${YELLOW}Switching to branch: main${NC}"
cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --staged --quiet; then
    echo -e "${YELLOW}Stashing uncommitted changes before switching...${NC}"
    git stash push -m "auto-stash before switch to main" 2>/dev/null || true
fi

git checkout main
git clean -fd app/ src/ 2>/dev/null || true
echo -e "${GREEN}  ✓ On branch: $(git branch --show-current)${NC}"
echo ""

# ── Reset: kill ports, clear all caches ──────────────────────────────────────
clear_all_caches "$ROOT_DIR"

# ── Install deps if needed ────────────────────────────────────────────────────
ensure_deps "$ROOT_DIR" "Mobile App" "--legacy-peer-deps"

# ── Start ─────────────────────────────────────────────────────────────────────
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Starting Expo (Mobile App only — Phase 1)${NC}"
echo ""
echo -e "  Scan the QR code with ${BOLD}Expo Go${NC} on your phone."
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop."
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

cd "$ROOT_DIR" && npx expo start --lan --clear
