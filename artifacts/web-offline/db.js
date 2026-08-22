// FitPulse offline data store using localStorage + IndexedDB for photos
const DB = {
  KEY: "fitpulse:v1",

  read() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || "{}"); }
    catch { return {}; }
  },

  write(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  init() {
    let d = this.read();
    if (!d.users) d.users = [];
    if (!d.workouts) d.workouts = [];
    if (!d.water) d.water = {};
    if (!d.photos) d.photos = [];
    if (!d.goals) d.goals = [];
    if (!d.achievements) d.achievements = [];
    if (!d.session) d.session = null;
    if (!d.exercises) d.exercises = SEED_EXERCISES;
    if (!d.workoutPlans) d.workoutPlans = SEED_PLANS;

    // Seed demo user once
    if (!d.users.find(u => u.email === "demo@fitpulse.app")) {
      const demoId = Date.now();
      d.users.push({
        id: demoId,
        name: "Demo User",
        email: "demo@fitpulse.app",
        password: "demo123",
        weight: 72,
        height: 175,
        fitnessGoal: "muscle_gain",
        activityLevel: "moderately_active",
        bio: "Welcome to FitPulse demo account!",
        createdAt: new Date().toISOString(),
      });
      // Seed sample workouts (last 5 days)
      const today = new Date();
      const samples = [
        { name: "Upper Body Power", category: "strength", duration: 42, calories: 320, daysAgo: 0 },
        { name: "Morning Cardio", category: "cardio", duration: 30, calories: 280, daysAgo: 1 },
        { name: "Leg Day", category: "strength", duration: 50, calories: 410, daysAgo: 2 },
        { name: "Full Body HIIT", category: "hiit", duration: 25, calories: 290, daysAgo: 3 },
        { name: "Yoga Flow", category: "flexibility", duration: 35, calories: 130, daysAgo: 4 },
      ];
      samples.forEach(s => {
        const d2 = new Date(today); d2.setDate(d2.getDate() - s.daysAgo);
        d.workouts.push({
          id: Date.now() + Math.random(),
          userId: demoId,
          workoutName: s.name,
          category: s.category,
          duration: s.duration,
          caloriesBurned: s.calories,
          exercises: [],
          completedAt: d2.toISOString(),
        });
      });
      // Seed water for past 7 days
      for (let i = 0; i < 7; i++) {
        const d2 = new Date(today); d2.setDate(d2.getDate() - i);
        const key = demoId + ":" + d2.toISOString().split("T")[0];
        d.water[key] = Math.floor(Math.random() * 5) + 4;
      }
      // Seed goals
      d.goals.push(
        { id: 1, userId: demoId, title: "Workout 5 times a week", target: 5, current: 4, unit: "workouts", createdAt: new Date().toISOString() },
        { id: 2, userId: demoId, title: "Lose 5 kg", target: 5, current: 2.5, unit: "kg", createdAt: new Date().toISOString() },
        { id: 3, userId: demoId, title: "Drink 64 oz water daily", target: 8, current: 6, unit: "glasses", createdAt: new Date().toISOString() },
      );
    }

    this.write(d);
  },

  // Auth
  register(name, email, password) {
    const d = this.read();
    if (d.users.find(u => u.email === email)) throw new Error("Email already in use");
    const user = {
      id: Date.now(),
      name, email, password,
      fitnessGoal: "general_fitness",
      activityLevel: "moderately_active",
      createdAt: new Date().toISOString(),
    };
    d.users.push(user);
    d.session = user.id;
    this.write(d);
    return user;
  },

  login(email, password) {
    const d = this.read();
    const user = d.users.find(u => u.email === email);
    if (!user) throw new Error("No account found with this email");
    if (user.password !== password) throw new Error("Incorrect password");
    d.session = user.id;
    this.write(d);
    return user;
  },

  logout() {
    const d = this.read();
    d.session = null;
    this.write(d);
  },

  currentUser() {
    const d = this.read();
    if (!d.session) return null;
    return d.users.find(u => u.id === d.session) || null;
  },

  updateUser(updates) {
    const d = this.read();
    const i = d.users.findIndex(u => u.id === d.session);
    if (i < 0) throw new Error("Not logged in");
    d.users[i] = { ...d.users[i], ...updates };
    this.write(d);
    return d.users[i];
  },

  changePassword(current, newPw) {
    const d = this.read();
    const i = d.users.findIndex(u => u.id === d.session);
    if (i < 0) throw new Error("Not logged in");
    if (d.users[i].password !== current) throw new Error("Current password is incorrect");
    d.users[i].password = newPw;
    this.write(d);
  },

  changeEmail(newEmail, password) {
    const d = this.read();
    const i = d.users.findIndex(u => u.id === d.session);
    if (i < 0) throw new Error("Not logged in");
    if (d.users[i].password !== password) throw new Error("Password incorrect");
    if (d.users.find(u => u.email === newEmail && u.id !== d.session)) throw new Error("Email already in use");
    d.users[i].email = newEmail;
    this.write(d);
    return d.users[i];
  },

  // Workouts
  addWorkout(workout) {
    const d = this.read();
    d.workouts.push({ id: Date.now(), userId: d.session, ...workout });
    this.write(d);
    this.checkAchievements();
  },

  getWorkouts() {
    const d = this.read();
    return d.workouts.filter(w => w.userId === d.session).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  },

  // Water
  getWater(date) {
    const d = this.read();
    const key = d.session + ":" + date;
    return d.water[key] || 0;
  },

  setWater(date, count) {
    const d = this.read();
    const key = d.session + ":" + date;
    d.water[key] = Math.max(0, Math.min(12, count));
    this.write(d);
    if (d.water[key] >= 8) this.checkAchievements();
  },

  // Photos (base64 stored in localStorage)
  addPhoto(photo) {
    const d = this.read();
    d.photos.push({ id: Date.now(), userId: d.session, ...photo });
    this.write(d);
  },

  getPhotos() {
    const d = this.read();
    return d.photos.filter(p => p.userId === d.session).sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));
  },

  deletePhoto(id) {
    const d = this.read();
    d.photos = d.photos.filter(p => p.id !== id);
    this.write(d);
  },

  // Goals
  getGoals() {
    const d = this.read();
    return d.goals.filter(g => g.userId === d.session);
  },

  addGoal(goal) {
    const d = this.read();
    d.goals.push({ id: Date.now(), userId: d.session, current: 0, createdAt: new Date().toISOString(), ...goal });
    this.write(d);
  },

  updateGoal(id, updates) {
    const d = this.read();
    const i = d.goals.findIndex(g => g.id === id);
    if (i >= 0) { d.goals[i] = { ...d.goals[i], ...updates }; this.write(d); }
  },

  deleteGoal(id) {
    const d = this.read();
    d.goals = d.goals.filter(g => g.id !== id);
    this.write(d);
  },

  // Achievements
  getAchievements() {
    const d = this.read();
    return d.achievements.filter(a => a.userId === d.session);
  },

  unlockAchievement(title) {
    const d = this.read();
    const exists = d.achievements.find(a => a.userId === d.session && a.title === title);
    if (exists) return false;
    const def = ALL_ACHIEVEMENTS.find(a => a.title === title);
    if (!def) return false;
    d.achievements.push({ id: Date.now() + Math.random(), userId: d.session, ...def, unlockedAt: new Date().toISOString() });
    this.write(d);
    return true;
  },

  checkAchievements() {
    const newly = [];
    const workouts = this.getWorkouts();
    const totalCal = workouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);
    const streak = this.getStreak();

    if (workouts.length >= 1 && this.unlockAchievement("First Step")) newly.push("First Step");
    if (workouts.length >= 5 && this.unlockAchievement("Getting Started")) newly.push("Getting Started");
    if (workouts.length >= 10 && this.unlockAchievement("Dedicated")) newly.push("Dedicated");
    if (workouts.length >= 25 && this.unlockAchievement("Warrior")) newly.push("Warrior");
    if (workouts.length >= 50 && this.unlockAchievement("Champion")) newly.push("Champion");
    if (streak >= 3 && this.unlockAchievement("On Fire")) newly.push("On Fire");
    if (streak >= 7 && this.unlockAchievement("Week Strong")) newly.push("Week Strong");
    if (streak >= 30 && this.unlockAchievement("Unstoppable")) newly.push("Unstoppable");
    if (totalCal >= 1000 && this.unlockAchievement("Calorie Crusher")) newly.push("Calorie Crusher");
    if (totalCal >= 5000 && this.unlockAchievement("Inferno")) newly.push("Inferno");

    const today = new Date().toISOString().split("T")[0];
    if (this.getWater(today) >= 8 && this.unlockAchievement("Hydrated")) newly.push("Hydrated");

    return newly;
  },

  // Stats
  getStreak() {
    const workouts = this.getWorkouts();
    if (workouts.length === 0) return 0;
    const dates = new Set(workouts.map(w => w.completedAt.split("T")[0]));
    let streak = 0;
    let cur = new Date();
    cur.setHours(0,0,0,0);
    if (!dates.has(cur.toISOString().split("T")[0])) {
      cur.setDate(cur.getDate() - 1);
    }
    while (dates.has(cur.toISOString().split("T")[0])) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    }
    return streak;
  },

  getStats() {
    const workouts = this.getWorkouts();
    const u = this.currentUser();
    const totalCal = workouts.reduce((s, w) => s + (w.caloriesBurned || 0), 0);
    const totalMin = workouts.reduce((s, w) => s + (w.duration || 0), 0);
    const streak = this.getStreak();
    let bmi = null, bmiCat = null;
    if (u && u.height && u.weight) {
      const m = u.height / 100;
      bmi = +(u.weight / (m*m)).toFixed(1);
      bmiCat = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
    }
    return {
      totalWorkouts: workouts.length,
      totalCaloriesBurned: totalCal,
      totalMinutes: totalMin,
      currentStreak: streak,
      longestStreak: streak,
      bmi, bmiCategory: bmiCat,
    };
  },

  getWeekActivity() {
    const w = this.getWorkouts();
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const total = w.filter(x => x.completedAt.split("T")[0] === key).reduce((s, x) => s + (x.duration || 0), 0);
      week.push({ day: d.toLocaleDateString("en", { weekday: "short" }), minutes: total, water: this.getWater(key) });
    }
    return week;
  },

  exportData() {
    return JSON.stringify(this.read(), null, 2);
  },

  importData(json) {
    try {
      const d = JSON.parse(json);
      this.write(d);
      return true;
    } catch { return false; }
  },

  resetAll() {
    localStorage.removeItem(this.KEY);
    this.init();
  },
};

