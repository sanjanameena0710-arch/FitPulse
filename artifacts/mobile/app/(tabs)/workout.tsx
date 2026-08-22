import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { LocalStore, Exercise, WorkoutPlan } from "@/lib/localStore";

const CATEGORIES = ["All", "Strength", "Cardio", "HIIT", "Flexibility", "Yoga"];

const EXERCISE_ICONS: Record<string, string> = {
  strength: "weight-lifter",
  cardio: "bike",
  flexibility: "yoga",
  yoga: "leaf",
  hiit: "fire",
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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);

  useEffect(() => {
    (async () => {
      setExercises(await LocalStore.getExercises());
      setPlans(await LocalStore.getPlans());
    })();
  }, []);

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
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.cameraBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/workout/camera")}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={18} color="#FF6B35" />
            </TouchableOpacity>
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
        </View>

        {/* Camera Detect Banner */}
        <Animated.View entering={FadeInDown.springify()}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/workout/camera")}
          >
            <LinearGradient
              colors={["#FF6B35", "#F59E0B"]}
              style={styles.cameraBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cameraBannerIcon}>
                <Ionicons name="videocam" size={26} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cameraBannerTitle}>Camera Rep Counter</Text>
                <Text style={styles.cameraBannerSub}>Use the live camera and confirm each rep as you train</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["plans", "exercises"] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              {activeTab === tab && (
                <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} />
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
                  style={[styles.catChip, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  {selectedCategory === cat && <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
                  <Text style={[styles.catText, { color: selectedCategory === cat ? "#FFF" : colors.textSecondary }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ gap: 10 }}>
              {filteredExercises.map((ex, i) => (
                <Animated.View key={ex.id} entering={FadeInDown.delay(i * 30).springify()}>
                  <TouchableOpacity
                    style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: "/workout/active", params: { name: ex.name, category: ex.category } })}
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
              <Animated.View key={plan.id} entering={FadeInDown.delay(i * 60).springify()}>
                <TouchableOpacity
                  style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: "/workout/active", params: { name: plan.name, category: plan.category, exercises: plan.exercises.join(",") } })}
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
                            <Text style={styles.premiumText}>Pro</Text>
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
                    colors={["#6C63FF22", "#9C8FFF11"]}
                    style={styles.planStartBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={[styles.planStartText, { color: "#6C63FF" }]}>Start Plan</Text>
                    <Ionicons name="arrow-forward" size={16} color="#6C63FF" />
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
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  cameraBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  startBtn: { borderRadius: 12, overflow: "hidden" },
  startBtnGrad: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  startBtnText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
  cameraBanner: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, marginBottom: 18, shadowColor: "#FF6B35", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  cameraBannerIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  cameraBannerTitle: { fontSize: 15, fontWeight: "700", color: "#FFF" },
  cameraBannerSub: { fontSize: 12, fontWeight: "400", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  tabs: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1 },
  tab: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", overflow: "hidden" },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: "600" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "400" },
  categories: { marginHorizontal: -20, paddingLeft: 20, marginBottom: 16 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  catText: { fontSize: 13, fontWeight: "500" },
  exerciseCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, padding: 14, borderWidth: 1 },
  exIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  exName: { fontSize: 15, fontWeight: "600" },
  exMeta: { fontSize: 12, fontWeight: "400", marginTop: 2 },
  exRight: { alignItems: "flex-end", gap: 4 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diffText: { fontSize: 11, fontWeight: "600" },
  calText: { fontSize: 11, fontWeight: "400" },
  planCard: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 14 },
  planHeader: { flexDirection: "row", gap: 14 },
  planTags: { flexDirection: "row", gap: 8, marginBottom: 8 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  levelText: { fontSize: 11, fontWeight: "600" },
  premiumBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  premiumText: { fontSize: 11, fontWeight: "600", color: "#FFF" },
  planName: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  planDesc: { fontSize: 13, fontWeight: "400", marginTop: 4, lineHeight: 19 },
  planDetails: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  planDetail: { flexDirection: "row", alignItems: "center", gap: 4 },
  planDetailText: { fontSize: 12, fontWeight: "400" },
  planStartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 12, gap: 6 },
  planStartText: { fontSize: 14, fontWeight: "600" },
});
