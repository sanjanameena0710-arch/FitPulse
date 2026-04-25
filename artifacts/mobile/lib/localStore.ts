import AsyncStorage from "@react-native-async-storage/async-storage";

const K = {
  USERS: "fp_users",
  CURRENT: "fp_current_user_id",
  WORKOUTS: "fp_workouts",
  PROGRESS: "fp_progress_daily",
  GOALS: "fp_goals",
  WATER: "fp_water_log",
  ACHIEVEMENTS: "fp_achievements",
  PHOTOS: "fp_progress_photos",
  CUSTOM_PLANS: "fp_custom_plans",
  SEEDED: "fp_seeded_v1",
};

export type StoredUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  fitnessGoal: string;
  age?: number;
  weight?: number;
  height?: number;
  activityLevel?: string;
  bio?: string;
  createdAt: string;
};

export type Workout = {
  id: number;
  userId: number;
  workoutName: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  exercises: { exerciseName: string; sets: number; reps: number; weight: number }[];
  completedAt: string;
};

export type DailyProgress = {
  userId: number;
  date: string;
  workoutsCompleted: number;
  caloriesBurned: number;
  minutesActive: number;
};

export type Goal = {
  id: number;
  userId: number;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  completed: boolean;
  createdAt: string;
};

export type WaterEntry = {
  userId: number;
  date: string;
  glasses: number;
};

export type Achievement = {
  id: number;
  userId: number;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string;
};

export type ProgressPhoto = {
  id: number;
  userId: number;
  uri: string;
  weight?: number;
  note?: string;
  takenAt: string;
};

export type Exercise = {
  id: number;
  name: string;
  category: string;
  muscleGroup: string;
  difficulty: string;
  description: string;
  caloriesPerMinute: number;
  equipment: string;
};

export type WorkoutPlan = {
  id: number;
  name: string;
  description: string;
  level: string;
  duration: number;
  category: string;
  isPremium: boolean;
  exercises: string[];
};

export const SEED_EXERCISES: Exercise[] = [
  { id: 1, name: "Push-ups", category: "strength", muscleGroup: "Chest", difficulty: "beginner", description: "Classic upper body exercise", caloriesPerMinute: 8, equipment: "None" },
  { id: 2, name: "Squats", category: "strength", muscleGroup: "Legs", difficulty: "beginner", description: "Foundation lower body movement", caloriesPerMinute: 9, equipment: "None" },
  { id: 3, name: "Pull-ups", category: "strength", muscleGroup: "Back", difficulty: "advanced", description: "Upper body pulling strength", caloriesPerMinute: 10, equipment: "Pull-up Bar" },
  { id: 4, name: "Plank", category: "strength", muscleGroup: "Core", difficulty: "beginner", description: "Full body stability hold", caloriesPerMinute: 5, equipment: "None" },
  { id: 5, name: "Burpees", category: "hiit", muscleGroup: "Full Body", difficulty: "intermediate", description: "Explosive full body movement", caloriesPerMinute: 14, equipment: "None" },
  { id: 6, name: "Mountain Climbers", category: "hiit", muscleGroup: "Core", difficulty: "intermediate", description: "Cardio and core combo", caloriesPerMinute: 12, equipment: "None" },
  { id: 7, name: "Jumping Jacks", category: "cardio", muscleGroup: "Full Body", difficulty: "beginner", description: "Classic warm-up cardio", caloriesPerMinute: 10, equipment: "None" },
  { id: 8, name: "Lunges", category: "strength", muscleGroup: "Legs", difficulty: "beginner", description: "Single-leg strength builder", caloriesPerMinute: 8, equipment: "None" },
  { id: 9, name: "Deadlifts", category: "strength", muscleGroup: "Back", difficulty: "advanced", description: "Compound posterior chain lift", caloriesPerMinute: 11, equipment: "Barbell" },
  { id: 10, name: "Bench Press", category: "strength", muscleGroup: "Chest", difficulty: "intermediate", description: "Upper body pressing king", caloriesPerMinute: 9, equipment: "Barbell" },
  { id: 11, name: "Bicycle Crunches", category: "strength", muscleGroup: "Core", difficulty: "beginner", description: "Rotational core exercise", caloriesPerMinute: 8, equipment: "None" },
  { id: 12, name: "Russian Twists", category: "strength", muscleGroup: "Core", difficulty: "intermediate", description: "Oblique strengthener", caloriesPerMinute: 7, equipment: "None" },
  { id: 13, name: "Yoga Flow", category: "yoga", muscleGroup: "Full Body", difficulty: "beginner", description: "Mindful movement sequence", caloriesPerMinute: 4, equipment: "Yoga Mat" },
  { id: 14, name: "Sun Salutation", category: "yoga", muscleGroup: "Full Body", difficulty: "beginner", description: "Traditional yoga warm-up", caloriesPerMinute: 5, equipment: "Yoga Mat" },
  { id: 15, name: "Hamstring Stretch", category: "flexibility", muscleGroup: "Legs", difficulty: "beginner", description: "Lower body flexibility", caloriesPerMinute: 3, equipment: "None" },
  { id: 16, name: "Box Jumps", category: "hiit", muscleGroup: "Legs", difficulty: "advanced", description: "Plyometric power builder", caloriesPerMinute: 13, equipment: "Box" },
  { id: 17, name: "Running", category: "cardio", muscleGroup: "Full Body", difficulty: "beginner", description: "Endurance cardio", caloriesPerMinute: 11, equipment: "None" },
  { id: 18, name: "Cycling", category: "cardio", muscleGroup: "Legs", difficulty: "beginner", description: "Low-impact cardio", caloriesPerMinute: 9, equipment: "Bicycle" },
  { id: 19, name: "Dumbbell Curls", category: "strength", muscleGroup: "Arms", difficulty: "beginner", description: "Bicep isolation", caloriesPerMinute: 6, equipment: "Dumbbells" },
  { id: 20, name: "Tricep Dips", category: "strength", muscleGroup: "Arms", difficulty: "intermediate", description: "Tricep builder", caloriesPerMinute: 7, equipment: "Bench" },
];

