import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { LocalStore, Achievement } from "@/lib/localStore";

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

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setUnlocked(await LocalStore.getAchievements(user.id));
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unlockedTitles = new Set(unlocked.map(a => a.title));
  const allWithStatus = ALL_ACHIEVEMENTS.map(def => ({
    ...def,
    unlocked: unlockedTitles.has(def.title),
    unlockedAt: unlocked.find(a => a.title === def.title)?.unlockedAt,
  }));

  const grouped = {
    milestone: allWithStatus.filter(a => a.category === "milestone"),
    streak: allWithStatus.filter(a => a.category === "streak"),
    burn: allWithStatus.filter(a => a.category === "burn"),
    wellness: allWithStatus.filter(a => a.category === "wellness"),
    habit: allWithStatus.filter(a => a.category === "habit"),
  };

  const totalUnlocked = unlocked.length;
  const pct = Math.round((totalUnlocked / ALL_ACHIEVEMENTS.length) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Achievements</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient colors={["#F59E0B", "#FF6B35"]} style={styles.summary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryNum}>{totalUnlocked}</Text>
              <Text style={styles.summaryTotal}>/ {ALL_ACHIEVEMENTS.length} unlocked</Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryLabel}>Progress</Text>
              <View style={styles.summaryBar}>
                <View style={[styles.summaryFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.summaryPct}>{pct}% complete</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {Object.entries(grouped).map(([category, items], gi) => {
          const labels: Record<string, { title: string; desc: string }> = {
            milestone: { title: "Milestones", desc: "Workout count goals" },
            streak: { title: "Streaks", desc: "Consistency rewards" },
            burn: { title: "Calorie Burners", desc: "Total calories burned" },
            wellness: { title: "Wellness", desc: "Healthy habit goals" },
            habit: { title: "Habits", desc: "Special routines" },
          };
          return (
            <Animated.View key={category} entering={FadeInDown.delay(100 + gi * 80).springify()}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{labels[category].title}</Text>
                <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>{labels[category].desc}</Text>
              </View>
              <View style={styles.grid}>
                {items.map((a, i) => (
                  <View
                    key={i}
                    style={[
                      styles.achCard,
                      { backgroundColor: colors.card, borderColor: a.unlocked ? colors.primary + "55" : colors.border },
                      !a.unlocked && { opacity: 0.5 },
                    ]}
                  >
                    {a.unlocked && (
                      <View style={styles.unlockedBadge}>
                        <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                      </View>
                    )}
                    <Text style={[styles.achIcon, !a.unlocked && { opacity: 0.4 }]}>{a.icon}</Text>
                    <Text style={[styles.achTitle, { color: colors.text }]}>{a.title}</Text>
                    <Text style={[styles.achDesc, { color: colors.textMuted }]}>{a.description}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, marginBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  summary: { borderRadius: 22, padding: 22, flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 24 },
  summaryLeft: { alignItems: "flex-start" },
  summaryNum: { fontSize: 56, fontWeight: "700", color: "#FFF", letterSpacing: -2 },
  summaryTotal: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.8)", marginTop: -8 },
  summaryRight: { flex: 1, gap: 6 },
  summaryLabel: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.85)" },
  summaryBar: { height: 8, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 4, overflow: "hidden" },
  summaryFill: { height: "100%", backgroundColor: "#FFF", borderRadius: 4 },
  summaryPct: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.8)" },
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "600" },
  sectionDesc: { fontSize: 12, fontWeight: "400", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  achCard: { width: "47.5%", borderRadius: 16, padding: 14, borderWidth: 1.5, alignItems: "center", gap: 6, position: "relative" },
  unlockedBadge: { position: "absolute", top: 8, right: 8 },
  achIcon: { fontSize: 36 },
  achTitle: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  achDesc: { fontSize: 11, fontWeight: "400", textAlign: "center" },
});