const SEED_EXERCISES = [
  { name: "Push-ups", muscle: "Chest", difficulty: "beginner" },
  { name: "Squats", muscle: "Legs", difficulty: "beginner" },
  { name: "Pull-ups", muscle: "Back", difficulty: "intermediate" },
  { name: "Plank", muscle: "Core", difficulty: "beginner" },
  { name: "Burpees", muscle: "Full Body", difficulty: "advanced" },
  { name: "Lunges", muscle: "Legs", difficulty: "beginner" },
  { name: "Sit-ups", muscle: "Core", difficulty: "beginner" },
  { name: "Mountain Climbers", muscle: "Cardio", difficulty: "intermediate" },
  { name: "Jumping Jacks", muscle: "Cardio", difficulty: "beginner" },
  { name: "Deadlift", muscle: "Back", difficulty: "advanced" },
  { name: "Bench Press", muscle: "Chest", difficulty: "intermediate" },
  { name: "Bicep Curls", muscle: "Arms", difficulty: "beginner" },
  { name: "Tricep Dips", muscle: "Arms", difficulty: "intermediate" },
  { name: "Russian Twists", muscle: "Core", difficulty: "intermediate" },
  { name: "Leg Raises", muscle: "Core", difficulty: "intermediate" },
];

const SEED_PLANS = [
  { id: 1, name: "Upper Body Power", category: "strength", duration: 45, level: "Intermediate", icon: "💪", color: "#6C63FF", exercises: ["Push-ups", "Pull-ups", "Bench Press", "Bicep Curls"] },
  { id: 2, name: "Leg Day Crusher", category: "strength", duration: 50, level: "Advanced", icon: "🦵", color: "#FF6B35", exercises: ["Squats", "Lunges", "Deadlift"] },
  { id: 3, name: "Morning Cardio", category: "cardio", duration: 30, level: "Beginner", icon: "🏃", color: "#22C55E", exercises: ["Jumping Jacks", "Mountain Climbers", "Burpees"] },
  { id: 4, name: "Core Crusher", category: "strength", duration: 25, level: "Beginner", icon: "🔥", color: "#F59E0B", exercises: ["Plank", "Sit-ups", "Russian Twists", "Leg Raises"] },
  { id: 5, name: "Full Body HIIT", category: "hiit", duration: 25, level: "Advanced", icon: "⚡", color: "#EF4444", exercises: ["Burpees", "Mountain Climbers", "Squats", "Push-ups"] },
  { id: 6, name: "Beginner Total", category: "strength", duration: 30, level: "Beginner", icon: "🌟", color: "#00D4FF", exercises: ["Push-ups", "Squats", "Plank", "Lunges"] },
  { id: 7, name: "Yoga Flow", category: "flexibility", duration: 35, level: "Beginner", icon: "🧘", color: "#9C8FFF", exercises: ["Plank", "Lunges"] },
  { id: 8, name: "Quick Burn", category: "hiit", duration: 15, level: "Intermediate", icon: "💥", color: "#EC4899", exercises: ["Jumping Jacks", "Burpees", "Mountain Climbers"] },
];

const ALL_ACHIEVEMENTS = [
  { title: "First Step", description: "Complete your first workout", icon: "🎯", category: "milestone" },
  { title: "Getting Started", description: "Complete 5 workouts", icon: "⭐", category: "milestone" },
  { title: "Dedicated", description: "Complete 10 workouts", icon: "🏆", category: "milestone" },
  { title: "Warrior", description: "Complete 25 workouts", icon: "💪", category: "milestone" },
  { title: "Champion", description: "Complete 50 workouts", icon: "👑", category: "milestone" },
  { title: "On Fire", description: "3-day workout streak", icon: "🔥", category: "streak" },
  { title: "Week Strong", description: "7-day workout streak", icon: "⚡", category: "streak" },
  { title: "Unstoppable", description: "30-day workout streak", icon: "🚀", category: "streak" },
  { title: "Calorie Crusher", description: "Burn 1000 total calories", icon: "🔥", category: "burn" },
  { title: "Inferno", description: "Burn 5000 total calories", icon: "🌋", category: "burn" },
  { title: "Hydrated", description: "Drink 8 glasses in a day", icon: "💧", category: "wellness" },
  { title: "Early Bird", description: "Workout before 7 AM", icon: "🌅", category: "habit" },
];

DB.init();
