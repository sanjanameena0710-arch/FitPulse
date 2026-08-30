# FitPulse · phone-bridge

Aapke **phone ka Termux** ko Arena agent ke liye ek **remote shell** bana dene wala chhota bridge.
Koi server, koi port-forward, koi tunnel nahi — sirf **GitHub ek message bus** hai, kyunki
sandbox se internet allowlisted hai (sirf github/PyPI) aur phone kahin se bhi pull kar sakta hai.

```
Arena agent (sandbox)                    GitHub repo                    Aapka phone (Termux)
----------------------   git push    -----------------------  git pull  --------------------
tools/fp.sh new ...   ->  branch: arena/01a05293-fitpulse  ->  agent.sh inbox/*.sh uthata hai
                                                             <-         phone-bridge/outbox/<id>.md
tools/fp.sh results   <-  branch: phone-outbox             <-         (termux-api commands chale jaate hain)
```

Round-trip: ~25-30 second (agent ka poll interval) + aapka turn. Ye **async** hai —
main aapke phone ka live terminal nahi dekh sakta, bas job daal sakta hoon aur output padh sakta hoon.

---

## 1. Termux side — setup (5 minute)

### a) Packages + apps
```bash
pkg install -y git termux-api jq
```
**Termux:API app** bhi install karo (Play Store ya GitHub releases se) aur ek baar khol do.
Iske baad: Android Settings → Apps → Termux:API → Permissions → **SMS / Location / Camera / Notifications allow**.
Termux app ke liye bhi wahi karo (jo permissions chahiye wohi).

### b) GitHub token (scope minimal rakho!)
github.com → Settings → Developer settings → **Fine-grained tokens** → Generate new token
- Repository access: *Only select repositories* → `FitPulse`
- Permissions: **Contents = Read and write** — bas yahi, kuch aur nahi

Token ka ek line note kar lo (`github_pat_...`). Repo **private** hona chahiye.

### c) Installer
Repo ko `~/phone-bridge/bridge` me clone karke config bana dega:
```bash
cd ~
git clone --branch arena/01a05293-fitpulse https://github.com/sanjanameena0710-arch/FitPulse.git phone-bridge-clone
FP_TOKEN=github_pat_YOUR_TOKEN bash phone-bridge-clone/phone-bridge/setup-termux.sh
```

### d) Agent chalu
```bash
bash ~/phone-bridge/start.sh          # foreground — har job se pehle aapse puchega
```
Doosre Termux terminal se (`termux-open` ya notification se switch nahi kar sakte to sidebar → "New session"):
```bash
bash ~/phone-bridge/status.sh         # chal raha hai? last log lines
bash ~/phone-bridge/stop.sh           # turant band (kill switch)
```

### e) Background me rakhna (optional)
Android background processes ko maarta hai. Do cheezein karo:
1. Settings → Battery → Termux → **No restrictions** + adaptive battery se exclude
2. `start.sh` already `termux-wake-lock` leta hai; notification permission de do taaki session mara na rahe

Har 45 minute koi job na aaya to agent **khud band** ho jata hai (`IDLE_EXIT_MIN`) — phone par
koi orphan daemon nahi bachta. Dobara: `bash ~/phone-bridge/start.sh`.

---

## 2. Kya-kya karwa sakte ho (Termux:API cheat-sheet)

| Kaam | Command (job ke andar) |
|---|---|
| Battery %, charging status | `termux-battery-status` |
| Aaj ka step count / heart rate | `termux-sensor -s "Step Detector"`, `-s "Heart Rate"` |
| GPS location | `termux-location -p gps -r 1` |
| WiFi info | `termux-wifi-connectioninfo`, `termux-wifi-scaninfo` |
| Clipboard padhna | `termux-clipboard-get` |
| Notification bhejna (reminder) | `termux-notification -t "FitPulse" -c "Paani piyo! 8 glass baaki"` |
| TTS se bulwao | `termux-tts-speak "Workout ka time ho gaya"` |
| Camera se progress photo | `termux-camera-photo /sdcard/Download/fitpulse-progress.jpg` |
| Flashlight / torch | `termux-torch on` |
| SMS inbox padhna (OTP auto-fill testing) | `termux-sms-list -l 3` |
| Contacts count | `termux-contact-list` |
| Vibrate | `termux-vibrate -d 500` |

