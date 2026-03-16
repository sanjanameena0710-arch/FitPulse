import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

const CATEGORIES = ["All", "Strength", "Cardio", "HIIT", "Flexibility", "Yoga"];

const EXERCISE_ICONS: Record<string, string> = {
  strength: "weight-lifter",
  cardio: "bike",
  flexibility: "yoga",
  yoga: "leaf",
  hiit: "fire",
};

type Exercise = {
  id: number;
  name: string;
  category: string;
  muscleGroup: string;
  difficulty: string;
  description: string;
  caloriesPerMinute: number;
  equipment: string;
};

type WorkoutPlan = {
  id: number;
  name: string;
  description: string;
  level: string;
  duration: number;
  category: string;
  isPremium: boolean;
  exercises: string[];
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: "#22C55E",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"plans" | "exercises">("plans");

  const { data: exercises = [] } = useQuery<Exercise[]>({
    queryKey: ["exercises"],
    queryFn: async () => (await fetch(`${API_BASE}/exercises`)).json(),
  });

  const { data: plans = [] } = useQuery<WorkoutPlan[]>({
    queryKey: ["workout-plans"],
    queryFn: async () => (await fetch(`${API_BASE}/workout-plans`)).json(),
  });

  const filteredExercises = exercises.filter(e => {
    const matchCat = selectedCategory === "All" || e.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

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
          <Text style={[styles.title, { color: colors.text }]}>Workouts</Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push("/workout/active")}
          >
            <LinearGradient colors={["#6C63FF", "#FF6B35"]} style={styles.startBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={styles.startBtnText}>Start</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["plans", "exercises"] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              {activeTab === tab && (
                <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={StyleSheet.absoluteFill} borderRadius={10} />
              )}
              <Text style={[styles.tabText, { color: activeTab === tab ? "#FFF" : colors.textSecondary }]}>
                {tab === "plans" ? "Workout Plans" : "Exercises"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "exercises" && (
          <>
            <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search exercises..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, selectedCategory === cat && styles.catChipActive, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  {selectedCategory === cat && <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={StyleSheet.absoluteFill} borderRadius={20} />}
                  <Text style={[styles.catText, { color: selectedCategory === cat ? "#FFF" : colors.textSecondary }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ gap: 10 }}>
              {filteredExercises.map((ex, i) => (
                <Animated.View key={ex.id} entering={FadeInDown.delay(i * 50).springify()}>
                  <TouchableOpacity
                    style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.exIcon, { backgroundColor: "#6C63FF22" }]}>
                      <MaterialCommunityIcons name={EXERCISE_ICONS[ex.category] as any || "weight-lifter"} size={22} color="#6C63FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exName, { color: colors.text }]}>{ex.name}</Text>
                      <Text style={[styles.exMeta, { color: colors.textMuted }]}>{ex.muscleGroup} · {ex.equipment}</Text>
                    </View>
                    <View style={styles.exRight}>
                      <View style={[styles.diffBadge, { backgroundColor: LEVEL_COLORS[ex.difficulty] + "22" }]}>
                        <Text style={[styles.diffText, { color: LEVEL_COLORS[ex.difficulty] }]}>{ex.difficulty}</Text>
                      </View>
                      <Text style={[styles.calText, { color: colors.textMuted }]}>{ex.caloriesPerMinute} cal/min</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </>
        )}

        {activeTab === "plans" && (
          <View style={{ gap: 14 }}>
            {plans.map((plan, i) => (
              <Animated.View key={plan.id} entering={FadeInDown.delay(i * 80).springify()}>
                <TouchableOpacity
                  style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push("/workout/active")}
                  activeOpacity={0.85}
                >
                  <View style={styles.planHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.planTags}>
                        <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[plan.level] + "22" }]}>
                          <Text style={[styles.levelText, { color: LEVEL_COLORS[plan.level] }]}>{plan.level}</Text>
                        </View>
                        {plan.isPremium && (
                          <LinearGradient colors={["#F59E0B", "#FF6B35"]} style={styles.premiumBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                            <Ionicons name="star" size={10} color="#FFF" />
                            <Text style={styles.premiumText}>Premium</Text>
                          </LinearGradient>
                        )}
                      </View>
                      <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                      <Text style={[styles.planDesc, { color: colors.textSecondary }]}>{plan.description}</Text>
                    </View>
                  </View>

                  <View style={styles.planDetails}>
                    <View style={styles.planDetail}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.planDetailText, { color: colors.textMuted }]}>{plan.duration} weeks</Text>
                    </View>
                    <View style={styles.planDetail}>
                      <MaterialCommunityIcons name="weight-lifter" size={14} color={colors.textMuted} />
                      <Text style={[styles.planDetailText, { color: colors.textMuted }]}>{plan.exercises.length} exercises</Text>
                    </View>
                    <View style={styles.planDetail}>
                      <MaterialCommunityIcons name="tag-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.planDetailText, { color: colors.textMuted }]}>{plan.category}</Text>
                    </View>
                  </View>

                  <LinearGradient
                    colors={plan.isPremium ? ["#F59E0B22", "#FF6B3511"] : ["#6C63FF22", "#9C8FFF11"]}
                    style={styles.planStartBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={[styles.planStartText, { color: plan.isPremium ? "#F59E0B" : "#6C63FF" }]}>
                      {plan.isPremium ? "Upgrade to Start" : "Start Plan"}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={plan.isPremium ? "#F59E0B" : "#6C63FF"} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  startBtn: { borderRadius: 12, overflow: "hidden" },
  startBtnGrad: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  startBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  tabs: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1 },
  tab: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", overflow: "hidden" },
  tabActive: {},
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  categories: { marginHorizontal: -20, paddingLeft: 20, marginBottom: 16 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  catChipActive: {},
  catText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  exerciseCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, padding: 14, borderWidth: 1 },
  exIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  exName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  exMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  exRight: { alignItems: "flex-end", gap: 4 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diffText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  calText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  planCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 14 },
  planHeader: { flexDirection: "row", gap: 14 },
  planTags: { flexDirection: "row", gap: 8, marginBottom: 8 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  levelText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  premiumBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  premiumText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  planName: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  planDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 19 },
  planDetails: { flexDirection: "row", gap: 16 },
  planDetail: { flexDirection: "row", alignItems: "center", gap: 4 },
  planDetailText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  planStartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 12, gap: 6 },
  planStartText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
