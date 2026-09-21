import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  TextInput, Alert, Modal, Pressable,
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
import { useLocalSearchParams } from "expo-router";
import { LocalStore, SEED_EXERCISES } from "@/lib/localStore";
import { apiRequest, ApiError } from "@/lib/api";

type Exercise = { name: string; sets: number; reps: number; weight: number; done: boolean };

const AUTO_WORKOUT_DURATION_SECONDS = 20 * 60;

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

  const params = useLocalSearchParams<{ name?: string; category?: string; exercises?: string; duration?: string }>();
  const initialExercises: Exercise[] = params.exercises
    ? params.exercises.split(",").map(n => ({ name: n, sets: 3, reps: 12, weight: 0, done: false }))
    : DEFAULT_EXERCISES;
  const initialDuration = params.duration ? Number(params.duration) : null;
  const [workoutName, setWorkoutName] = useState(params.name || "Morning Workout");
  const [category] = useState(params.category || "strength");
  const [autoDurationMinutes, setAutoDurationMinutes] = useState<number | null>(
    initialDuration && Number.isFinite(initialDuration) && initialDuration > 0 ? initialDuration : null,
  );
  const [durationInput, setDurationInput] = useState("20");
  const [isRunning, setIsRunning] = useState(autoDurationMinutes !== null);
  const [seconds, setSeconds] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsPerExercise = autoDurationMinutes && exercises.length > 0
    ? (autoDurationMinutes * 60) / exercises.length
    : AUTO_WORKOUT_DURATION_SECONDS / Math.max(exercises.length, 1);
  const automaticDoneCount = Math.min(
    exercises.length,
    Math.floor(seconds / secondsPerExercise),
  );

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  function chooseDuration(minutes: number) {
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) return;
    const normalized = Math.round(minutes * 10) / 10;
    setAutoDurationMinutes(normalized);
    setDurationInput(String(normalized));
    setIsRunning(true);
  }

  function toggleTimer() {
    if (!autoDurationMinutes) return;
    setIsRunning(prev => !prev);
  }

  useEffect(() => {
    if (automaticDoneCount <= 0) return;
    setExercises(prev => {
      let changed = false;
      const next = prev.map((ex, index) => {
        if (index < automaticDoneCount && !ex.done) {
          changed = true;
          return { ...ex, done: true };
        }
        return ex;
      });
      return changed ? next : prev;
    });
  }, [automaticDoneCount]);

  function toggleExercise(idx: number) {
    // Exercises completed by the timer stay completed. Manual tapping remains
    // available for exercises that have not reached their scheduled interval.
    if (idx < automaticDoneCount) return;
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, done: !ex.done } : ex));
  }

  function addExercise() {
    setPickerOpen(true);
  }

  function chooseExercise(name: string) {
    if (exercises.some(ex => ex.name === name)) {
      setPickerOpen(false);
      return;
    }
    setExercises(prev => [...prev, { name, sets: 3, reps: 12, weight: 0, done: false }]);
    setPickerOpen(false);
  }

  function cancelWorkout() {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    router.replace("/(tabs)/workout");
  }

  function removeExercise(idx: number) {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }

  function resetWorkout() {
    setSeconds(0);
    setIsRunning(false);
    setExercises(prev => prev.map(ex => ({ ...ex, done: false })));
  }

  const completedCount = exercises.filter((e, index) => e.done || index < automaticDoneCount).length;
  const progress = exercises.length > 0 ? completedCount / exercises.length : 0;
  const estimatedCalories = Math.round((seconds / 60) * 8);

  async function finishWorkout() {
    if (!user?.id) return;
    setSaving(true);
    if (isRunning) {
      setIsRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    try {
      const completedAt = new Date().toISOString();
      const workoutPayload = {
        userId: user.id,
        workoutName,
        category,
        duration: Math.max(1, Math.ceil(seconds / 60)),
        caloriesBurned: estimatedCalories,
        exercises: exercises.map((e, index) => ({
          exerciseName: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          completed: e.done || index < automaticDoneCount,
        })),
        completedAt,
      };
      try {
        await apiRequest("/workouts", { method: "POST", body: JSON.stringify(workoutPayload) });
      } catch (error) {
        if (!(error instanceof ApiError) || !error.offline) throw error;
        await LocalStore.addWorkout(workoutPayload);
      }

      router.replace({
        pathname: "/workout/complete",
        params: {
          duration: String(Math.max(1, Math.ceil(seconds / 60))),
          calories: String(estimatedCalories),
          exercises: String(completedCount),
        },
      });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save workout.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: "#0A0A1A" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity
          onPress={cancelWorkout}
          accessibilityLabel="Cancel workout"
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
          onPress={finishWorkout}
          accessibilityLabel="Finish workout"
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
            onPress={resetWorkout}
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
              style={[styles.exerciseRow, (ex.done || i < automaticDoneCount) && styles.exerciseRowDone]}
              onPress={() => toggleExercise(i)}
              onLongPress={() => removeExercise(i)}
              activeOpacity={0.8}
            >
              <View style={[styles.exCheck, (ex.done || i < automaticDoneCount) && styles.exCheckDone]}>
                {(ex.done || i < automaticDoneCount) && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exName, (ex.done || i < automaticDoneCount) && styles.exNameDone]}>{ex.name}</Text>
                <Text style={styles.exMeta}>{ex.sets} sets × {ex.reps} reps{ex.weight > 0 ? ` · ${ex.weight}kg` : ""}</Text>
              </View>
              <MaterialCommunityIcons name="weight-lifter" size={18} color={ex.done || i < automaticDoneCount ? "#22C55E" : "rgba(255,255,255,0.3)"} />
            </TouchableOpacity>
          </Animated.View>
        ))}

        <TouchableOpacity style={styles.addExBtn} onPress={addExercise}>
          <Ionicons name="add-circle-outline" size={20} color="rgba(108,99,255,0.8)" />
          <Text style={styles.addExText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!autoDurationMinutes} transparent animationType="fade" onRequestClose={() => router.back()}>
        <View style={styles.durationBackdrop}>
          <View style={styles.durationCard}>
            <Text style={styles.durationTitle}>Choose Workout Duration</Text>
            <Text style={styles.durationSub}>Tasks will complete equally as the timer runs.</Text>
            <View style={styles.durationOptions}>
              {[10, 20, 30].map(minutes => (
                <TouchableOpacity key={minutes} style={styles.durationOption} onPress={() => chooseDuration(minutes)}>
                  <Text style={styles.durationOptionText}>{minutes} min</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.durationInput}
              value={durationInput}
              onChangeText={setDurationInput}
              keyboardType="decimal-pad"
              placeholder="Custom minutes"
              placeholderTextColor="rgba(255,255,255,0.35)"
            />
            <TouchableOpacity
              style={styles.durationCustomButton}
              onPress={() => chooseDuration(Number(durationInput))}
            >
              <Text style={styles.durationCustomText}>Use Custom Duration</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.durationCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Add Exercise</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} accessibilityLabel="Close exercise picker">
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {SEED_EXERCISES.map(ex => {
                const alreadyAdded = exercises.some(item => item.name === ex.name);
                return (
                  <Pressable
                    key={ex.id}
                    style={[styles.pickerRow, alreadyAdded && styles.pickerRowDisabled]}
                    onPress={() => chooseExercise(ex.name)}
                    disabled={alreadyAdded}
                  >
                    <View style={styles.pickerIcon}>
                      <MaterialCommunityIcons name="dumbbell" size={18} color="#9C8FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerName}>{ex.name}</Text>
                      <Text style={styles.pickerMeta}>{ex.muscleGroup} · {ex.equipment}</Text>
                    </View>
                    {alreadyAdded
                      ? <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                      : <Ionicons name="add-circle-outline" size={22} color="#9C8FFF" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  workoutNameInput: { flex: 1, fontSize: 16, fontWeight: "600", color: "#FFF", textAlign: "center" },
  finishBtn: { borderRadius: 10, overflow: "hidden" },
  finishBtnGrad: { paddingHorizontal: 16, paddingVertical: 8 },
  finishBtnText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
  timerSection: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 16 },
  timerCircle: { width: 160, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  pulseRing: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "#6C63FF" },
  timerInner: { width: 140, height: 140, borderRadius: 70, alignItems: "center", justifyContent: "center" },
  timerText: { fontSize: 32, fontWeight: "700", color: "#FFF", letterSpacing: -1 },
  timerLabel: { fontSize: 11, fontWeight: "400", color: "rgba(255,255,255,0.7)" },
  timerControls: { flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 20 },
  playBtn: { borderRadius: 40, overflow: "hidden", shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  playBtnGrad: { width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  resetBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 32, marginBottom: 16 },
  statItem: { alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontWeight: "700", color: "#FFF" },
  statLabel: { fontSize: 11, fontWeight: "400", color: "rgba(255,255,255,0.5)" },
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
  exName: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  exNameDone: { color: "rgba(255,255,255,0.5)", textDecorationLine: "line-through" },
  exMeta: { fontSize: 12, fontWeight: "400", color: "rgba(255,255,255,0.4)", marginTop: 2 },
  addExBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(108,99,255,0.3)", borderStyle: "dashed" },
  addExText: { fontSize: 14, fontWeight: "500", color: "rgba(108,99,255,0.8)" },
  durationBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", padding: 24 },
  durationCard: { width: "100%", maxWidth: 360, backgroundColor: "#17152D", borderRadius: 24, padding: 24, alignItems: "center" },
  durationTitle: { color: "#FFF", fontSize: 20, fontWeight: "700", textAlign: "center" },
  durationSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", marginTop: 8, marginBottom: 20 },
  durationOptions: { flexDirection: "row", gap: 8, width: "100%" },
  durationOption: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: "rgba(108,99,255,0.18)", borderWidth: 1, borderColor: "rgba(108,99,255,0.45)", alignItems: "center" },
  durationOptionText: { color: "#9C8FFF", fontSize: 14, fontWeight: "700" },
  durationInput: { width: "100%", color: "#FFF", backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, textAlign: "center", marginTop: 14 },
  durationCustomButton: { width: "100%", borderRadius: 12, backgroundColor: "#6C63FF", paddingVertical: 13, alignItems: "center", marginTop: 10 },
  durationCustomText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  durationCancel: { color: "rgba(255,255,255,0.55)", fontSize: 14, padding: 14 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  pickerCard: { maxHeight: "82%", backgroundColor: "#17152D", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  pickerTitle: { color: "#FFF", fontSize: 20, fontWeight: "700" },
  pickerList: { flexGrow: 0 },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  pickerRowDisabled: { opacity: 0.55 },
  pickerIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(108,99,255,0.16)", alignItems: "center", justifyContent: "center" },
  pickerName: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  pickerMeta: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 3 },
});
