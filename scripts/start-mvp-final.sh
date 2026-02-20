#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AuraHealth — Phase 6: demo/mvp-final
# Full demo build — all features combined, production-clean
# ─────────────────────────────────────────────────────────────────────────────
#  This branch starts ALL THREE services:
#   1. Backend   (Express + MongoDB Atlas)  → http://localhost:3000
#   2. Dashboard (React — NGO analytics)   → http://localhost:3001
#   3. Mobile    (Expo Go)                 → scan QR
#
#  What's in this final branch:
#   ✓ Everything from all previous phases
#   ✓ Debug logs removed from production paths
#   ✓ Dead code and unused imports cleaned
#   ✓ Consistent error handling throughout
#   ✓ Both offline (SecureStore) and online (MongoDB) paths tested
#   ✓ Gemini AI chat (gemini-2.5-flash with fallback chain)
#   ✓ App fully stable — zero console errors
#
#  Usage:
#    chmod +x scripts/start-mvp-final.sh
#    ./scripts/start-mvp-final.sh
#
#  Requires: backend/.env with valid MONGODB_URI
# ─────────────────────────────────────────────────────────────────────────────

set -e
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
source "$(dirname "$0")/_common.sh"

PIDS=()

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   AuraHealth  ·  Branch: demo/mvp-final          ║${NC}"
echo -e "${CYAN}║   Phase 6 — Full Demo (All Services)             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Services starting:${NC}"
echo -e "  ${GREEN}[1]${NC} Backend   — Express + MongoDB Atlas  (port 3000)"
echo -e "  ${GREEN}[2]${NC} Dashboard — React NGO analytics      (port 3001)"
echo -e "  ${GREEN}[3]${NC} Mobile    — Expo Go (scan QR)"
echo ""
echo -e "  ${BOLD}Full feature set:${NC}"
echo -e "  ${GREEN}✓${NC} Rule-based risk engine (anemia / PCOS / pregnancy)"
echo -e "  ${GREEN}✓${NC} Offline SecureStore persistence"
echo -e "  ${GREEN}✓${NC} Emergency SOS with GPS + intensity classifier"
echo -e "  ${GREEN}✓${NC} AI health chat (Gemini 2.5-flash)"
echo -e "  ${GREEN}✓${NC} Sync to MongoDB when online"
echo -e "  ${GREEN}✓${NC} ASHA worker dashboard"
echo ""

# ── Switch to branch ──────────────────────────────────────────────────────────
echo -e "${YELLOW}Switching to branch: demo/mvp-final${NC}"
cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --staged --quiet; then
    echo -e "${YELLOW}Stashing uncommitted changes...${NC}"
    git stash push -m "auto-stash before switch to demo/mvp-final" 2>/dev/null || true
fi

git checkout demo/mvp-final
git clean -fd app/ src/ 2>/dev/null || true
echo -e "${GREEN}  ✓ On branch: $(git branch --show-current)${NC}"
echo ""

# ── Reset: kill all ports, clear all caches (incl. dashboard) ────────────────
clear_all_caches "$ROOT_DIR" dashboard

# ── Auto-detect LAN IP, update app.json + dashboard/.env ─────────────────────
if [ ! -f "$ROOT_DIR/dashboard/.env" ] && [ -f "$ROOT_DIR/dashboard/.env.example" ]; then
    cp "$ROOT_DIR/dashboard/.env.example" "$ROOT_DIR/dashboard/.env"
fi
detect_lan_ip "$ROOT_DIR"

# ── Install dependencies ──────────────────────────────────────────────────────
ensure_deps "$ROOT_DIR"           "Mobile App" "--legacy-peer-deps"
ensure_deps "$ROOT_DIR/backend"   "Backend"
ensure_deps "$ROOT_DIR/dashboard" "Dashboard"

# ── Validate backend .env ─────────────────────────────────────────────────────
if [ ! -f "$ROOT_DIR/backend/.env" ]; then
    echo -e "${RED}ERROR: backend/.env not found!${NC}"
    echo -e "  Copy ${CYAN}backend/.env.example${NC} to ${CYAN}backend/.env${NC} and set MONGODB_URI."
    exit 1
fi

# ── Cleanup on Ctrl+C ─────────────────────────────────────────────────────────
CLEANING_UP=false
cleanup() {
    $CLEANING_UP && return
    CLEANING_UP=true
    echo ""
    echo -e "${YELLOW}Shutting down all services...${NC}"
    for pid in "${PIDS[@]}"; do
        kill -0 "$pid" 2>/dev/null && kill -TERM "$pid" 2>/dev/null || true
    done
    sleep 2
    for pid in "${PIDS[@]}"; do
        kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM
trap 'if ! $CLEANING_UP; then cleanup; fi' EXIT

# ── Start Backend ─────────────────────────────────────────────────────────────
echo -e "${GREEN}[1/3] Starting Backend (port 3000)...${NC}"
(cd "$ROOT_DIR/backend" && exec node server.js 2>&1 | sed 's/^/  [Backend] /') &
PIDS+=($!)

echo -n "  Waiting for backend"
for i in {1..12}; do
    curl -s "http://localhost:3000/api/ping" >/dev/null 2>&1 && break
    echo -n "." && sleep 1
done
echo ""
if curl -s "http://localhost:3000/api/ping" >/dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Backend ready → http://${LAN_IP}:3000${NC}"
else
    echo -e "  ${YELLOW}⚠ Backend still starting (MongoDB can be slow on first connect)${NC}"
fi

# ── Start Dashboard ───────────────────────────────────────────────────────────
echo -e "${GREEN}[2/3] Starting Dashboard (port 3001)...${NC}"
(cd "$ROOT_DIR/dashboard" && PORT=3001 BROWSER=none exec npm start 2>&1 | sed 's/^/  [Dashboard] /') &
PIDS+=($!)
echo -e "  ${GREEN}✓ Dashboard starting → http://localhost:3001${NC}"
echo -e "  ${YELLOW}  Password: aurahealth2024${NC}"

# ── Print summary + start Expo ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  All services launching — AuraHealth MVP Demo!${NC}"
echo ""
echo -e "  ${CYAN}Backend:   ${NC}http://${LAN_IP}:3000   (REST API)"
echo -e "  ${CYAN}Dashboard: ${NC}http://localhost:3001   (NGO analytics)"
echo -e "  ${CYAN}Mobile:    ${NC}Scan QR below with Expo Go"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""

cd "$ROOT_DIR" && npx expo start --lan --clear &
PIDS+=($!)

wait
