#!/data/data/com.termux/files/usr/bin/bash
# ============================================================================
#  FitPulse phone-bridge AGENT  (Termux side)
#  Aapka phone = Arena agent ka remote shell.
#
#  Loop:
#    1. code branch (arena/01a05293-fitpulse) se  phone-bridge/inbox/*.sh  uthao
#    2. har naya job ek baar chalao (confirm puch ke; --yes = unattended)
#    3. output ko result branch (phone-outbox) ke  phone-bridge/outbox/<id>.md  me push karo
#
#  Safety rails:
#    - dangerous patterns (rm -rf /, mkfs, reboot, curl|sh, pm uninstall, settings put...) = REJECT
#    - ro__*.sh jobs sirf read-only allowlist se chalte hain
#    - kill switch : touch ~/phone-bridge/.stop
#    - IDLE_EXIT_MIN minute koi job nahi -> agent khud band (orphan daemon nahi rahega)
#    - battery < MIN_BATTERY% -> run nahi
#    - token/password jaisi strings output se auto-REDACT
#
#  Usage:
#    bash agent.sh              # foreground, har job se pehle puchega
#    bash agent.sh --yes        # bina puche (aap watch kar rahe ho tabhi use karo)
#    bash agent.sh --once       # ek cycle aur exit (cron / termux-job-scheduler ke liye)
# ============================================================================
set -uo pipefail

FP_HOME="${FP_HOME:-$HOME/phone-bridge}"
# Termux setup script yahan token/branch config deta hai
[ -f "$FP_HOME/env.sh" ] && . "$FP_HOME/env.sh"

# bridge clone ke andar se chal rahe ho to code/out dirs $FP_HOME me hi rakho
CODE_DIR="$FP_HOME/code"                 # inbox yahan aata hai
OUT_DIR="$FP_HOME/out"                   # results yahan se push hote hain
STATE_DIR="$FP_HOME/state"
DONE_LIST="$STATE_DIR/done.list"
LOG_FILE="$FP_HOME/agent.log"

BRANCH_CODE="${BRANCH_CODE:-arena/01a05293-fitpulse}"
BRANCH_OUT="${BRANCH_OUT:-phone-outbox}"
SUB_IN="${SUB_IN:-phone-bridge/inbox}"
SUB_OUT="${SUB_OUT:-phone-bridge/outbox}"

INTERVAL="${INTERVAL:-25}"
IDLE_EXIT_MIN="${IDLE_EXIT_MIN:-45}"
MAX_OUTPUT_BYTES="${MAX_OUTPUT_BYTES:-120000}"
JOB_TIMEOUT="${JOB_TIMEOUT:-90}"
MIN_BATTERY="${MIN_BATTERY:-10}"

CONFIRM=1
ONCE=0
for a in "$@"; do
  case "$a" in
    --yes)     CONFIRM=0 ;;
    --confirm) CONFIRM=1 ;;
    --once)    ONCE=1 ;;
    -h|--help) grep '^#  ' "$0" | head -30; exit 0 ;;
  esac
done

mkdir -p "$STATE_DIR/pending" "$STATE_DIR/logs"
[ -f "$DONE_LIST" ] || : > "$DONE_LIST"