export const SEED_PLANS: WorkoutPlan[] = [
  { id: 1, name: "Beginner Full Body", description: "Perfect starter plan covering all major muscle groups in 20 minutes a day.", level: "beginner", duration: 4, category: "Strength", isPremium: false, exercises: ["Push-ups", "Squats", "Plank", "Lunges"] },
  { id: 2, name: "30-Day Shred", description: "High-intensity program designed to torch fat and build lean muscle in 30 days.", level: "intermediate", duration: 4, category: "HIIT", isPremium: false, exercises: ["Burpees", "Mountain Climbers", "Jumping Jacks", "Squats"] },
  { id: 3, name: "Strength Builder Pro", description: "Advanced compound lifts to maximize strength gains. Requires gym equipment.", level: "advanced", duration: 8, category: "Strength", isPremium: true, exercises: ["Deadlifts", "Bench Press", "Pull-ups", "Squats"] },
  { id: 4, name: "Yoga & Flexibility", description: "Daily yoga flows to improve flexibility, balance and mindfulness.", level: "beginner", duration: 4, category: "Yoga", isPremium: false, exercises: ["Yoga Flow", "Sun Salutation", "Hamstring Stretch"] },
  { id: 5, name: "Core Crusher", description: "Six-pack-focused routines to build a powerful, defined core.", level: "intermediate", duration: 6, category: "Strength", isPremium: false, exercises: ["Plank", "Russian Twists", "Bicycle Crunches", "Mountain Climbers"] },
  { id: 6, name: "Cardio Blast", description: "Heart-pumping sessions to boost endurance and burn calories fast.", level: "intermediate", duration: 4, category: "Cardio", isPremium: false, exercises: ["Running", "Cycling", "Jumping Jacks", "Burpees"] },
  { id: 7, name: "Athlete Performance", description: "Elite training combining power, speed and agility for athletes.", level: "advanced", duration: 12, category: "HIIT", isPremium: true, exercises: ["Box Jumps", "Burpees", "Deadlifts", "Pull-ups"] },
  { id: 8, name: "Arm Sculptor", description: "Targeted arm and shoulder routine for definition and strength.", level: "beginner", duration: 4, category: "Strength", isPremium: false, exercises: ["Dumbbell Curls", "Tricep Dips", "Push-ups"] },
];

