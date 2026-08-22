import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import FitPulseLogo from "@/components/FitPulseLogo";
import { LocalStore, Workout } from "@/lib/localStore";
import { apiRequest, ApiError } from "@/lib/api";

const QUICK_WORKOUTS = [
  { name: "Morning HIIT", duration: "20 min", calories: 280, color: "#FF6B35", icon: "flame", category: "hiit" },
  { name: "Upper Body", duration: "35 min", calories: 320, color: "#6C63FF", icon: "barbell", category: "strength" },
  { name: "Core Blast", duration: "15 min", calories: 160, color: "#00D4FF", icon: "body", category: "strength" },
  { name: "Leg Day", duration: "45 min", calories: 410, color: "#22C55E", icon: "walk", category: "strength" },
];

type Stats = {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  thisWeekWorkouts: number;
  currentStreak: number;
  bmi: number | null;
  bmiCategory: string | null;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [waterToday, setWaterToday] = useState(0);

  const load = useCallback(async () => {
    if (!user?.id) return;
    let s: Stats;
    let w: Workout[];
    try {
      const remoteStats = await apiRequest<Stats>(`/users/stats?userId=${user.id}`);
      const remoteWorkouts = await apiRequest<Workout[]>(`/workouts?userId=${user.id}&limit=5`);
      s = remoteStats;
      w = remoteWorkouts;
    } catch (error) {
      if (!(error instanceof ApiError) || !error.offline) throw error;
      s = await LocalStore.getStats(user.id);
      w = await LocalStore.getWorkouts(user.id, 5);
    }
    const water = await LocalStore.getWaterToday(user.id);
    setStats(s);
    setRecentWorkouts(w);
    setWaterToday(water);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function quickAddWater() {
    if (!user?.id) return;
    const newCount = Math.min(waterToday + 1, 12);
    await LocalStore.setWaterToday(user.id, newCount);
    setWaterToday(newCount);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const weeklyGoal = stats?.thisWeekWorkouts ?? 0;
  const weeklyTarget = 5;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            paddingBottom: insets.bottom + 100,
          }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting()}</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name?.split(" ")[0] || "Athlete"}</Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons name="person-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient
            colors={["#6C63FF", "#9C8FFF", "#FF6B35"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View>
                <Text style={styles.heroLabel}>Weekly Goal</Text>
                <Text style={styles.heroValue}>{weeklyGoal}/{weeklyTarget}</Text>
                <Text style={styles.heroSub}>Workouts completed</Text>
              </View>
              <View style={styles.heroRight}>
                <FitPulseLogo size={64} />
              </View>
            </View>

            <View style={styles.heroProgress}>
              <View style={styles.heroProgressTrack}>
                <View style={[styles.heroProgressFill, { width: `${Math.min((weeklyGoal / weeklyTarget) * 100, 100)}%` }]} />
              </View>
              <Text style={styles.heroProgressText}>{Math.round((weeklyGoal / weeklyTarget) * 100)}%</Text>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Ionicons name="flame" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroStatText}>{stats?.totalCaloriesBurned?.toLocaleString() || 0} cal total</Text>
              </View>
              <View style={styles.heroStat}>
                <MaterialCommunityIcons name="lightning-bolt" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroStatText}>{stats?.currentStreak || 0} day streak</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsRow}>
          {[
            { label: "Workouts", value: stats?.totalWorkouts || 0, icon: "barbell-outline", color: "#6C63FF" },
            { label: "This Week", value: stats?.thisWeekWorkouts || 0, icon: "calendar", color: "#FF6B35" },
            { label: "Streak", value: `${stats?.currentStreak || 0}d`, icon: "flame", color: "#F59E0B" },
          ].map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + "22" }]}>
                <Ionicons name={stat.icon as any} size={18} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Water Tracker */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <TouchableOpacity
            style={[styles.waterCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={quickAddWater}
            activeOpacity={0.85}
          >
            <View style={[styles.waterIcon, { backgroundColor: "#00D4FF22" }]}>
              <Ionicons name="water" size={22} color="#00D4FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.waterTitle, { color: colors.text }]}>Water today</Text>
              <Text style={[styles.waterSub, { color: colors.textMuted }]}>{waterToday}/8 glasses · tap to add</Text>
              <View style={styles.waterDots}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waterDot,
                      { backgroundColor: i < waterToday ? "#00D4FF" : colors.border },
                    ]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.waterPlus}>
              <Ionicons name="add" size={22} color="#00D4FF" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Start */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Start</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/workout")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={{ paddingRight: 24, gap: 12 }}>
            {QUICK_WORKOUTS.map((w, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: "/workout/active", params: { name: w.name, category: w.category } })}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIcon, { backgroundColor: w.color + "22" }]}>
                  <Ionicons name={w.icon as any} size={24} color={w.color} />
                </View>
                <Text style={[styles.quickName, { color: colors.text }]}>{w.name}</Text>
                <Text style={[styles.quickDetail, { color: colors.textMuted }]}>{w.duration}</Text>
                <View style={styles.quickFooter}>
                  <Ionicons name="flame-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.quickCalories, { color: colors.textMuted }]}>{w.calories} cal</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* BMI Card */}
        {stats?.bmi && (
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <View style={[styles.bmiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.bmiLeft}>
                <Text style={[styles.bmiLabel, { color: colors.textSecondary }]}>Your BMI</Text>
                <Text style={[styles.bmiValue, { color: colors.text }]}>{stats.bmi}</Text>
                <Text style={[styles.bmiCategory, { color: stats.bmiCategory === "Normal" ? "#22C55E" : "#F59E0B" }]}>{stats.bmiCategory}</Text>
              </View>
              <AnimatedProgressBar
                progress={Math.min((stats.bmi - 15) / 25, 1)}
                color={stats.bmiCategory === "Normal" ? "#22C55E" : "#F59E0B"}
                height={10}
              />
            </View>
          </Animated.View>
        )}

        {/* Recent Workouts */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Workouts</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/progress")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>History</Text>
            </TouchableOpacity>
          </View>

          {recentWorkouts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="barbell-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No workouts yet. Start your first one!</Text>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => router.push("/workout/active")}
              >
                <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.startBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.startBtnText}>Start Workout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {recentWorkouts.slice(0, 4).map((w) => (
                <View key={w.id} style={[styles.workoutItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.workoutIcon, { backgroundColor: "#6C63FF22" }]}>
                    <MaterialCommunityIcons name="weight-lifter" size={20} color="#6C63FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.workoutName, { color: colors.text }]}>{w.workoutName}</Text>
                    <Text style={[styles.workoutMeta, { color: colors.textMuted }]}>
                      {w.duration} min · {w.caloriesBurned} cal
                    </Text>
                  </View>
                  <Text style={[styles.workoutDate, { color: colors.textMuted }]}>
                    {w.completedAt ? new Date(w.completedAt).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/workout/active")}
        activeOpacity={0.85}
      >
        <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="play" size={26} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 20 },
  greeting: { fontSize: 14, fontWeight: "400" },
  userName: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  notifBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  heroCard: { borderRadius: 24, padding: 22, marginBottom: 16 },
  heroContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  heroLabel: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.7)", marginBottom: 4 },
  heroValue: { fontSize: 40, fontWeight: "700", color: "#FFF", letterSpacing: -1 },
  heroSub: { fontSize: 13, fontWeight: "400", color: "rgba(255,255,255,0.6)" },
  heroRight: { opacity: 0.8 },
  heroProgress: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  heroProgressTrack: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" },
  heroProgressFill: { height: "100%", backgroundColor: "#FFF", borderRadius: 3 },
  heroProgressText: { fontSize: 13, fontWeight: "600", color: "#FFF", width: 36, textAlign: "right" },
  heroStats: { flexDirection: "row", gap: 20 },
  heroStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroStatText: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.8)" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, alignItems: "center", gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "400" },
  waterCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, padding: 14, borderWidth: 1, marginBottom: 24 },
  waterIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  waterTitle: { fontSize: 15, fontWeight: "600" },
  waterSub: { fontSize: 12, fontWeight: "400", marginTop: 2, marginBottom: 8 },
  waterDots: { flexDirection: "row", gap: 4 },
  waterDot: { flex: 1, height: 6, borderRadius: 3 },
  waterPlus: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#00D4FF22", alignItems: "center", justifyContent: "center" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "600" },
  seeAll: { fontSize: 14, fontWeight: "500" },
  horizontalScroll: { marginHorizontal: -20, paddingLeft: 20, marginBottom: 24 },
  quickCard: { width: 140, borderRadius: 18, padding: 16, borderWidth: 1, gap: 8 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickName: { fontSize: 14, fontWeight: "600" },
  quickDetail: { fontSize: 12, fontWeight: "400" },
  quickFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  quickCalories: { fontSize: 11, fontWeight: "400" },
  bmiCard: { borderRadius: 18, padding: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 24 },
  bmiLeft: { width: 90 },
  bmiLabel: { fontSize: 12, fontWeight: "400", marginBottom: 4 },
  bmiValue: { fontSize: 28, fontWeight: "700" },
  bmiCategory: { fontSize: 13, fontWeight: "500" },
  emptyCard: { borderRadius: 20, padding: 28, borderWidth: 1, alignItems: "center", gap: 12, marginBottom: 20 },
  emptyText: { fontSize: 14, fontWeight: "400", textAlign: "center" },
  startBtn: { borderRadius: 14, overflow: "hidden", width: "100%" },
  startBtnGrad: { paddingVertical: 14, alignItems: "center" },
  startBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  workoutItem: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 14, borderWidth: 1 },
  workoutIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  workoutName: { fontSize: 15, fontWeight: "600" },
  workoutMeta: { fontSize: 12, fontWeight: "400", marginTop: 2 },
  workoutDate: { fontSize: 12, fontWeight: "400" },
  fab: { position: "absolute", bottom: 100, right: 20, shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  fabGrad: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
});