log()  { printf '%s %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG_FILE"; }
have() { command -v "$1" >/dev/null 2>&1; }

# ------------------------------------------------------------------ safety ---
ALLOWED_RO="ls cat head tail wc sort uniq grep cut tr sed awk find date uptime free \
df du ps id whoami hostname uname env printenv getprop settings ip ifconfig ping jq \
echo printf true false sleep python python3 node npm npx git \
termux-battery-status termux-wifi-connectioninfo termux-wifi-scaninfo termux-sensor \
termux-location termux-clipboard-get termux-telephony-signal-strength termux-volume \
termux-fingerprint termux-camera-photo termux-contact-list termux-sms-list \
termux-music-list termux-torch termux-tts-speak termux-notification termux-share"

DENY='rm[[:space:]]+-[a-zA-Z]*[rf][a-zA-Z]*[[:space:]]+/|rm[[:space:]]+-rf[[:space:]]+(~|\$HOME|/|storage|/data)|mkfs|fdisk|dd[[:space:]]+if=|>[[:space:]]*/dev/(sd|block)|reboot|poweroff|shutdown|pm[[:space:]]+(disable|uninstall|clear)|am[[:space:]]+force-stop|settings[[:space:]]+put|svc[[:space:]]+power|curl[^|]*\|[[:space:]]*(ba|z|da)?sh|wget[^|]*\|[[:space:]]*(ba|z|da)?sh|chmod[[:space:]]+-R[[:space:]]+7|crontab[[:space:]]+-r'

redact() {
  sed -E \
    -e 's/(gh[pousr]_|github_pat_|xox[baprs]-|sk-|AIza|ya29\.)[A-Za-z0-9_.\-]{6,}/\1***REDACTED***/g' \
    -e 's/((pass(word|wd)?|secret|token|api[_-]?key|authorization|cookie)[\"'"'"']?[[:space:]]*[:=][[:space:]]*)[^[:space:]]{4,}/\1***REDACTED***/gI'
}

battery_level() {
  have termux-battery-status || return 0
  termux-battery-status 2>/dev/null | tr '\n' ' ' | sed -n 's/.*"level"[^0-9]*\([0-9]\{1,3\}\).*/\1/p'
}

device_info_md() {
  printf -- '- device : %s\n- android: %s (sdk %s)\n- time   : %s\n- battery: %s%%\n- termux-api: %s\n' \
    "$(getprop ro.product.model 2>/dev/null || echo ${FP_LABEL:-unknown-phone})" \
    "$(getprop ro.build.version.release 2>/dev/null || echo '?')" \
    "$(getprop ro.build.version.sdk 2>/dev/null || echo '?')" \
    "$(date '+%F %T %Z')" \
    "$(battery_level)" \
    "$(have termux-battery-status && echo present || echo MISSING)"
}

# -------------------------------------------------------------------- git ----
init_repos() {
  if [ ! -d "$CODE_DIR/.git" ]; then
    [ -n "${FP_REPO_URL:-}" ] || { log "FATAL: FP_REPO_URL nahi set (setup-termux.sh chalao)"; return 1; }
    log "code clone: $BRANCH_CODE"
    git clone -q --branch "$BRANCH_CODE" --single-branch "$FP_REPO_URL" "$CODE_DIR" || return 1
  fi
  if [ ! -d "$OUT_DIR/.git" ]; then
    [ -n "${FP_REPO_URL:-}" ] || return 1
    if git ls-remote --exit-code "$FP_REPO_URL" "$BRANCH_OUT" >/dev/null 2>&1; then
      log "out clone ($BRANCH_OUT)"
      git clone -q --branch "$BRANCH_OUT" --single-branch "$FP_REPO_URL" "$OUT_DIR" || return 1
    else
      log "result branch '$BRANCH_OUT' remote pe nahi -> naya bana rahe hain"
      mkdir -p "$OUT_DIR"
      git -C "$OUT_DIR" init -q 2>/dev/null
      git -C "$OUT_DIR" symbolic-ref HEAD "refs/heads/$BRANCH_OUT"
      git -C "$OUT_DIR" remote add origin "$FP_REPO_URL" 2>/dev/null
      printf '# phone-bridge outbox\n\nTermux agent ke results. Auto-created by agent.sh.\n' > "$OUT_DIR/README.md"
      mkdir -p "$OUT_DIR/$SUB_OUT"
      git -C "$OUT_DIR" add -A
      git -C "$OUT_DIR" -c user.name=phone-agent -c user.email=phone@fitpulse.local \
        commit -qm "chore: init $BRANCH_OUT"
      git -C "$OUT_DIR" push -q -u origin "HEAD:$BRANCH_OUT" \
        || log "WARN: $BRANCH_OUT push fail (token me Contents:write chahiye). Output local pe safe rahega."
    fi
  fi
  return 0
}

push_result() {
  local id="$1" i
  [ -d "$OUT_DIR/.git" ] || return 1
  git -C "$OUT_DIR" add -A >/dev/null 2>&1
  git -C "$OUT_DIR" diff --cached --quiet && return 0
  git -C "$OUT_DIR" -c user.name=phone-agent -c user.email=phone@fitpulse.local \
    commit -qm "result: $id" || return 1
  i=0
  while [ $i -lt 3 ]; do
    i=$((i+1))
    git -C "$OUT_DIR" push -q origin "HEAD:$BRANCH_OUT" && { log "pushed: $id"; return 0; }
    git -C "$OUT_DIR" fetch -q origin "$BRANCH_OUT" 2>/dev/null \
      && git -C "$OUT_DIR" rebase -q "origin/$BRANCH_OUT" 2>/dev/null
    sleep 2
  done
  log "WARN: push fail $id (local file: $OUT_DIR/$SUB_OUT/$id.md)"
  return 1
}

# -------------------------------------------------------------- policy + run -
block_note() { # $1=id $2=reason $3=evidence
  local id="$1" reason="$2" ev="$3"
  mkdir -p "$OUT_DIR/$SUB_OUT"
  {
    printf '# %s\n\n' "$id"
    printf -- '- status: **%s**\n- device: %s\n- time: %s\n\n' "$reason" \
      "$(getprop ro.product.model 2>/dev/null || echo phone)" "$(date '+%F %T')"
    printf '```text\n%s\n```\n' "$ev"
  } > "$OUT_DIR/$SUB_OUT/$id.md"
  push_result "$id" || true
}

first_words() { # first word of every command / pipeline segment in a script
  sed -e 's/#.*//' "$1" | tr ';|&()' '\n' | sed -e 's/^[[:space:]]*//' \
    | awk 'NF' | cut -d' ' -f1 \
    | sed -e 's/^[A-Za-z_][A-Za-z0-9_]*=//' -e 's|.*/||' -e 's/[<>"'"'"'`$]//g' \
    | grep -vE '^[[:space:]]*$' | sort -u
}

policy_check() { # 0 = allowed, 1 = blocked
  local id="$1" script="$2" word bad=""
  if grep -Eq "$DENY" "$script"; then
    block_note "$id" "BLOCKED: dangerous-pattern" "$(grep -En "$DENY" "$script" | head -5)"
    log "BLOCKED $id (dangerous pattern)"
    return 1
  fi
  case "$id" in
    ro__*)
      for word in $(first_words "$script"); do
        case "$word" in
          if|then|fi|else|elif|for|while|do|done|local|export|read|set|return|case|esac|in|!|\{|\}|\[|\]|'[['|']]') continue ;;
        esac
        [ "${#word}" -le 40 ] || { bad="$bad $word(len)"; continue; }
        printf '%s\n' "$ALLOWED_RO" | tr ' ' '\n' | grep -qxF -- "$word" || bad="$bad $word"
      done
      if [ -n "${bad// /}" ]; then
        block_note "$id" "BLOCKED: ro__ allowlist" "not allowed:$bad"
        log "BLOCKED $id (allowlist:$bad)"
        return 1
      fi
      ;;
  esac
  return 0
}

