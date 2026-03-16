import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  TextInput, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring, FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

type Exercise = { name: string; sets: number; reps: number; weight: number; done: boolean };

const DEFAULT_EXERCISES: Exercise[] = [
  { name: "Push-ups", sets: 3, reps: 12, weight: 0, done: false },
  { name: "Squats", sets: 3, reps: 15, weight: 0, done: false },
  { name: "Plank", sets: 3, reps: 60, weight: 0, done: false },
  { name: "Lunges", sets: 3, reps: 12, weight: 0, done: false },
];

function TimerDisplay({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    <Text style={styles.timerText}>
      {h > 0 ? `${String(h).padStart(2, "0")}:` : ""}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </Text>
  );
}

function PulseRing({ isRunning }: { isRunning: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (isRunning) {
      scale.value = withRepeat(withSequence(withTiming(1.3, { duration: 800 }), withTiming(1, { duration: 800 })), -1, false);
      opacity.value = withRepeat(withSequence(withTiming(0.15, { duration: 800 }), withTiming(0.6, { duration: 800 })), -1, false);
    } else {
      scale.value = withSpring(1);
      opacity.value = withSpring(0.6);
    }
  }, [isRunning]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.pulseRing, style]} />;
}

export default function ActiveWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user } = useAuth();

  const [workoutName, setWorkoutName] = useState("Morning Workout");
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  function toggleTimer() {
    setIsRunning(prev => !prev);
  }

  function toggleExercise(idx: number) {
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, done: !ex.done } : ex));
  }

  function addExercise() {
    setExercises(prev => [...prev, { name: "New Exercise", sets: 3, reps: 10, weight: 0, done: false }]);
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }

  const completedCount = exercises.filter(e => e.done).length;
  const progress = exercises.length > 0 ? completedCount / exercises.length : 0;
  const estimatedCalories = Math.round((seconds / 60) * 8);

  async function finishWorkout() {
    if (!user?.id) return;
    if (seconds < 30) {
      Alert.alert("Too Short", "Complete at least 30 seconds of workout to save.");
      return;
    }

    setSaving(true);
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    try {
      await fetch(`${API_BASE}/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          workoutName,
          category: "strength",
          duration: Math.ceil(seconds / 60),
          caloriesBurned: estimatedCalories,
          exercises: exercises.map(e => ({ exerciseName: e.name, sets: e.sets, reps: e.reps, weight: e.weight })),
          completedAt: new Date().toISOString(),
        }),
      });

      await fetch(`${API_BASE}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          date: new Date().toISOString().split("T")[0],
          workoutsCompleted: 1,
          caloriesBurned: estimatedCalories,
          minutesActive: Math.ceil(seconds / 60),
        }),
      });

      router.replace("/workout/complete");
    } catch (err) {
      Alert.alert("Error", "Failed to save workout. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function confirmFinish() {
    Alert.alert("Finish Workout?", `You've completed ${completedCount}/${exercises.length} exercises.`, [
      { text: "Keep Going", style: "cancel" },
      { text: "Finish", style: "default", onPress: finishWorkout },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: "#0A0A1A" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity
          onPress={() => Alert.alert("Quit Workout?", "Your progress will not be saved.", [
            { text: "Stay", style: "cancel" },
            { text: "Quit", style: "destructive", onPress: () => router.back() },
          ])}
        >
          <Ionicons name="close" size={26} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <TextInput
          style={styles.workoutNameInput}
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Workout name"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <TouchableOpacity
          style={[styles.finishBtn, saving && { opacity: 0.5 }]}
          onPress={confirmFinish}
          disabled={saving}
        >
          <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.finishBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.finishBtnText}>{saving ? "Saving..." : "Finish"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Timer Section */}
      <View style={styles.timerSection}>
        <View style={styles.timerCircle}>
          <PulseRing isRunning={isRunning} />
          <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.timerInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <TimerDisplay seconds={seconds} />
            <Text style={styles.timerLabel}>elapsed</Text>
          </LinearGradient>
        </View>

        <View style={styles.timerControls}>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={toggleTimer}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isRunning ? ["#EF4444", "#DC2626"] : ["#6C63FF", "#9C8FFF"]}
              style={styles.playBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={isRunning ? "pause" : "play"} size={28} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => { setSeconds(0); setIsRunning(false); }}
          >
            <Ionicons name="refresh" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        {/* Progress + Calories */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.ceil(seconds / 60)}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{estimatedCalories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedCount}/{exercises.length}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Exercises */}
      <ScrollView
        style={styles.exerciseList}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {exercises.map((ex, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(i * 60).springify()}>
            <TouchableOpacity
              style={[styles.exerciseRow, ex.done && styles.exerciseRowDone]}
              onPress={() => toggleExercise(i)}
              onLongPress={() => removeExercise(i)}
              activeOpacity={0.8}
            >
              <View style={[styles.exCheck, ex.done && styles.exCheckDone]}>
                {ex.done && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exName, ex.done && styles.exNameDone]}>{ex.name}</Text>
                <Text style={styles.exMeta}>{ex.sets} sets × {ex.reps} reps{ex.weight > 0 ? ` · ${ex.weight}kg` : ""}</Text>
              </View>
              <MaterialCommunityIcons name="weight-lifter" size={18} color={ex.done ? "#22C55E" : "rgba(255,255,255,0.3)"} />
            </TouchableOpacity>
          </Animated.View>
        ))}

        <TouchableOpacity style={styles.addExBtn} onPress={addExercise}>
          <Ionicons name="add-circle-outline" size={20} color="rgba(108,99,255,0.8)" />
          <Text style={styles.addExText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  workoutNameInput: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFF", textAlign: "center" },
  finishBtn: { borderRadius: 10, overflow: "hidden" },
  finishBtnGrad: { paddingHorizontal: 16, paddingVertical: 8 },
  finishBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  timerSection: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 16 },
  timerCircle: { width: 160, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  pulseRing: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "#6C63FF" },
  timerInner: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center" },
  timerText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFF", letterSpacing: -1 },
  timerLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  timerControls: { flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 20 },
  playBtn: { borderRadius: 40, overflow: "hidden", shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  playBtnGrad: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  resetBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 32, marginBottom: 16 },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFF" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  progressTrack: { width: "100%", height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#6C63FF", borderRadius: 2 },
  exerciseList: { flex: 1, paddingHorizontal: 20 },
  exerciseRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 10,
  },
  exerciseRowDone: { backgroundColor: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)" },
  exCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  exCheckDone: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  exName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  exNameDone: { color: "rgba(255,255,255,0.5)", textDecorationLine: "line-through" },
  exMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", marginTop: 2 },
  addExBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(108,99,255,0.3)", borderStyle: "dashed" },
  addExText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(108,99,255,0.8)" },
});
