import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

const { width } = Dimensions.get("window");
const chartWidth = width - 80;
const maxBarHeight = 100;

type ProgressSummary = {
  weeklyCalories: { day: string; calories: number }[];
  monthlyWorkouts: { week: string; count: number }[];
  totalThisMonth: number;
  averageCaloriesPerWorkout: number;
};

type Goal = {
  id: number;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  completed: boolean;
};

type Stats = {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  thisWeekWorkouts: number;
};

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user } = useAuth();
  const [period, setPeriod] = useState<"week" | "month">("week");

  const { data: summary } = useQuery<ProgressSummary>({
    queryKey: ["progress-summary", user?.id],
    queryFn: async () => (await fetch(`${API_BASE}/progress/summary?userId=${user?.id}`)).json(),
    enabled: !!user?.id,
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["goals", user?.id],
    queryFn: async () => (await fetch(`${API_BASE}/goals?userId=${user?.id}`)).json(),
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["stats", user?.id],
    queryFn: async () => (await fetch(`${API_BASE}/users/stats?userId=${user?.id}`)).json(),
    enabled: !!user?.id,
  });

  const chartData = period === "week"
    ? (summary?.weeklyCalories || [{ day: "Sun", calories: 0 }, { day: "Mon", calories: 280 }, { day: "Tue", calories: 0 }, { day: "Wed", calories: 320 }, { day: "Thu", calories: 0 }, { day: "Fri", calories: 410 }, { day: "Sat", calories: 180 }])
    : (summary?.monthlyWorkouts || []).map(m => ({ day: m.week, calories: m.count * 100 }));

  const maxVal = Math.max(...chartData.map(d => d.calories), 1);

  const GOAL_ICONS: Record<string, string> = {
    fitness: "trophy",
    weight: "scale",
    strength: "barbell",
    cardio: "bicycle",
    general: "star",
  };

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
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Progress</Text>
        </View>

        {/* Stats Overview */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient colors={["#1A0A2E", "#0F172A"]} style={styles.overviewCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.overviewTitle}>All-Time Stats</Text>
            <View style={styles.overviewGrid}>
              {[
                { label: "Total Workouts", value: stats?.totalWorkouts || 0, icon: "barbell-outline", color: "#6C63FF" },
                { label: "Calories Burned", value: stats?.totalCaloriesBurned?.toLocaleString() || 0, icon: "flame", color: "#FF6B35" },
                { label: "Minutes Active", value: stats?.totalMinutes || 0, icon: "time", color: "#00D4FF" },
                { label: "Best Streak", value: `${stats?.longestStreak || 0}d`, icon: "trophy", color: "#F59E0B" },
              ].map((s, i) => (
                <View key={i} style={styles.overviewItem}>
                  <View style={[styles.overviewIcon, { backgroundColor: s.color + "22" }]}>
                    <Ionicons name={s.icon as any} size={18} color={s.color} />
                  </View>
                  <Text style={styles.overviewValue}>{s.value}</Text>
                  <Text style={styles.overviewLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Chart */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {period === "week" ? "Weekly Calories" : "Monthly Workouts"}
            </Text>
            <View style={[styles.periodTabs, { backgroundColor: colors.background }]}>
              {(["week", "month"] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodTab, period === p && styles.periodTabActive]}
                  onPress={() => setPeriod(p)}
                >
                  {period === p && <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={StyleSheet.absoluteFill} borderRadius={8} />}
                  <Text style={[styles.periodTabText, { color: period === p ? "#FFF" : colors.textMuted }]}>
                    {p === "week" ? "Week" : "Month"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chart}>
            {chartData.map((d, i) => {
              const barH = maxVal > 0 ? Math.max((d.calories / maxVal) * maxBarHeight, d.calories > 0 ? 8 : 4) : 4;
              return (
                <View key={i} style={styles.barGroup}>
                  <View style={[styles.barTrack, { height: maxBarHeight }]}>
                    <LinearGradient
                      colors={d.calories > 0 ? ["#6C63FF", "#9C8FFF"] : [colors.border, colors.border]}
                      style={[styles.bar, { height: barH }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textMuted }]}>{d.day.slice(0, 3)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="fire" size={14} color="#FF6B35" />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                Avg {summary?.averageCaloriesPerWorkout || 0} cal/workout
              </Text>
            </View>
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>
              {summary?.totalThisMonth || 0} this month
            </Text>
          </View>
        </Animated.View>

        {/* Goals */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Goals</Text>
          </View>

          {goals.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No goals set yet</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {goals.map((goal, i) => {
                const pct = Math.min(goal.currentValue / goal.targetValue, 1);
                return (
                  <Animated.View key={goal.id} entering={FadeInDown.delay(300 + i * 80).springify()}>
                    <View style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.goalHeader}>
                        <View style={[styles.goalIcon, { backgroundColor: "#6C63FF22" }]}>
                          <Ionicons name={GOAL_ICONS[goal.category] as any || "star"} size={18} color="#6C63FF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                          <Text style={[styles.goalMeta, { color: colors.textMuted }]}>
                            {goal.currentValue} / {goal.targetValue} {goal.unit}
                          </Text>
                        </View>
                        {goal.completed && (
                          <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                          </View>
                        )}
                      </View>
                      <AnimatedProgressBar
                        progress={pct}
                        color={goal.completed ? "#22C55E" : "#6C63FF"}
                        value={`${Math.round(pct * 100)}%`}
                      />
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { paddingVertical: 20 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  overviewCard: { borderRadius: 22, padding: 20, marginBottom: 16 },
  overviewTitle: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.6)", marginBottom: 16 },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  overviewItem: { width: "47%", alignItems: "flex-start", gap: 8 },
  overviewIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  overviewValue: { fontSize: 22, fontWeight: "700", color: "#FFF", letterSpacing: -0.5 },
  overviewLabel: { fontSize: 11, fontWeight: "400", color: "rgba(255,255,255,0.5)" },
  chartCard: { borderRadius: 22, padding: 20, borderWidth: 1, marginBottom: 24 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: "600" },
  periodTabs: { flexDirection: "row", borderRadius: 10, padding: 3 },
  periodTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, overflow: "hidden" },
  periodTabActive: {},
  periodTabText: { fontSize: 12, fontWeight: "500" },
  chart: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: maxBarHeight + 24 },
  barGroup: { flex: 1, alignItems: "center", gap: 6 },
  barTrack: { width: "60%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 10, fontWeight: "400" },
  chartLegend: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontSize: 12, fontWeight: "400" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "600" },
  emptyCard: { borderRadius: 18, padding: 28, borderWidth: 1, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "400" },
  goalCard: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12 },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  goalIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  goalTitle: { fontSize: 15, fontWeight: "600" },
  goalMeta: { fontSize: 12, fontWeight: "400", marginTop: 2 },
  completedBadge: {},
});