run_job() { # $1=id  $2=script
  local id="$1" script="$2" tmo need raw res code bytes
  raw="$STATE_DIR/logs/$id.raw"; res="$STATE_DIR/logs/$id.out"

  need="$(sed -n 's/^#[[:space:]]*@needs:[[:space:]]*//p' "$script" | head -1 | tr -d ' \r')"
  if [ -n "$need" ] && ! have "$need"; then
    block_note "$id" "SKIPPED: needs $need" "Termux:API command '$need' phone pe nahi hai.
Fix:  pkg install termux-api
      aur Play Store/GitHub se 'Termux:API' app install + open karo, phir App info > Permissions."
    log "SKIP $id (needs $need)"
    return 0
  fi
  tmo="$(sed -n 's/^#[[:space:]]*@timeout:[[:space:]]*//p' "$script" | head -1 | tr -d ' \r')"
  case "$tmo" in ''|*[!0-9]*) tmo="$JOB_TIMEOUT" ;; esac

  log "RUN $id (timeout ${tmo}s)"
  if have timeout; then
    ( cd "$FP_HOME" && timeout "$tmo" bash "$script" ) > "$raw" 2>&1; code=$?
  else
    ( cd "$FP_HOME" && bash "$script" ) > "$raw" 2>&1; code=$?
  fi
  [ "$code" = 124 ] && printf '\n[TIMEOUT after %ss]\n' "$tmo" >> "$raw"
  bytes=$(wc -c < "$raw")
  head -c "$MAX_OUTPUT_BYTES" "$raw" | redact > "$res"
  [ "$bytes" -gt "$MAX_OUTPUT_BYTES" ] 2>/dev/null \
    && printf '\n[...truncated, %s bytes total...]\n' "$bytes" >> "$res"

  mkdir -p "$OUT_DIR/$SUB_OUT"
  {
    printf '# %s\n\n' "$id"
    printf -- '- exit: **%s**\n- finished: %s\n- output: %s bytes\n\n' \
      "$code" "$(date '+%F %T')" "$bytes"
    device_info_md
    printf '\n## output\n\n```text\n'; cat "$res"; printf '\n```\n'
    if [ "${FP_INCLUDE_SCRIPT:-1}" = "1" ]; then
      printf '\n## script\n\n```bash\n'; cat "$script"; printf '\n```\n'
    fi
  } > "$OUT_DIR/$SUB_OUT/$id.md"
  push_result "$id" || true
  log "done $id exit=$code"
}