const ACHIEVEMENT_DEFS = [
  { key: "first_workout", title: "First Step", description: "Complete your first workout", icon: "🎯", category: "milestone" },
  { key: "five_workouts", title: "Getting Started", description: "Complete 5 workouts", icon: "⭐", category: "milestone" },
  { key: "ten_workouts", title: "Dedicated", description: "Complete 10 workouts", icon: "🏆", category: "milestone" },
  { key: "25_workouts", title: "Warrior", description: "Complete 25 workouts", icon: "💪", category: "milestone" },
  { key: "50_workouts", title: "Champion", description: "Complete 50 workouts", icon: "👑", category: "milestone" },
  { key: "streak_3", title: "On Fire", description: "3-day workout streak", icon: "🔥", category: "streak" },
  { key: "streak_7", title: "Week Strong", description: "7-day workout streak", icon: "⚡", category: "streak" },
  { key: "streak_30", title: "Unstoppable", description: "30-day workout streak", icon: "🚀", category: "streak" },
  { key: "calories_1000", title: "Calorie Crusher", description: "Burn 1000 total calories", icon: "🔥", category: "burn" },
  { key: "calories_5000", title: "Inferno", description: "Burn 5000 total calories", icon: "🌋", category: "burn" },
  { key: "water_8", title: "Hydrated", description: "Drink 8 glasses in a day", icon: "💧", category: "wellness" },
  { key: "early_bird", title: "Early Bird", description: "Workout before 7 AM", icon: "🌅", category: "habit" },
];

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

async function setJSON<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function nextId(items: { id: number }[]) {
  return (items.reduce((m, i) => Math.max(m, i.id), 0) || 0) + 1;
}

