// FitPulse — main app logic
const App = {
  state: {
    screen: "home",
    authMode: "login",
    user: null,
    activeWorkout: null,
    cameraSession: null,
    selectedPhotos: [],
  },

  $app: document.getElementById("app"),

  init() {
    this.state.user = DB.currentUser();
    this.render();
  },

  toast(msg, type = "success") {
    const t = document.createElement("div");
    t.className = "toast " + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2000);
    setTimeout(() => t.remove(), 2400);
  },

  go(screen) {
    this.state.screen = screen;
    this.render();
    window.scrollTo(0, 0);
  },

  render() {
    if (!this.state.user) { this.renderAuth(); return; }
    let content = "";
    switch (this.state.screen) {
      case "home": content = this.renderHome(); break;
      case "workout": content = this.renderWorkoutList(); break;
      case "progress": content = this.renderProgress(); break;
      case "profile": content = this.renderProfile(); break;
      case "achievements": content = this.renderAchievements(); break;
      case "photos": content = this.renderPhotos(); break;
      case "active": content = this.renderActiveWorkout(); break;
      case "camera": content = this.renderCamera(); break;
      default: content = this.renderHome();
    }
    const showNav = ["home", "workout", "progress", "profile"].includes(this.state.screen);
    this.$app.innerHTML = content + (showNav ? this.renderBottomNav() : "");
    this.bind();
  },

  // ============ AUTH ============
  renderAuth() {
    const isLogin = this.state.authMode === "login";
    this.$app.innerHTML = `
      <div class="auth-bg"></div>
      <div class="auth-screen">
        <div class="logo-wrap">
          <div class="logo">⚡</div>
          <div class="logo-name">FitPulse</div>
          <div class="logo-tag">Your premium fitness companion</div>
        </div>
        <div class="card auth-card">
          <h2 class="h2" style="margin-bottom:6px">${isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p class="muted" style="margin-bottom:18px">${isLogin ? "Sign in to continue your journey" : "Start your fitness journey today"}</p>
          <form id="auth-form" autocomplete="off">
            ${!isLogin ? `<div class="input"><span class="input-icon">👤</span><input type="text" name="name" placeholder="Full name" required></div>` : ""}
            <div class="input"><span class="input-icon">✉</span><input type="email" name="email" placeholder="Email address" required></div>
            <div class="input"><span class="input-icon">🔒</span><input type="password" name="password" placeholder="Password" required minlength="6"></div>
            <div id="auth-error" class="error-text" style="display:none"></div>
            <button type="submit" class="btn primary full" style="margin-top:8px">${isLogin ? "Sign In" : "Create Account"}</button>
          </form>
          <div class="auth-switch">
            ${isLogin ? "Don't have an account?" : "Already have an account?"}
            <a id="switch-auth">${isLogin ? "Sign up" : "Sign in"}</a>
          </div>
        </div>
        ${isLogin ? `
          <div class="demo-card">
            <div class="muted">Try demo account:</div>
            <code>demo@fitpulse.app</code> · <code>demo123</code>
            <div style="margin-top:8px"><button id="demo-fill" class="btn ghost sm">Use demo</button></div>
          </div>` : ""}
      </div>`;
    this.bind();
  },

  bind() {
    const f = document.getElementById("auth-form");
    if (f) f.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      try {
        if (this.state.authMode === "login") this.state.user = DB.login(fd.get("email"), fd.get("password"));
        else this.state.user = DB.register(fd.get("name"), fd.get("email"), fd.get("password"));
        this.state.screen = "home";
        this.render();
        this.toast("Welcome, " + this.state.user.name + "!");
      } catch (err) {
        const ed = document.getElementById("auth-error");
        ed.textContent = err.message; ed.style.display = "block";
      }
    };
    const sw = document.getElementById("switch-auth");
    if (sw) sw.onclick = () => { this.state.authMode = this.state.authMode === "login" ? "register" : "login"; this.renderAuth(); };
    const df = document.getElementById("demo-fill");
    if (df) df.onclick = () => {
      f.email.value = "demo@fitpulse.app";
      f.password.value = "demo123";
    };

    // Bottom nav
    document.querySelectorAll("[data-go]").forEach(el => el.onclick = () => this.go(el.dataset.go));
    document.querySelectorAll("[data-action]").forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); this.handleAction(el.dataset.action, el.dataset); };
    });
  },

  // ============ HOME ============
  renderHome() {
    const u = this.state.user;
    const stats = DB.getStats();
    const today = new Date().toISOString().split("T")[0];
    const water = DB.getWater(today);
    const recentWorkouts = DB.getWorkouts().slice(0, 3);
    const todayMin = DB.getWeekActivity().slice(-1)[0].minutes;

    return `
      <div class="screen">
        <div class="between">
          <div>
            <div class="greet">Good ${this.greeting()},</div>
            <div class="greet-name">${u.name.split(" ")[0]} 👋</div>
          </div>
          <div class="avatar" data-go="profile">${this.initials(u.name)}</div>
        </div>

        <div class="hero">
          <div class="hero-content">
            <div class="hero-label">Today's activity</div>
            <div class="hero-num">${todayMin}<span style="font-size:18px;margin-left:6px;opacity:.8">min</span></div>
            <div class="hero-foot">
              <div class="hero-stat"><strong>${stats.totalCaloriesBurned}</strong>Total cal</div>
              <div class="hero-stat"><strong>${stats.currentStreak}d</strong>Streak</div>
              <div class="hero-stat"><strong>${stats.totalWorkouts}</strong>Workouts</div>
            </div>
          </div>
        </div>

        <div class="water-card">
          <div class="water-row">
            <div>
              <div style="font-size:12px;opacity:.85;text-transform:uppercase;letter-spacing:.5px">Water Today</div>
              <div class="water-num">${water}<small> / 8 glasses</small></div>
            </div>
            <div style="font-size:42px">💧</div>
          </div>
          <div class="water-glasses">
            ${[1,2,3,4,5,6,7,8].map(n => `
              <div class="glass-btn ${n <= water ? "filled" : ""}" data-action="water" data-count="${n}">${n <= water ? "💧" : "○"}</div>
            `).join("")}
          </div>
        </div>

        <div class="section-head">
          <h3 class="h3" style="margin:0">Quick Stats</h3>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="icon-circle" style="background:rgba(108,99,255,.15);color:var(--primary)">🔥</div>
            <div class="stat-val">${stats.totalCaloriesBurned}</div>
            <div class="stat-lbl">Total calories burned</div>
          </div>
          <div class="stat-card">
            <div class="icon-circle" style="background:rgba(255,107,53,.15);color:var(--orange)">⏱</div>
            <div class="stat-val">${stats.totalMinutes}</div>
            <div class="stat-lbl">Total minutes</div>
          </div>
          <div class="stat-card">
            <div class="icon-circle" style="background:rgba(34,197,94,.15);color:var(--green)">🏆</div>
            <div class="stat-val">${stats.totalWorkouts}</div>
            <div class="stat-lbl">Workouts done</div>
          </div>
          <div class="stat-card">
            <div class="icon-circle" style="background:rgba(245,158,11,.15);color:var(--yellow)">⚡</div>
            <div class="stat-val">${stats.currentStreak}d</div>
            <div class="stat-lbl">Current streak</div>
          </div>
        </div>

        <div class="section-head">
          <h3 class="h3" style="margin:0">Recent Workouts</h3>
          <span class="see-all" data-go="workout">See all</span>
        </div>
        ${recentWorkouts.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">💪</div>
            <div class="empty-title">No workouts yet</div>
            <div class="empty-text">Start your first workout from the Workout tab.</div>
          </div>` :
          recentWorkouts.map(w => this.workoutCardCompact(w)).join("")
        }
      </div>`;
  },

  workoutCardCompact(w) {
    const cat = w.category || "strength";
    const icons = { strength: "💪", cardio: "🏃", flexibility: "🧘", hiit: "⚡" };
    const colors = { strength: "var(--primary)", cardio: "var(--green)", flexibility: "var(--primary2)", hiit: "var(--red)" };
    return `
      <div class="workout-card">
        <div class="workout-row">
          <div class="workout-icon" style="background:${colors[cat]}22;color:${colors[cat]}">${icons[cat] || "💪"}</div>
          <div style="flex:1">
            <div class="workout-name">${w.workoutName}</div>
            <div class="workout-meta">${w.duration} min · ${w.caloriesBurned} cal · ${this.timeAgo(w.completedAt)}</div>
          </div>
        </div>
      </div>`;
  },

  // ============ WORKOUT LIST ============
  renderWorkoutList() {
    const d = DB.read();
    const plans = d.workoutPlans || [];
    return `
      <div class="screen">
        <div class="between">
          <div><h2 class="h1">Workouts</h2><div class="muted" style="margin-top:4px">Choose a plan or create your own</div></div>
        </div>

        <div class="camera-banner" data-go="camera">
          <div class="camera-banner-icon">📷</div>
          <div style="flex:1">
            <h3>Camera Rep Counter</h3>
            <p>Use the live camera and confirm each rep as you train</p>
          </div>
          <div style="font-size:24px">→</div>
        </div>

        <button class="btn primary full" data-action="custom-workout" style="margin-bottom:20px">+ Start Custom Workout</button>

        <div class="section-head"><h3 class="h3" style="margin:0">Workout Plans</h3></div>
        ${plans.map(p => `
          <div class="workout-card" data-action="start-plan" data-plan="${p.id}">
            <div class="workout-row">
              <div class="workout-icon" style="background:${p.color}22;color:${p.color}">${p.icon}</div>
              <div style="flex:1">
                <div class="workout-name">${p.name}</div>
                <div class="workout-meta">${p.duration} min · ${p.level} · ${p.exercises.length} exercises</div>
              </div>
              <div style="font-size:18px;color:var(--muted)">›</div>
            </div>
          </div>`).join("")}
      </div>`;
  },

  // ============ ACTIVE WORKOUT ============
  renderActiveWorkout() {
    const w = this.state.activeWorkout;
    return `
      <div class="screen" style="min-height:100vh">
        <div class="between" style="margin-bottom:8px">
          <div class="camera-icon-btn" style="background:rgba(255,255,255,.1)" data-action="quit-workout">✕</div>
          <h3 class="h3" style="margin:0;flex:1;text-align:center">${w.name}</h3>
          <button class="btn green sm" data-action="finish-workout">Finish</button>
        </div>

        <div class="timer-circle" id="timer-circle">
          <div class="timer-num" id="timer-text">00:00</div>
          <div class="timer-lbl">elapsed</div>
        </div>

        <div class="col-3" style="margin:12px 0 16px">
          <div style="text-align:center"><div style="font-size:18px;font-weight:700" id="t-min">0</div><div class="muted" style="font-size:11px">Minutes</div></div>
          <div style="text-align:center"><div style="font-size:18px;font-weight:700" id="t-cal">0</div><div class="muted" style="font-size:11px">Calories</div></div>
          <div style="text-align:center"><div style="font-size:18px;font-weight:700" id="t-done">0/${w.exercises.length}</div><div class="muted" style="font-size:11px">Done</div></div>
        </div>

        <div class="row" style="justify-content:center;gap:18px;margin-bottom:20px">
          <button class="cam-control-btn" data-action="reset-timer">↺</button>
          <button class="cam-main-btn" id="play-btn" data-action="toggle-timer" style="background:linear-gradient(135deg,var(--primary),var(--primary2))">▶</button>
        </div>

        <h3 class="h3">Exercises</h3>
        ${w.exercises.map((ex, i) => `
          <div class="exercise-item ${ex.done ? "done" : ""}" data-action="toggle-ex" data-idx="${i}">
            <div class="ex-check">✓</div>
            <div style="flex:1">
              <div class="ex-name">${ex.name}</div>
              <div class="ex-meta-text">${ex.sets} sets × ${ex.reps} reps</div>
            </div>
          </div>`).join("")}
      </div>`;
  },

  startWorkout(planOrCustom) {
    const w = planOrCustom;
    this.state.activeWorkout = {
      name: w.name || "Custom Workout",
      category: w.category || "strength",
      exercises: (w.exercises || ["Push-ups", "Squats", "Plank", "Lunges"]).map(n => ({
        name: typeof n === "string" ? n : n.name,
        sets: 3, reps: 12, done: false,
      })),
      seconds: 0,
      running: true,
    };
    this.state.screen = "active";
    this.render();
    this.bindActiveWorkout();
  },

  bindActiveWorkout() {
    if (this._timerInt) { clearInterval(this._timerInt); this._timerInt = null; }
    const update = () => {
      const w = this.state.activeWorkout;
      const m = String(Math.floor(w.seconds / 60)).padStart(2, "0");
      const s = String(w.seconds % 60).padStart(2, "0");
      const text = document.getElementById("timer-text"); if (text) text.textContent = `${m}:${s}`;
      const tm = document.getElementById("t-min"); if (tm) tm.textContent = Math.ceil(w.seconds / 60);
      const tc = document.getElementById("t-cal"); if (tc) tc.textContent = Math.round(w.seconds / 60 * 8);
      const td = document.getElementById("t-done"); if (td) td.textContent = `${w.exercises.filter(e => e.done).length}/${w.exercises.length}`;
    };
    update();
    this._timerInt = setInterval(() => {
      const w = this.state.activeWorkout;
      if (w && w.running) { w.seconds++; update(); }
    }, 1000);
  },

  // ============ PROGRESS ============
  renderProgress() {
    const stats = DB.getStats();
    const week = DB.getWeekActivity();
    const goals = DB.getGoals();
    const maxMin = Math.max(...week.map(w => w.minutes), 60);
    const maxWater = Math.max(...week.map(w => w.water), 8);

    return `
      <div class="screen">
        <h2 class="h1">Progress</h2>
        <div class="muted" style="margin-top:4px">Track your journey</div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="icon-circle" style="background:rgba(108,99,255,.15);color:var(--primary)">🏆</div>
            <div class="stat-val">${stats.totalWorkouts}</div>
            <div class="stat-lbl">Total workouts</div>
          </div>
          <div class="stat-card">
            <div class="icon-circle" style="background:rgba(255,107,53,.15);color:var(--orange)">🔥</div>
            <div class="stat-val">${stats.totalCaloriesBurned}</div>
            <div class="stat-lbl">Total calories</div>
          </div>
        </div>

        <h3 class="h3" style="margin-top:8px">This Week — Activity</h3>
        <div class="card">
          <div class="chart">
            ${week.map(w => `
              <div class="chart-col">
                <div class="chart-bar" style="height:${(w.minutes / maxMin) * 100}%" title="${w.minutes} min"></div>
                <div class="chart-label">${w.day}</div>
              </div>`).join("")}
          </div>
          <div class="muted" style="text-align:center;margin-top:6px">Minutes per day</div>
        </div>

        <h3 class="h3" style="margin-top:20px">This Week — Water</h3>
        <div class="card">
          <div class="chart">
            ${week.map(w => `
              <div class="chart-col">
                <div class="chart-bar water" style="height:${(w.water / maxWater) * 100}%"></div>
                <div class="chart-label">${w.day}</div>
              </div>`).join("")}
          </div>
          <div class="muted" style="text-align:center;margin-top:6px">Glasses per day</div>
        </div>

        <div class="section-head" style="margin-top:20px">
          <h3 class="h3" style="margin:0">Goals</h3>
          <span class="see-all" data-action="add-goal">+ Add</span>
        </div>
        ${goals.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🎯</div>
            <div class="empty-title">No goals yet</div>
            <div class="empty-text">Set goals to track your progress.</div>
          </div>` :
          goals.map(g => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100));
            return `
              <div class="goal-card">
                <div class="goal-row">
                  <div class="goal-name">${g.title}</div>
                  <div class="goal-pct">${pct}%</div>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                <div class="muted" style="font-size:12px;margin-top:6px">${g.current} / ${g.target} ${g.unit}</div>
                <div style="margin-top:10px;display:flex;gap:6px">
                  <button class="btn ghost sm" data-action="goal-progress" data-id="${g.id}" data-delta="1">+1</button>
                  <button class="btn ghost sm" data-action="goal-progress" data-id="${g.id}" data-delta="-1">−1</button>
                  <button class="btn ghost sm" data-action="goal-delete" data-id="${g.id}" style="margin-left:auto;color:var(--red)">Delete</button>
                </div>
              </div>`;
          }).join("")
        }
      </div>`;
  },

  // ============ PROFILE ============
  renderProfile() {
    const u = this.state.user;
    const stats = DB.getStats();
    const ach = DB.getAchievements();
    return `
      <div class="screen">
        <div class="between"><h2 class="h1">Profile</h2></div>

        <div class="profile-hero">
          <div class="profile-avatar">${this.initials(u.name)}</div>
          <div class="profile-name">${u.name}</div>
          <div class="profile-email">${u.email}</div>
        </div>

        <div class="stats-grid">
          ${[
            { lbl: "Workouts", val: stats.totalWorkouts },
            { lbl: "Streak", val: stats.currentStreak + "d" },
            { lbl: "Best", val: stats.longestStreak + "d" },
            { lbl: "Min", val: stats.totalMinutes },
          ].map(s => `<div class="stat-card" style="text-align:center"><div class="stat-val">${s.val}</div><div class="stat-lbl">${s.lbl}</div></div>`).join("")}
        </div>

        <h3 class="h3" style="margin-top:16px">Body Stats</h3>
        <div class="body-card">
          <div class="body-item"><div class="body-val">${u.weight ? u.weight + " kg" : "—"}</div><div class="body-lbl">Weight</div></div>
          <div class="body-item"><div class="body-val">${u.height ? u.height + " cm" : "—"}</div><div class="body-lbl">Height</div></div>
          <div class="body-item"><div class="body-val">${stats.bmi || "—"}</div><div class="body-lbl">BMI</div></div>
          <div class="body-item"><div class="body-val" style="font-size:12px">${stats.bmiCategory || "—"}</div><div class="body-lbl">Category</div></div>
        </div>
        <button class="btn ghost full" data-action="edit-profile" style="margin-top:10px">Edit Profile</button>

        <h3 class="h3" style="margin-top:20px">Quick Tools</h3>
        <div class="col-3">
          <div class="card tight" data-go="camera" style="text-align:center;cursor:pointer">
            <div style="font-size:28px">📷</div>
            <div style="font-size:12px;font-weight:600;margin-top:6px">Rep Counter</div>
          </div>
          <div class="card tight" data-go="photos" style="text-align:center;cursor:pointer">
            <div style="font-size:28px">📸</div>
            <div style="font-size:12px;font-weight:600;margin-top:6px">Progress</div>
          </div>
          <div class="card tight" data-go="achievements" style="text-align:center;cursor:pointer">
            <div style="font-size:28px">🏆</div>
            <div style="font-size:12px;font-weight:600;margin-top:6px">Awards (${ach.length})</div>
          </div>
        </div>

        <h3 class="h3" style="margin-top:20px">Account</h3>
        <div class="settings-list">
          <div class="settings-row" data-action="change-email">
            <div class="settings-icon">✉</div>
            <div class="settings-text"><div class="settings-label">Change Email</div><div class="settings-sub">${u.email}</div></div>
            <div style="color:var(--muted)">›</div>
          </div>
          <div class="settings-row" data-action="change-password">
            <div class="settings-icon">🔒</div>
            <div class="settings-text"><div class="settings-label">Change Password</div><div class="settings-sub">Update your password</div></div>
            <div style="color:var(--muted)">›</div>
          </div>
          <div class="settings-row" data-action="export">
            <div class="settings-icon">⬇</div>
            <div class="settings-text"><div class="settings-label">Export Data</div><div class="settings-sub">Backup as JSON file</div></div>
            <div style="color:var(--muted)">›</div>
          </div>
          <div class="settings-row" data-action="import">
            <div class="settings-icon">⬆</div>
            <div class="settings-text"><div class="settings-label">Import Data</div><div class="settings-sub">Restore from JSON</div></div>
            <div style="color:var(--muted)">›</div>
          </div>
          <div class="settings-row" data-action="reset">
            <div class="settings-icon" style="background:rgba(239,68,68,.15);color:var(--red)">⚠</div>
            <div class="settings-text"><div class="settings-label" style="color:var(--red)">Reset All Data</div><div class="settings-sub">Erase everything</div></div>
            <div style="color:var(--muted)">›</div>
          </div>
        </div>

        <button class="btn danger full" data-action="logout" style="margin-top:16px">Log Out</button>
        <div class="footer-cred">FitPulse v1.0 · 100% offline · Your data stays on this device</div>
      </div>`;
  },

  // ============ ACHIEVEMENTS ============
  renderAchievements() {
    const unlocked = DB.getAchievements();
    const titles = new Set(unlocked.map(a => a.title));
    const all = ALL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: titles.has(a.title) }));
    const groups = ["milestone","streak","burn","wellness","habit"];
    const grpLabels = { milestone:"Milestones", streak:"Streaks", burn:"Calorie Burners", wellness:"Wellness", habit:"Habits" };

    return `
      <div class="screen">
        <div class="between">
          <button class="btn ghost sm" data-go="profile">‹ Back</button>
          <h2 class="h2">Achievements</h2>
          <div style="width:60px"></div>
        </div>
        <div class="hero" style="background:linear-gradient(135deg,#F59E0B,#FF6B35);margin:14px 0 18px">
          <div class="hero-content">
            <div class="hero-num">${unlocked.length}<span style="font-size:18px;opacity:.85"> / ${ALL_ACHIEVEMENTS.length}</span></div>
            <div style="opacity:.85;margin-top:4px">Achievements unlocked</div>
            <div class="progress-bar" style="background:rgba(255,255,255,.25);margin-top:12px">
              <div class="progress-fill" style="background:#fff;width:${(unlocked.length / ALL_ACHIEVEMENTS.length) * 100}%"></div>
            </div>
          </div>
        </div>

        ${groups.map(g => {
          const items = all.filter(a => a.category === g);
          if (items.length === 0) return "";
          return `
            <h3 class="h3" style="margin-top:20px">${grpLabels[g]}</h3>
            <div class="ach-grid">
              ${items.map(a => `
                <div class="ach-card ${a.unlocked ? "unlocked" : "locked"}">
                  ${a.unlocked ? `<div class="ach-badge">✅</div>` : ""}
                  <div class="ach-icon">${a.icon}</div>
                  <div class="ach-title">${a.title}</div>
                  <div class="ach-desc">${a.description}</div>
                </div>`).join("")}
            </div>`;
        }).join("")}
      </div>`;
  },

  // ============ PHOTOS ============
  renderPhotos() {
    const photos = DB.getPhotos();
    const sel = this.state.selectedPhotos;
    const compared = sel.length === 2 ? sel.map(id => photos.find(p => p.id === id)).filter(Boolean) : [];

    return `
      <div class="screen">
        <div class="between">
          <button class="btn ghost sm" data-go="profile">‹ Back</button>
          <h2 class="h2">Progress Photos</h2>
          <button class="btn ghost sm" data-action="toggle-compare">⇆</button>
        </div>

        <p class="muted" style="margin:8px 0 16px">Track your transformation. Photos are stored privately on your device.</p>

        ${compared.length === 2 ? `
          <div class="compare-card">
            <h3 class="h3" style="margin:0 0 8px">Side by Side</h3>
            <div class="compare-row">
              ${compared.map(p => `
                <div class="compare-item">
                  <img src="${p.uri}" class="compare-img">
                  <div style="font-size:12px;font-weight:600">${new Date(p.takenAt).toLocaleDateString()}</div>
                  ${p.weight ? `<div class="muted" style="font-size:11px">${p.weight} kg</div>` : ""}
                </div>`).join("")}
            </div>
            ${compared[0].weight && compared[1].weight ? `
              <div style="text-align:center;padding:10px;background:rgba(255,255,255,.05);border-radius:10px;margin-top:10px;font-size:13px">
                Weight change: <strong>${(compared[1].weight - compared[0].weight).toFixed(1)} kg</strong>
              </div>` : ""}
          </div>
        ` : ""}

        <input type="file" id="photo-input" accept="image/*" style="display:none">

        ${photos.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📸</div>
            <div class="empty-title">No photos yet</div>
            <div class="empty-text">Tap the + button below to add your first progress photo.</div>
          </div>` : `
          <div class="photo-grid">
            ${photos.map(p => `
              <div class="photo-card ${sel.includes(p.id) ? "selected" : ""}" data-action="photo-tap" data-id="${p.id}">
                <img src="${p.uri}">
                <div class="photo-overlay">
                  <div class="photo-date">${new Date(p.takenAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</div>
                  ${p.weight ? `<div class="photo-weight">${p.weight} kg</div>` : ""}
                </div>
              </div>`).join("")}
          </div>
          <div class="muted" style="text-align:center;margin-top:14px;font-size:11px">Tap to ${this.state.compareMode ? "compare" : "select"} · Long-press to delete</div>
        `}

        <div class="fab" data-action="add-photo">+</div>
      </div>`;
  },

  // ============ CAMERA ============
  renderCamera() {
    const ex = (this.state.cameraSession && this.state.cameraSession.exercise) || EXERCISES[0];
    return `
      <div class="camera-screen">
        <div class="camera-feed">
          <video id="camera-video" autoplay playsinline muted></video>
          <div class="camera-overlay">
            <div class="camera-top">
              <div class="camera-icon-btn" data-action="close-camera">✕</div>
              <div class="camera-time">
                <span class="rec-dot" id="rec-dot" style="display:none"></span>
                <span id="cam-time">00:00</span>
              </div>
              <div class="camera-icon-btn" data-action="switch-camera">↻</div>
            </div>

            <div class="exercise-pill" data-action="pick-exercise">
              <div style="width:8px;height:8px;border-radius:50%;background:${ex.color}"></div>
              <span id="ex-name-pill">${ex.name}</span>
            </div>

            <div class="detection-box">
              <div class="detection-frame">
                <div class="corner c-tl" style="border-color:${ex.color}"></div>
                <div class="corner c-tr" style="border-color:${ex.color}"></div>
                <div class="corner c-bl" style="border-color:${ex.color}"></div>
                <div class="corner c-br" style="border-color:${ex.color}"></div>
              </div>
            </div>

            <div></div>
          </div>
        </div>

        <div class="camera-bottom">
          <div class="cam-stats">
            <div class="cam-stat"><div class="cam-stat-val" id="cam-reps">0</div><div class="cam-stat-lbl">Reps</div></div>
            <div class="cam-stat"><div class="cam-stat-val" id="cam-pct" style="color:${ex.color}">0%</div><div class="cam-stat-lbl">of ${ex.target} target</div></div>
            <div class="cam-stat"><div class="cam-stat-val" id="cam-cal">0</div><div class="cam-stat-lbl">Calories</div></div>
          </div>
          <div class="cam-controls">
            <button class="cam-control-btn" data-action="cam-reset">↺</button>
            <button class="cam-main-btn" id="cam-main" data-action="cam-toggle" style="background:linear-gradient(135deg,${ex.color},${ex.color}AA)">▶</button>
            <button class="cam-control-btn" data-action="cam-add">+</button>
          </div>
          <button class="btn green full" data-action="cam-finish">✓ Finish & Save Session</button>
          <div class="muted" style="text-align:center;font-size:11px;margin-top:8px">Camera preview is live · tap + to confirm each completed rep</div>
        </div>
      </div>`;
  },

  // ============ ACTIONS ============
  handleAction(action, data) {
    const a = action;
    if (a === "logout") { if (confirm("Log out?")) { DB.logout(); this.state.user = null; this.state.screen = "home"; this.render(); } }
    if (a === "water") { const c = +data.count; const today = new Date().toISOString().split("T")[0]; const cur = DB.getWater(today); DB.setWater(today, c === cur ? c - 1 : c); this.render(); this.checkUnlocks(); }
    if (a === "start-plan") { const p = DB.read().workoutPlans.find(x => x.id === +data.plan); if (p) this.startWorkout(p); }
    if (a === "custom-workout") this.startWorkout({ name: "Custom Workout" });
    if (a === "toggle-timer") { const w = this.state.activeWorkout; w.running = !w.running; document.getElementById("play-btn").innerHTML = w.running ? "❚❚" : "▶"; document.getElementById("play-btn").style.background = w.running ? "linear-gradient(135deg,var(--red),#DC2626)" : "linear-gradient(135deg,var(--primary),var(--primary2))"; }
    if (a === "reset-timer") { const w = this.state.activeWorkout; w.seconds = 0; w.running = false; this.bindActiveWorkout(); document.getElementById("play-btn").innerHTML = "▶"; document.getElementById("play-btn").style.background = "linear-gradient(135deg,var(--primary),var(--primary2))"; }
    if (a === "toggle-ex") { const i = +data.idx; const w = this.state.activeWorkout; w.exercises[i].done = !w.exercises[i].done; this.render(); this.bindActiveWorkout(); }
    if (a === "quit-workout") { if (confirm("Quit? Progress will not be saved.")) { clearInterval(this._timerInt); this.state.activeWorkout = null; this.go("workout"); } }
    if (a === "finish-workout") this.finishWorkout();

    if (a === "add-goal") this.showAddGoalModal();
    if (a === "goal-progress") { const g = DB.getGoals().find(x => x.id === +data.id); if (g) { DB.updateGoal(g.id, { current: Math.max(0, g.current + +data.delta) }); this.render(); } }
    if (a === "goal-delete") { if (confirm("Delete goal?")) { DB.deleteGoal(+data.id); this.render(); } }

    if (a === "edit-profile") this.showEditProfileModal();
    if (a === "change-email") this.showChangeEmailModal();
    if (a === "change-password") this.showChangePasswordModal();
    if (a === "export") this.exportData();
    if (a === "import") this.importData();
    if (a === "reset") { if (confirm("⚠ Erase ALL data? This cannot be undone!")) { DB.resetAll(); this.state.user = null; this.render(); } }

    if (a === "add-photo") this.addPhoto();
    if (a === "photo-tap") { const id = +data.id; const sel = this.state.selectedPhotos; if (sel.includes(id)) this.state.selectedPhotos = sel.filter(x => x !== id); else if (sel.length >= 2) this.state.selectedPhotos = [sel[1], id]; else this.state.selectedPhotos = [...sel, id]; this.render(); }
    if (a === "toggle-compare") { this.state.selectedPhotos = []; this.render(); }

    if (a === "close-camera") { this.stopCamera(); this.go("workout"); }
    if (a === "switch-camera") { this.cameraFacing = this.cameraFacing === "user" ? "environment" : "user"; this.startCameraStream(); }
    if (a === "pick-exercise") this.showExercisePicker();
    if (a === "cam-toggle") this.toggleCameraSession();
    if (a === "cam-reset") this.resetCameraSession();
    if (a === "cam-add") this.addCameraRep();
    if (a === "cam-finish") this.finishCameraSession();
  },

  // Modals
  modal(title, html, onSubmit) {
    const m = document.createElement("div");
    m.className = "modal-bg";
    m.innerHTML = `<div class="modal"><div class="modal-head"><div class="modal-title">${title}</div><div class="modal-close">✕</div></div><div id="modal-body">${html}</div></div>`;
    document.body.appendChild(m);
    m.querySelector(".modal-close").onclick = () => m.remove();
    m.onclick = (e) => { if (e.target === m) m.remove(); };
    if (onSubmit) {
      const form = m.querySelector("form");
      if (form) form.onsubmit = (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); try { onSubmit(data); m.remove(); } catch (err) { const e2 = m.querySelector(".error-text"); if (e2) { e2.textContent = err.message; e2.style.display = "block"; } else alert(err.message); } };
    }
    return m;
  },

  showAddGoalModal() {
    this.modal("New Goal", `
      <form>
        <div class="label">Goal Title</div>
        <div class="input"><input name="title" placeholder="e.g. Workout 5x a week" required></div>
        <div class="split">
          <div><div class="label">Target</div><div class="input"><input name="target" type="number" placeholder="5" required></div></div>
          <div><div class="label">Unit</div><div class="input"><input name="unit" placeholder="workouts" required></div></div>
        </div>
        <div class="error-text" style="display:none"></div>
        <button class="btn primary full">Add Goal</button>
      </form>`, (data) => {
      DB.addGoal({ title: data.title, target: +data.target, unit: data.unit });
      this.render();
      this.toast("Goal added!");
    });
  },

  showEditProfileModal() {
    const u = this.state.user;
    this.modal("Edit Profile", `
      <form>
        <div class="label">Name</div>
        <div class="input"><input name="name" value="${u.name}" required></div>
        <div class="split">
          <div><div class="label">Weight (kg)</div><div class="input"><input name="weight" type="number" step="0.1" value="${u.weight || ""}"></div></div>
          <div><div class="label">Height (cm)</div><div class="input"><input name="height" type="number" value="${u.height || ""}"></div></div>
        </div>
        <div class="label">Fitness Goal</div>
        <div class="input"><select name="fitnessGoal">
          ${["weight_loss","muscle_gain","endurance","flexibility","general_fitness"].map(g => `<option value="${g}" ${u.fitnessGoal === g ? "selected" : ""}>${g.replace("_"," ")}</option>`).join("")}
        </select></div>
        <div class="label">Bio</div>
        <div class="input"><textarea name="bio" placeholder="Tell us about yourself">${u.bio || ""}</textarea></div>
        <div class="error-text" style="display:none"></div>
        <button class="btn primary full">Save</button>
      </form>`, (data) => {
      this.state.user = DB.updateUser({ name: data.name, weight: data.weight ? +data.weight : null, height: data.height ? +data.height : null, fitnessGoal: data.fitnessGoal, bio: data.bio });
      this.render();
      this.toast("Profile updated!");
    });
  },

  showChangeEmailModal() {
    this.modal("Change Email", `
      <form>
        <div class="muted" style="margin-bottom:10px">Current: ${this.state.user.email}</div>
        <div class="input"><input name="newEmail" type="email" placeholder="New email" required></div>
        <div class="input"><input name="password" type="password" placeholder="Current password" required></div>
        <div class="error-text" style="display:none"></div>
        <button class="btn primary full">Update Email</button>
      </form>`, (data) => {
      this.state.user = DB.changeEmail(data.newEmail, data.password);
      this.render(); this.toast("Email updated!");
    });
  },

  showChangePasswordModal() {
    this.modal("Change Password", `
      <form>
        <div class="input"><input name="current" type="password" placeholder="Current password" required></div>
        <div class="input"><input name="newPw" type="password" placeholder="New password (min 6)" minlength="6" required></div>
        <div class="input"><input name="confirm" type="password" placeholder="Confirm new password" required></div>
        <div class="error-text" style="display:none"></div>
        <button class="btn primary full">Update Password</button>
      </form>`, (data) => {
      if (data.newPw !== data.confirm) throw new Error("Passwords do not match");
      DB.changePassword(data.current, data.newPw);
      this.toast("Password updated!");
    });
  },

  exportData() {
    const blob = new Blob([DB.exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fitpulse-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    this.toast("Data exported!");
  },

  importData() {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json";
    inp.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        if (DB.importData(r.result)) {
          this.state.user = DB.currentUser(); this.render(); this.toast("Data imported!");
        } else this.toast("Invalid file", "error");
      };
      r.readAsText(file);
    };
    inp.click();
  },

  addPhoto() {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        const u = this.state.user;
        this.modal("Save Progress Photo", `
          <form>
            <img src="${r.result}" style="width:100%;max-height:240px;object-fit:contain;border-radius:14px;margin-bottom:12px;background:#000">
            <div class="label">Current Weight (kg)</div>
            <div class="input"><input name="weight" type="number" step="0.1" value="${u.weight || ""}"></div>
            <div class="label">Note (optional)</div>
            <div class="input"><textarea name="note" placeholder="How are you feeling?"></textarea></div>
            <button class="btn primary full">Save Photo</button>
          </form>`, (data) => {
          DB.addPhoto({ uri: r.result, weight: data.weight ? +data.weight : null, note: data.note || "", takenAt: new Date().toISOString() });
          this.render(); this.toast("Photo saved!");
        });
      };
      r.readAsDataURL(file);
    };
    inp.click();
  },

  finishWorkout() {
    const w = this.state.activeWorkout;
    clearInterval(this._timerInt);
    DB.addWorkout({
      workoutName: w.name, category: w.category,
      duration: Math.ceil(w.seconds / 60),
      caloriesBurned: Math.round(w.seconds / 60 * 8),
      exercises: w.exercises,
      completedAt: new Date().toISOString(),
    });
    this.toast("Workout saved! 🎉");
    const newAch = DB.checkAchievements();
    if (newAch.length) setTimeout(() => this.toast(`Achievement unlocked: ${newAch[0]}! 🏆`), 1200);
    this.state.activeWorkout = null;
    this.go("home");
  },

  checkUnlocks() {
    const newAch = DB.checkAchievements();
    if (newAch.length) this.toast(`Achievement unlocked: ${newAch[0]}! 🏆`);
  },

  // ============ CAMERA SESSION ============
  cameraFacing: "user",
  cameraStream: null,

  async startCameraStream() {
    this.stopCamera();
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = document.getElementById("camera-video");
      if (video) video.srcObject = this.cameraStream;
    } catch (err) {
      this.toast("Camera permission or HTTPS is required for the live preview", "error");
    }
  },

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    if (this._camTimer) { clearInterval(this._camTimer); this._camTimer = null; }
  },

  initCamera() {
    if (!this.state.cameraSession) {
      this.state.cameraSession = { exercise: EXERCISES[0], reps: 0, seconds: 0, running: false };
    }
    this.startCameraStream();
  },

  toggleCameraSession() {
    const s = this.state.cameraSession;
    if (s.running) {
      s.running = false;
      clearInterval(this._camTimer); this._camTimer = null;
      document.getElementById("cam-main").innerHTML = "▶";
      document.getElementById("rec-dot").style.display = "none";
    } else {
      s.running = true;
      document.getElementById("cam-main").innerHTML = "❚❚";
      document.getElementById("rec-dot").style.display = "inline-block";
      this._camTimer = setInterval(() => { s.seconds++; this.updateCamUI(); }, 1000);
    }
  },

  resetCameraSession() {
    const s = this.state.cameraSession;
    s.reps = 0; s.seconds = 0;
    if (s.running) this.toggleCameraSession();
    this.updateCamUI();
  },

  addCameraRep() {
    this.state.cameraSession.reps++;
    this.updateCamUI();
  },

  updateCamUI() {
    const s = this.state.cameraSession;
    const m = String(Math.floor(s.seconds / 60)).padStart(2, "0");
    const sec = String(s.seconds % 60).padStart(2, "0");
    const t = document.getElementById("cam-time"); if (t) t.textContent = `${m}:${sec}`;
    const r = document.getElementById("cam-reps"); if (r) r.textContent = s.reps;
    const pct = Math.round(Math.min(s.reps / s.exercise.target, 1) * 100);
    const p = document.getElementById("cam-pct"); if (p) p.textContent = pct + "%";
    const c = document.getElementById("cam-cal"); if (c) c.textContent = Math.round(s.reps * s.exercise.calPerRep);
  },

  showExercisePicker() {
    const m = this.modal("Choose Exercise", EXERCISES.map((ex, i) => `
      <div class="exercise-row" data-idx="${i}">
        <div class="ex-dot" style="background:${ex.color}"></div>
        <div style="flex:1">
          <div class="ex-name">${ex.name}</div>
          <div class="ex-meta-text">Target ${ex.target} reps · ${ex.calPerRep} cal/rep</div>
        </div>
        ${this.state.cameraSession.exercise.name === ex.name ? `<div style="color:${ex.color}">✓</div>` : ""}
      </div>`).join(""));
    m.querySelectorAll(".exercise-row").forEach(el => el.onclick = () => {
      const ex = EXERCISES[+el.dataset.idx];
      this.state.cameraSession.exercise = ex;
      this.state.cameraSession.reps = 0;
      this.state.cameraSession.seconds = 0;
      if (this.state.cameraSession.running) this.toggleCameraSession();
      m.remove();
      this.render();
      this.initCamera();
    });
  },

  finishCameraSession() {
    const s = this.state.cameraSession;
    if (s.reps === 0) { this.toast("No reps recorded!", "error"); return; }
    if (s.running) this.toggleCameraSession();
    const cal = Math.round(s.reps * s.exercise.calPerRep);
    DB.addWorkout({
      workoutName: `${s.exercise.name} (Camera)`, category: "strength",
      duration: Math.max(1, Math.ceil(s.seconds / 60)),
      caloriesBurned: cal,
      exercises: [{ name: s.exercise.name, sets: 1, reps: s.reps, done: true }],
      completedAt: new Date().toISOString(),
    });
    this.stopCamera();
    this.state.cameraSession = null;
    this.toast(`Session saved: ${s.reps} reps, ${cal} cal! 🎉`);
    const newAch = DB.checkAchievements();
    if (newAch.length) setTimeout(() => this.toast(`Achievement: ${newAch[0]}! 🏆`), 1200);
    this.go("home");
  },

  // ============ NAV ============
  renderBottomNav() {
    const items = [
      { id: "home", icon: "🏠", label: "Home" },
      { id: "workout", icon: "💪", label: "Workout" },
      { id: "progress", icon: "📊", label: "Progress" },
      { id: "profile", icon: "👤", label: "Profile" },
    ];
    return `<nav class="bnav">
      ${items.map(i => `
        <div class="bnav-item ${this.state.screen === i.id ? "active" : ""}" data-go="${i.id}">
          <div class="bnav-icon">${i.icon}</div>
          <div>${i.label}</div>
        </div>`).join("")}
    </nav>`;
  },

  // ============ HELPERS ============
  initials(name) { return (name || "FP").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2); },
  greeting() { const h = new Date().getHours(); return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"; },
  timeAgo(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return d + "d ago"; if (h > 0) return h + "h ago"; if (m > 0) return m + "m ago"; return "just now";
  },
};

const EXERCISES = [
  { name: "Push-ups", calPerRep: 0.5, target: 15, color: "#6C63FF" },
  { name: "Squats", calPerRep: 0.4, target: 20, color: "#FF6B35" },
  { name: "Sit-ups", calPerRep: 0.3, target: 20, color: "#22C55E" },
  { name: "Jumping Jacks", calPerRep: 0.2, target: 30, color: "#00D4FF" },
  { name: "Burpees", calPerRep: 1.0, target: 10, color: "#EF4444" },
  { name: "Lunges", calPerRep: 0.4, target: 16, color: "#F59E0B" },
];

// Hook camera init when navigating to camera
const _origGo = App.go.bind(App);
App.go = function(screen) {
  if (App.state.screen === "camera" && screen !== "camera") App.stopCamera();
  _origGo(screen);
  if (screen === "camera") setTimeout(() => App.initCamera(), 100);
  if (screen === "active") setTimeout(() => App.bindActiveWorkout(), 50);
};

document.addEventListener("DOMContentLoaded", () => App.init());
if (document.readyState !== "loading") App.init();