fetch_pending() {
  git -C "$CODE_DIR" fetch -q origin "$BRANCH_CODE" || { log "fetch fail (network/token)"; return 1; }
  git -C "$CODE_DIR" checkout -q FETCH_HEAD 2>/dev/null
  : > "$STATE_DIR/pending.list"
  local f id
  for f in $(git -C "$CODE_DIR" ls-tree -r --name-only FETCH_HEAD -- "$SUB_IN" 2>/dev/null | grep -E '\.sh$'); do
    id="$(basename "$f" .sh)"
    grep -qxF -- "$id" "$DONE_LIST" 2>/dev/null && continue
    git -C "$CODE_DIR" show "FETCH_HEAD:$f" | tr -d '\r' > "$STATE_DIR/pending/$id.sh"
    printf '%s\n' "$id" >> "$STATE_DIR/pending.list"
  done
  git -C "$OUT_DIR" pull --rebase -q origin "$BRANCH_OUT" >/dev/null 2>&1 || true
  return 0
}

ask() { # 0 = run, 1 = skip
  local id="$1" ans
  [ "$CONFIRM" = 1 ] || return 0
  if [ ! -t 0 ]; then
    log "REFUSED: confirm mode me tty chahiye. Bina-puche chalane ke liye --yes lagao."
    block_note "$id" "REFUSED: no-tty-confirm" "Agent interactive confirm maang raha tha par stdin terminal nahi hai.
Foreground me:  bash agent.sh
Unattended me:  bash agent.sh --yes"
    return 1
  fi
  printf '\n===== job: %s =====\n' "$id"
  cat "$STATE_DIR/pending/$id.sh"
  printf '=========================\nchalayein? [y/N/a=always] '
  read -r ans || ans=""
  case "$ans" in
    y|Y|yes) return 0 ;;
    a|A)     CONFIRM=0; return 0 ;;
    *)       return 1 ;;
  esac
}

# --------------------------------------------------------------------- main --
main() {
  have git || { log "FATAL: git nahi -> pkg install git"; exit 1; }
  init_repos || exit 1
  have termux-battery-status || log "NOTE: Termux:API missing -> sirf normal shell commands chalenge"

  log "agent up | code=$BRANCH_CODE out=$BRANCH_OUT poll=${INTERVAL}s confirm=$CONFIRM pid=$$"
  last_job="$(date +%s)"
  while :; do
    if [ -f "$FP_HOME/.stop" ]; then rm -f "$FP_HOME/.stop"; log ".stop mila -> exit"; break; fi
    now="$(date +%s)"
    if [ "$ONCE" = 0 ] && [ "$IDLE_EXIT_MIN" != 0 ] \
       && [ $(( now - last_job )) -ge $(( IDLE_EXIT_MIN * 60 )) ]; then
      log "$IDLE_EXIT_MIN min idle -> auto-exit (dobara: bash agent.sh)"; break
    fi

    BAT="$(battery_level)"
    if [ -n "${BAT:-}" ] && [ "$BAT" != 0 ] && [ "$BAT" -lt "$MIN_BATTERY" ] 2>/dev/null; then
      log "battery ${BAT}% < ${MIN_BATTERY}% -> skip cycle"; 
    elif fetch_pending; then
      if [ -s "$STATE_DIR/pending.list" ]; then
        while IFS= read -r id; do
          [ -n "$id" ] || continue
          [ -s "$STATE_DIR/pending/$id.sh" ] || { printf '%s\n' "$id" >> "$DONE_LIST"; continue; }
          if ask "$id"; then
            if policy_check "$id" "$STATE_DIR/pending/$id.sh"; then
              run_job "$id" "$STATE_DIR/pending/$id.sh"
            fi
          else
            block_note "$id" "SKIPPED: user-said-no" "aapne N dabaya"
          fi
          printf '%s\n' "$id" >> "$DONE_LIST"
          last_job="$(date +%s)"
        done < "$STATE_DIR/pending.list"
      else
        log "cycle: koi naya job nahi"
      fi
    fi

    [ "$ONCE" = 1 ] && break
    sleep "$INTERVAL"
  done
  log "agent down"
}

main
