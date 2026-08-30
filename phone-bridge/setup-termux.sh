#!/data/data/com.termux/files/usr/bin/bash
# ============================================================================
#  Termux one-paste installer for the FitPulse phone-bridge agent.
#  Chalane ka tarika (Termux me):
#     FP_TOKEN=github_pat_XXXX bash -c "$(curl -sL https://raw.githubusercontent.com/sanjanameena0710-arch/FitPulse/arena/01a05293-fitpulse/phone-bridge/setup-termux.sh)"
#  (curl ke bina: file ko Termux me paste karke  bash setup-termux.sh)
# ============================================================================
set -uo pipefail

REPO="${FP_REPO:-sanjanameena0710-arch/FitPulse}"
BRANCH="${BRANCH:-arena/01a05293-fitpulse}"
FP_HOME="${FP_HOME:-$HOME/phone-bridge}"

if [ -z "${FP_TOKEN:-}" ]; then
  cat <<'EOF'
Token chahiye. Fine-grained PAT banao (read+write on contents only):
  github.com -> Settings -> Developer settings -> Fine-grained tokens -> Generate new token
  Resource owner : <aapka user>
  Repository access: Only select repositories -> FitPulse
  Permissions    : Contents = Read and write      (aur kuch nahi!)
Phir:
  FP_TOKEN=github_pat_....  bash setup-termux.sh
EOF
  exit 1
fi

echo "==> packages install (git, termux-api, curl, jq)"
pkg install -y git curl jq termux-api >/dev/null 2>&1 || pkg upgrade -y >/dev/null 2>&1

mkdir -p "$FP_HOME"
cat > "$FP_HOME/env.sh" <<EOF
# phone-bridge config (auto-generated $(date '+%F %T'))
# ⚠️ is file me aapka GitHub token hai -> chmod 600. Kisi ko share mat karna.
export FP_REPO_URL="https://arena-phone:${FP_TOKEN}@github.com/${REPO}.git"
export BRANCH="${BRANCH}"
export BRANCH_CODE="${BRANCH}"
export BRANCH_OUT="phone-outbox"
export INTERVAL=25
export IDLE_EXIT_MIN=45
export MIN_BATTERY=10
export FP_LABEL="\$(getprop ro.product.model 2>/dev/null || echo phone)"
EOF
chmod 600 "$FP_HOME/env.sh"

BRIDGE_DIR="$FP_HOME/bridge"
if [ -d "$BRIDGE_DIR/.git" ]; then
  git -C "$BRIDGE_DIR" fetch -q origin "$BRANCH" && git -C "$BRIDGE_DIR" checkout -q FETCH_HEAD
else
  git clone -q --branch "$BRANCH" --single-branch "https://arena-phone:${FP_TOKEN}@github.com/${REPO}.git" "$BRIDGE_DIR"
fi
# repo ke phone-bridge folder ko $FP_HOME/bridge me rakh diya; agent wahi se chalega
ln -sfn "$BRIDGE_DIR/phone-bridge/agent.sh" "$FP_HOME/agent.sh" 2>/dev/null

cat > "$FP_HOME/start.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
source "$HOME/phone-bridge/env.sh"
export FP_HOME="$HOME/phone-bridge"
export FP_BRIDGE_DIR="$HOME/phone-bridge/bridge/phone-bridge"
termux-wake-lock 2>/dev/null
echo "Ctrl-C = band karna.  Dusre terminal se:  touch ~/phone-bridge/.stop"
cd "$FP_BRIDGE_DIR" && exec bash ./agent.sh "$@"
EOF
chmod +x "$FP_HOME/start.sh"

cat > "$FP_HOME/stop.sh"  <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
touch "$HOME/phone-bridge/.stop"; pkill -f "agent.sh" 2>/dev/null
termux-wake-unlock 2>/dev/null
echo "stopped."
EOF
chmod +x "$FP_HOME/stop.sh"

cat > "$FP_HOME/status.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
pgrep -f "agent.sh" >/dev/null && echo "RUNNING (pid $(pgrep -f agent.sh | tr '\n' ' '))" || echo "NOT running"
echo "--- last log ---"; tail -12 "$HOME/phone-bridge/agent.log" 2>/dev/null
EOF
chmod +x "$FP_HOME/status.sh"

echo
echo "==> done. Ab:"
echo "   1) 'Termux:API' app bhi install karo (Play Store / GitHub) + ek baar kholo"
echo "      phone settings me Permissions: SMS/Location/Camera/Notifications -> allow"
echo "   2) agent start:   bash ~/phone-bridge/start.sh"
echo "   3) dusre terminal se:  bash ~/phone-bridge/status.sh"
echo "   band karne ke liye:    bash ~/phone-bridge/stop.sh"
echo
echo "NOTE: phone par screen off ho to Android background kill kar sakta hai."
echo "      Settings -> Battery -> Termux ko 'No restriction' + notification access allow karo."