FitPulse ke features se direct jod: `progress photos` (camera → app me upload),
`water reminder` (notification), `streak` (daily cron job jo `day log` karta hai),
`workout timer` (vibrate + TTS), `location` (outdoor run log).

---

## 3. Arena side — job kaise banta hai

Main (ya aap) repo me ek file daalte hain:
```bash
phone-bridge/tools/fp.sh new battery-check --ro --needs termux-battery-status <<'SH'
termux-battery-status
SH

phone-bridge/tools/fp.sh list        # pending jobs
phone-bridge/tools/fp.sh results 3   # phone se aaye outputs
```
- `--ro` → `ro__` prefix: sirf read-only allowlist ke commands chalkenge
- `--timeout 60` → job timeout
- `--needs <cmd>` → wo command na ho to job skip + reason wapas aayega

---

## 4. Safety rules (inhe todna = bridge ka maqsad hi khatam)

1. **Repo private rahe.** Jiske paas repo ka write access hai, uske paas *aapke phone pe code chalane*
   ka adhikaar hai. Public repo = sabka shell access.
2. Token ka scope sirf `Contents: read/write`, repo sirf `FitPulse`. `delete_repo`, `admin`, `user` mat do.
3. Pehli baar **hamesha `start.sh` bina `--yes` ke** chalao — har job dikhayega, aap `y` dabao.
   `--yes` unattended mode sirf tab jab aap samajh rahe ho ki kya chalkayega.
4. Agent **dangerous patterns khud block** karta hai: `rm -rf /`, `mkfs`, `dd of=`, `reboot`,
   `pm uninstall/disable`, `settings put`, `curl ... | sh`, `chmod -R 7...`.
   Allowlist ek **guardrail** hai, security boundary nahi — isliye confirm mode default ON hai.
5. Kill switch: `touch ~/phone-bridge/.stop` (agent agle cycle me exit). Ya `bash ~/phone-bridge/stop.sh`.
6. Output bhejne se pehle agent `ghp_...` / `github_pat_...` / `password=...` jaisi strings
   **auto-redact** karta hai. Phir bhi job me token print karne wali command mat daalo.
7. Phone ka data repo me jata hai (`phone-bridge/outbox/`). Location/SMS/camera wale results
   private repo me bhi sensitive hain — kaam ke baad `git rm` karke push kar dena, ya branch delete kar dena.
8. Session band = meri sandbox mar jayegi. Phone ka daemon khud 45 min idle pe exit ho jayega,
   lekin repo me purane results para sakte hain — naya session = naya poll, bas `start.sh` chalu karo.

---

## 5. Troubleshooting

| Lakshan | Kaaran / fix |
|---|---|
| `fetch fail (network/token)` | Token expire / galat scope. Naya fine-grained token bana ke `setup-termux.sh` dobara chalao |
| `WARN: push fail` | Token me `Contents: write` nahi. Sirf read diya tha |
| Job chala hi nahi | `bash ~/phone-bridge/status.sh` — agent zinda hai? screen off karke 10 min tak charge pe rakho |
| `SKIPPED: needs termux-...` | `pkg install termux-api` + Termux:API **app** install nahi hai |
| `error: code 247` / command stuck | Permission prompt pending — Termux:API app khol ke ek baar manual challenge test karo: `termux-dialog` |
| `BLOCKED: dangerous-pattern` | Maine (ya aapne) kuch aisa likh diya jo safety list me hai — script edit karo |
| Agent khud band | 45 min idle ya battery <10% — `IDLE_EXIT_MIN=0 bash ~/phone-bridge/start.sh` (recommended nahi) |

---

## Files

```
phone-bridge/
├── agent.sh              # Termux daemon (pull → run → push)
├── setup-termux.sh        # one-shot installer (env.sh + start/stop/status banata hai)
├── inbox/                # main yahan job dalta hoon (agent uthata hai)
├── outbox/               # (phone se aaye results — sirf phone-outbox branch me)
└── tools/fp.sh           # sandbox-side CLI: new / list / results / watch
```
