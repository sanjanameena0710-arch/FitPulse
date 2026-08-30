#!/usr/bin/env bash
# ============================================================================
#  fp.sh — sandbox side of the phone-bridge (main yahan se use karunga)
#  Usage:
#    tools/fp.sh new <name> [--ro] [--timeout 60] [--needs termux-sensor]  < script.sh
#    tools/fp.sh list            # inbox me pending jobs
#    tools/fp.sh results [n]     # phone se aaye latest n results (default 3)
#    tools/fp.sh watch           # fetch + print sabhi naye results
# ============================================================================
set -uo pipefail
SELF="$(cd "$(dirname "$0")" 2>/dev/null && pwd)" || exit 1
ROOT="$(cd "$SELF/../.." 2>/dev/null && pwd)" || exit 1   # repo root (phone-bridge/tools -> up 2)
cd "$ROOT" || exit 1

BRANCH="${BRANCH_CODE:-arena/01a05293-fitpulse}"
BRANCH_OUT="${BRANCH_OUT:-phone-outbox}"
INBOX="phone-bridge/inbox"
OUTBOX="phone-bridge/outbox"

die() { echo "fp: $*" >&2; exit 1; }

git_id() { # identity fallback: sandbox/termux me user.email unset ho to commit fail na ho
  if git config user.email >/dev/null 2>&1 && git config user.name >/dev/null 2>&1; then
    git "$@"
  else
    git -c user.name="${GIT_AUTHOR_NAME:-arena-agent}" -c user.email="${GIT_AUTHOR_EMAIL:-agent@arena.local}" "$@"
  fi
}

commit_and_push() { # $1 = message
  git add -A "$INBOX" >/dev/null 2>&1
  git diff --cached --quiet && die "kuch naya nahi"
  git_id commit -qm "$1" || die "commit fail"
  if [ "${FP_NO_PUSH:-0}" = 1 ]; then echo "(push skipped: FP_NO_PUSH=1)"; return 0; fi
  git push -q origin "HEAD:$BRANCH" 2>&1 | tail -3
  echo "pushed -> $BRANCH  (phone <=25s me utha lega)"
}

cmd="${1:-help}"; shift || true
case "$cmd" in
  new)
    name="${1:-task}"; shift || true
    ro=0; tmo=""; need=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --ro) ro=1 ;;
        --timeout) tmo="$2"; shift ;;
        --needs) need="$2"; shift ;;
        *) die "unknown flag $1" ;;
      esac
      shift
    done
    case "$name" in
      *[!a-zA-Z0-9._-]*) die "name me sirf a-z A-Z 0-9 . _ - allowed" ;;
    esac
    id="$(date +%Y%m%d-%H%M%S)-${name}"
    [ "$ro" = 1 ] && id="ro__${id}"
    file="$INBOX/$id.sh"
    {
      printf '# job: %s\n# created: %s by arena agent\n' "$id" "$(date '+%F %T %Z')"
      [ -n "$tmo" ]  && printf '# @timeout: %s\n' "$tmo"
      [ -n "$need" ] && printf '# @needs: %s\n' "$need"
      cat
    } > "$file"
    chmod +x "$file"
    echo "queued: $file"
    commit_and_push "phone-bridge: job $id"
    ;;

  list)
    ls -1 "$INBOX" 2>/dev/null | grep -E '\.sh$' | sed 's/^/  /' || echo "  (inbox khali)"
    ;;

  results)
    n="${1:-3}"
    git fetch -q origin "$BRANCH_OUT" 2>/dev/null || die "'$BRANCH_OUT' branch nahi mili (phone ne abhi tak push nahi kiya?)"
    for f in $(git ls-tree -r --name-only FETCH_HEAD -- "$OUTBOX" 2>/dev/null | grep '\.md$' | tail -n "$n"); do
      echo "════════════════════════════════════════ $f"
      git show "FETCH_HEAD:$f"
      echo
    done
    ;;

  watch)
    for i in $(seq 1 40); do
      if git fetch -q origin "$BRANCH_OUT" 2>/dev/null; then
        echo "✅ phone ne results push kiye:"
        git ls-tree -r --name-only FETCH_HEAD -- "$OUTBOX" | tail -5
        exit 0
      fi
      sleep 15
    done
    die "5 min me koi result nahi aaya (phone pe agent chal raha hai? network? token write perms?)"
    ;;

  *)
    sed -n '2,12p' "$0"
    ;;
esac