export const LocalStore = {
  async ensureSeeded() {
    const seeded = await AsyncStorage.getItem(K.SEEDED);
    if (seeded) return;
    const users = await getJSON<StoredUser[]>(K.USERS, []);
    if (!users.find(u => u.email === "demo@fitpulse.app")) {
      const demoUser: StoredUser = {
        id: 1,
        name: "Demo Athlete",
        email: "demo@fitpulse.app",
        password: "demo123",
        fitnessGoal: "general_fitness",
        age: 28,
        weight: 70,
        height: 175,
        activityLevel: "moderately_active",
        createdAt: new Date().toISOString(),
      };
      await setJSON(K.USERS, [demoUser]);
      const now = new Date();
      const sampleWorkouts: Workout[] = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        sampleWorkouts.push({
          id: i + 1,
          userId: 1,
          workoutName: ["Morning HIIT", "Upper Body", "Core Blast", "Leg Day", "Yoga Flow"][i],
          category: ["hiit", "strength", "strength", "strength", "yoga"][i],
          duration: [22, 35, 18, 42, 30][i],
          caloriesBurned: [280, 320, 165, 410, 145][i],
          exercises: [],
          completedAt: d.toISOString(),
        });
      }
      await setJSON(K.WORKOUTS, sampleWorkouts);
      const sampleGoals: Goal[] = [
        { id: 1, userId: 1, title: "Workout 5 times this week", targetValue: 5, currentValue: 3, unit: "workouts", category: "fitness", completed: false, createdAt: now.toISOString() },
        { id: 2, userId: 1, title: "Burn 2000 calories", targetValue: 2000, currentValue: 1320, unit: "cal", category: "fitness", completed: false, createdAt: now.toISOString() },
        { id: 3, userId: 1, title: "Drink 8 glasses daily", targetValue: 8, currentValue: 6, unit: "glasses", category: "general", completed: false, createdAt: now.toISOString() },
      ];
      await setJSON(K.GOALS, sampleGoals);
    }
    await AsyncStorage.setItem(K.SEEDED, "1");
  },

  async register(data: { name: string; email: string; password: string; fitnessGoal: string; age?: number; weight?: number; height?: number; activityLevel?: string; }) {
    const users = await getJSON<StoredUser[]>(K.USERS, []);
    const email = data.email.trim().toLowerCase();
    if (users.find(u => u.email === email)) throw new Error("Email already registered");
    const user: StoredUser = {
      id: await nextId(users),
      name: data.name.trim(),
      email,
      password: data.password,
      fitnessGoal: data.fitnessGoal,
      age: data.age,
      weight: data.weight,
      height: data.height,
      activityLevel: data.activityLevel,
      createdAt: new Date().toISOString(),
    };
    await setJSON(K.USERS, [...users, user]);
    await AsyncStorage.setItem(K.CURRENT, String(user.id));
    return user;
  },

  async login(email: string, password: string) {
    const users = await getJSON<StoredUser[]>(K.USERS, []);
    const e = email.trim().toLowerCase();
    const user = users.find(u => u.email === e);
    if (!user) throw new Error("No account found with this email");
    if (user.password !== password) throw new Error("Incorrect password");
    await AsyncStorage.setItem(K.CURRENT, String(user.id));
    return user;
  },

  async getCurrentUser(): Promise<StoredUser | null> {
    const id = await AsyncStorage.getItem(K.CURRENT);
    if (!id) return null;
    const users = await getJSON<StoredUser[]>(K.USERS, []);
    return users.find(u => u.id === Number(id)) || null;
  },

  async logout() {
    await AsyncStorage.removeItem(K.CURRENT);
  },

  async updateUser(userId: number, updates: Partial<StoredUser>) {
    const users = await getJSON<StoredUser[]>(K.USERS, []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error("User not found");
    users[idx] = { ...users[idx], ...updates };
    await setJSON(K.USERS, users);
    return users[idx];
  },

  async changeEmail(userId: number, newEmail: string, currentPassword: string) {
    const users = await getJSON<StoredUser[]>(K.USERS, []);
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");
    if (user.password !== currentPassword) throw new Error("Incorrect password");
    const e = newEmail.trim().toLowerCase();
    if (users.find(u => u.email === e && u.id !== userId)) throw new Error("Email already in use");
    user.email = e;
    await setJSON(K.USERS, users);
    return user;
  },

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const users = await getJSON<StoredUser[]>(K.USERS, []);
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");
    if (user.password !== currentPassword) throw new Error("Current password is incorrect");
    user.password = newPassword;
    await setJSON(K.USERS, users);
  },

  async getExercises() {
    return SEED_EXERCISES;
  },

  async getPlans() {
    return SEED_PLANS;
  },

  async getWorkouts(userId: number, limit?: number) {
    const all = await getJSON<Workout[]>(K.WORKOUTS, []);
    const mine = all.filter(w => w.userId === userId).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    return limit ? mine.slice(0, limit) : mine;
  },

  async addWorkout(workout: Omit<Workout, "id">) {
    const all = await getJSON<Workout[]>(K.WORKOUTS, []);
    const w: Workout = { id: await nextId(all), ...workout };
    await setJSON(K.WORKOUTS, [...all, w]);
    await this.recordDailyProgress({
      userId: workout.userId,
      date: workout.completedAt.split("T")[0],
      workoutsCompleted: 1,
      caloriesBurned: workout.caloriesBurned,
      minutesActive: workout.duration,
    });
    await this.checkAchievements(workout.userId);
    return w;
  },

  async recordDailyProgress(p: DailyProgress) {
    const all = await getJSON<DailyProgress[]>(K.PROGRESS, []);
    const existing = all.find(x => x.userId === p.userId && x.date === p.date);
    if (existing) {
      existing.workoutsCompleted += p.workoutsCompleted;
      existing.caloriesBurned += p.caloriesBurned;
      existing.minutesActive += p.minutesActive;
    } else {
      all.push(p);
    }
    await setJSON(K.PROGRESS, all);
  },

  async getStats(userId: number) {
    const workouts = await this.getWorkouts(userId);
    const user = (await getJSON<StoredUser[]>(K.USERS, [])).find(u => u.id === userId);
    const totalWorkouts = workouts.length;
    const totalCaloriesBurned = workouts.reduce((s, w) => s + w.caloriesBurned, 0);
    const totalMinutes = workouts.reduce((s, w) => s + w.duration, 0);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const thisWeekWorkouts = workouts.filter(w => new Date(w.completedAt) >= startOfWeek).length;

    const dates = new Set(workouts.map(w => w.completedAt.split("T")[0]));
    let currentStreak = 0;
    const cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);
    while (dates.has(cursor.toISOString().split("T")[0])) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    if (currentStreak === 0) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      if (dates.has(yesterday.toISOString().split("T")[0])) {
        const cur = new Date(yesterday);
        while (dates.has(cur.toISOString().split("T")[0])) {
          currentStreak++;
          cur.setDate(cur.getDate() - 1);
        }
      }
    }
    const sortedDates = Array.from(dates).sort();
    let longestStreak = 0;
    let runStreak = 0;
    let prev: Date | null = null;
    for (const d of sortedDates) {
      const cur = new Date(d);
      if (prev) {
        const diff = (cur.getTime() - prev.getTime()) / 86400000;
        if (diff === 1) runStreak++;
        else runStreak = 1;
      } else {
        runStreak = 1;
      }
      longestStreak = Math.max(longestStreak, runStreak);
      prev = cur;
    }

    let bmi: number | null = null;
    let bmiCategory: string | null = null;
    if (user?.weight && user?.height) {
      const h = user.height / 100;
      bmi = +(user.weight / (h * h)).toFixed(1);
      bmiCategory = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
    }
    return {
      totalWorkouts, totalCaloriesBurned, totalMinutes,
      thisWeekWorkouts, currentStreak, longestStreak,
      bmi, bmiCategory,
    };
  },

  async getProgressSummary(userId: number) {
    const workouts = await this.getWorkouts(userId);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyCalories = days.map((day, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      const cal = workouts.filter(w => w.completedAt.split("T")[0] === ds).reduce((s, w) => s + w.caloriesBurned, 0);
      return { day, calories: cal };
    });
    const monthlyWorkouts: { week: string; count: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - (i + 1) * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      const count = workouts.filter(w => {
        const d = new Date(w.completedAt);
        return d >= start && d < end;
      }).length;
      monthlyWorkouts.push({ week: `W${4 - i}`, count });
    }
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalThisMonth = workouts.filter(w => new Date(w.completedAt) >= startMonth).length;
    const averageCaloriesPerWorkout = workouts.length ? Math.round(workouts.reduce((s, w) => s + w.caloriesBurned, 0) / workouts.length) : 0;
    return { weeklyCalories, monthlyWorkouts, totalThisMonth, averageCaloriesPerWorkout };
  },

  async getGoals(userId: number) {
    const all = await getJSON<Goal[]>(K.GOALS, []);
    return all.filter(g => g.userId === userId);
  },

  async addGoal(g: Omit<Goal, "id" | "createdAt" | "completed" | "currentValue">) {
    const all = await getJSON<Goal[]>(K.GOALS, []);
    const goal: Goal = { id: await nextId(all), ...g, currentValue: 0, completed: false, createdAt: new Date().toISOString() };
    await setJSON(K.GOALS, [...all, goal]);
    return goal;
  },

  async updateGoalProgress(id: number, currentValue: number) {
    const all = await getJSON<Goal[]>(K.GOALS, []);
    const g = all.find(x => x.id === id);
    if (!g) return;
    g.currentValue = currentValue;
    g.completed = currentValue >= g.targetValue;
    await setJSON(K.GOALS, all);
  },

  async deleteGoal(id: number) {
    const all = await getJSON<Goal[]>(K.GOALS, []);
    await setJSON(K.GOALS, all.filter(g => g.id !== id));
  },

  async getWaterToday(userId: number) {
    const all = await getJSON<WaterEntry[]>(K.WATER, []);
    const today = new Date().toISOString().split("T")[0];
    const e = all.find(x => x.userId === userId && x.date === today);
    return e?.glasses ?? 0;
  },

  async setWaterToday(userId: number, glasses: number) {
    const all = await getJSON<WaterEntry[]>(K.WATER, []);
    const today = new Date().toISOString().split("T")[0];
    const idx = all.findIndex(x => x.userId === userId && x.date === today);
    if (idx >= 0) all[idx].glasses = glasses;
    else all.push({ userId, date: today, glasses });
    await setJSON(K.WATER, all);
    if (glasses >= 8) await this.unlockAchievement(userId, "water_8");
  },

  async getWaterWeek(userId: number) {
    const all = await getJSON<WaterEntry[]>(K.WATER, []);
    const now = new Date();
    const result: { day: string; glasses: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const e = all.find(x => x.userId === userId && x.date === ds);
      result.push({ day: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()], glasses: e?.glasses ?? 0 });
    }
    return result;
  },

  async getAchievements(userId: number) {
    const all = await getJSON<Achievement[]>(K.ACHIEVEMENTS, []);
    return all.filter(a => a.userId === userId);
  },

  async unlockAchievement(userId: number, key: string) {
    const def = ACHIEVEMENT_DEFS.find(d => d.key === key);
    if (!def) return;
    const all = await getJSON<Achievement[]>(K.ACHIEVEMENTS, []);
    if (all.find(a => a.userId === userId && a.title === def.title)) return;
    const ach: Achievement = {
      id: await nextId(all),
      userId,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      unlockedAt: new Date().toISOString(),
    };
    await setJSON(K.ACHIEVEMENTS, [...all, ach]);
    return ach;
  },

  async checkAchievements(userId: number) {
    const stats = await this.getStats(userId);
    const newOnes: Achievement[] = [];
    if (stats.totalWorkouts >= 1) {
      const a = await this.unlockAchievement(userId, "first_workout"); if (a) newOnes.push(a);
    }
    if (stats.totalWorkouts >= 5) {
      const a = await this.unlockAchievement(userId, "five_workouts"); if (a) newOnes.push(a);
    }
    if (stats.totalWorkouts >= 10) {
      const a = await this.unlockAchievement(userId, "ten_workouts"); if (a) newOnes.push(a);
    }
    if (stats.totalWorkouts >= 25) {
      const a = await this.unlockAchievement(userId, "25_workouts"); if (a) newOnes.push(a);
    }
    if (stats.totalWorkouts >= 50) {
      const a = await this.unlockAchievement(userId, "50_workouts"); if (a) newOnes.push(a);
    }
    if (stats.currentStreak >= 3) {
      const a = await this.unlockAchievement(userId, "streak_3"); if (a) newOnes.push(a);
    }
    if (stats.currentStreak >= 7) {
      const a = await this.unlockAchievement(userId, "streak_7"); if (a) newOnes.push(a);
    }
    if (stats.currentStreak >= 30) {
      const a = await this.unlockAchievement(userId, "streak_30"); if (a) newOnes.push(a);
    }
    if (stats.totalCaloriesBurned >= 1000) {
      const a = await this.unlockAchievement(userId, "calories_1000"); if (a) newOnes.push(a);
    }
    if (stats.totalCaloriesBurned >= 5000) {
      const a = await this.unlockAchievement(userId, "calories_5000"); if (a) newOnes.push(a);
    }
    const hour = new Date().getHours();
    if (hour < 7 && stats.totalWorkouts >= 1) {
      const a = await this.unlockAchievement(userId, "early_bird"); if (a) newOnes.push(a);
    }
    return newOnes;
  },

  async getProgressPhotos(userId: number) {
    const all = await getJSON<ProgressPhoto[]>(K.PHOTOS, []);
    return all.filter(p => p.userId === userId).sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
  },

  async addProgressPhoto(p: Omit<ProgressPhoto, "id">) {
    const all = await getJSON<ProgressPhoto[]>(K.PHOTOS, []);
    const photo: ProgressPhoto = { id: await nextId(all), ...p };
    await setJSON(K.PHOTOS, [...all, photo]);
    return photo;
  },

  async deleteProgressPhoto(id: number) {
    const all = await getJSON<ProgressPhoto[]>(K.PHOTOS, []);
    await setJSON(K.PHOTOS, all.filter(p => p.id !== id));
  },

  async clearAll() {
    await Promise.all(Object.values(K).map(k => AsyncStorage.removeItem(k)));
  },
};
