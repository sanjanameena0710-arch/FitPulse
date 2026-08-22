import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions,
  Modal, TextInput, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";
import { LocalStore, Goal } from "@/lib/localStore";

const { width } = Dimensions.get("window");
const maxBarHeight = 100;

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user } = useAuth();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [stats, setStats] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [waterWeek, setWaterWeek] = useState<{ day: string; glasses: number }[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", target: "", unit: "workouts", category: "fitness" });

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [s, sum, g, w] = await Promise.all([
      LocalStore.getStats(user.id),
      LocalStore.getProgressSummary(user.id),
      LocalStore.getGoals(user.id),
      LocalStore.getWaterWeek(user.id),
    ]);
    setStats(s);
    setSummary(sum);
    setGoals(g);
    setWaterWeek(w);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAddGoal() {
    if (!user?.id) return;
    const target = parseFloat(newGoal.target);
    if (!newGoal.title.trim() || isNaN(target) || target <= 0) {
      Alert.alert("Invalid", "Please enter a title and valid target value");
      return;
    }
    await LocalStore.addGoal({
      userId: user.id,
      title: newGoal.title.trim(),
      targetValue: target,
      unit: newGoal.unit,
      category: newGoal.category,
    });
    setNewGoal({ title: "", target: "", unit: "workouts", category: "fitness" });
    setShowAddGoal(false);
    load();
  }

  async function deleteGoal(id: number) {
    Alert.alert("Delete Goal?", "This will remove the goal permanently.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await LocalStore.deleteGoal(id); load(); } },
    ]);
  }

  const chartData = period === "week"
    ? (summary?.weeklyCalories || [])
    : (summary?.monthlyWorkouts || []).map((m: any) => ({ day: m.week, calories: m.count * 100 }));

  const maxVal = Math.max(...chartData.map((d: any) => d.calories), 1);
  const maxWater = Math.max(...waterWeek.map(d => d.glasses), 8);

  const GOAL_ICONS: Record<string, string> = {
    fitness: "trophy",
    weight: "scale-bathroom",
    strength: "weight-lifter",
    cardio: "bike",
    general: "star",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), paddingBottom: insets.bottom + 100 }
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

        {/* Calorie Chart */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {period === "week" ? "Weekly Calories" : "Monthly Workouts"}
            </Text>
            <View style={[styles.periodTabs, { backgroundColor: colors.background }]}>
              {(["week", "month"] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={styles.periodTab}
                  onPress={() => setPeriod(p)}
                >
                  {period === p && <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={[StyleSheet.absoluteFill, { borderRadius: 8 }]} />}
                  <Text style={[styles.periodTabText, { color: period === p ? "#FFF" : colors.textMuted }]}>
                    {p === "week" ? "Week" : "Month"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chart}>
            {chartData.map((d: any, i: number) => {
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

        {/* Water Chart */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Water Intake (Last 7 Days)</Text>
            <View style={[styles.waterBadge, { backgroundColor: "#00D4FF22" }]}>
              <Ionicons name="water" size={14} color="#00D4FF" />
              <Text style={[styles.waterBadgeText, { color: "#00D4FF" }]}>Goal: 8/day</Text>
            </View>
          </View>
          <View style={styles.chart}>
            {waterWeek.map((d, i) => {
              const barH = (d.glasses / maxWater) * maxBarHeight;
              return (
                <View key={i} style={styles.barGroup}>
                  <View style={[styles.barTrack, { height: maxBarHeight }]}>
                    <LinearGradient
                      colors={d.glasses > 0 ? ["#00D4FF", "#0EA5E9"] : [colors.border, colors.border]}
                      style={[styles.bar, { height: Math.max(barH, d.glasses > 0 ? 8 : 4) }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textMuted }]}>{d.day}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Goals */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Goals</Text>
            <TouchableOpacity onPress={() => setShowAddGoal(true)} style={styles.addBtn}>
              <Ionicons name="add" size={18} color="#6C63FF" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No goals yet. Tap Add to create one!</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {goals.map((goal, i) => {
                const pct = Math.min(goal.currentValue / goal.targetValue, 1);
                return (
                  <Animated.View key={goal.id} entering={FadeInDown.delay(300 + i * 60).springify()}>
                    <TouchableOpacity
                      style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onLongPress={() => deleteGoal(goal.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.goalHeader}>
                        <View style={[styles.goalIcon, { backgroundColor: "#6C63FF22" }]}>
                          <MaterialCommunityIcons name={GOAL_ICONS[goal.category] as any || "star"} size={18} color="#6C63FF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
                          <Text style={[styles.goalMeta, { color: colors.textMuted }]}>
                            {goal.currentValue} / {goal.targetValue} {goal.unit}
                          </Text>
                        </View>
                        {goal.completed && (
                          <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                        )}
                      </View>
                      <AnimatedProgressBar
                        progress={pct}
                        color={goal.completed ? "#22C55E" : "#6C63FF"}
                        value={`${Math.round(pct * 100)}%`}
                      />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
              <Text style={[styles.hint, { color: colors.textMuted }]}>Long-press a goal to delete</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAddGoal} transparent animationType="slide" onRequestClose={() => setShowAddGoal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Goal</Text>
              <TouchableOpacity onPress={() => setShowAddGoal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              placeholder="Goal title (e.g. Workout 5 times)"
              placeholderTextColor={colors.textMuted}
              value={newGoal.title}
              onChangeText={v => setNewGoal(p => ({ ...p, title: v }))}
            />
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              placeholder="Target value (number)"
              placeholderTextColor={colors.textMuted}
              value={newGoal.target}
              onChangeText={v => setNewGoal(p => ({ ...p, target: v }))}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Unit</Text>
            <View style={styles.unitRow}>
              {["workouts", "min", "kg", "cal", "glasses", "km"].map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitChip, { borderColor: colors.border }, newGoal.unit === u && styles.unitChipActive]}
                  onPress={() => setNewGoal(p => ({ ...p, unit: u }))}
                >
                  <Text style={[styles.unitText, { color: newGoal.unit === u ? "#FFF" : colors.textSecondary }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.unitRow}>
              {["fitness", "weight", "strength", "cardio", "general"].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.unitChip, { borderColor: colors.border }, newGoal.category === c && styles.unitChipActive]}
                  onPress={() => setNewGoal(p => ({ ...p, category: c }))}
                >
                  <Text style={[styles.unitText, { color: newGoal.category === c ? "#FFF" : colors.textSecondary }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalBtn} onPress={handleAddGoal}>
              <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.modalBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.modalBtnText}>Create Goal</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  chartCard: { borderRadius: 22, padding: 20, borderWidth: 1, marginBottom: 16 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: "600", flex: 1 },
  periodTabs: { flexDirection: "row", borderRadius: 10, padding: 3 },
  periodTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, overflow: "hidden" },
  periodTabText: { fontSize: 12, fontWeight: "500" },
  waterBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  waterBadgeText: { fontSize: 11, fontWeight: "600" },
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
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(108,99,255,0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#6C63FF" },
  emptyCard: { borderRadius: 18, padding: 28, borderWidth: 1, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "400" },
  goalCard: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12 },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  goalIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  goalTitle: { fontSize: 15, fontWeight: "600" },
  goalMeta: { fontSize: 12, fontWeight: "400", marginTop: 2 },
  hint: { fontSize: 11, fontWeight: "400", textAlign: "center", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalSub: { fontSize: 13, fontWeight: "500", marginTop: 4 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  unitRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  unitChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  unitChipActive: { backgroundColor: "#6C63FF", borderColor: "#6C63FF" },
  unitText: { fontSize: 12, fontWeight: "500" },
  modalBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  modalBtnGrad: { paddingVertical: 16, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
