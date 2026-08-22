import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Alert,
  Modal, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring, FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { useAuth } from "@/context/AuthContext";
import { LocalStore } from "@/lib/localStore";

const EXERCISE_OPTIONS = [
  { name: "Push-ups", calPerRep: 0.5, target: 15, color: "#6C63FF" },
  { name: "Squats", calPerRep: 0.4, target: 20, color: "#FF6B35" },
  { name: "Sit-ups", calPerRep: 0.3, target: 20, color: "#22C55E" },
  { name: "Jumping Jacks", calPerRep: 0.2, target: 30, color: "#00D4FF" },
  { name: "Burpees", calPerRep: 1.0, target: 10, color: "#EF4444" },
  { name: "Lunges", calPerRep: 0.4, target: 16, color: "#F59E0B" },
];

function PulseDot({ active }: { active: boolean }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (active) s.value = withRepeat(withSequence(withTiming(1.4, { duration: 600 }), withTiming(1, { duration: 600 })), -1, false);
    else s.value = withSpring(1);
  }, [active]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[styles.recordDot, style]} />;
}

function WebCameraPreview({ facing }: { facing: CameraType }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    async function openCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera is not supported in this browser.");
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing === "front" ? "user" : { exact: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        setError(err?.message || "Camera permission was denied.");
      }
    }
    openCamera();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [facing]);

  if (error) {
    return (
      <View style={styles.webPlaceholder}>
        <MaterialCommunityIcons name="camera-off" size={56} color="rgba(255,255,255,0.45)" />
        <Text style={styles.webPlaceholderText}>{error}</Text>
        <Text style={styles.webPlaceholderSub}>Allow camera access and use HTTPS to enable the live preview.</Text>
      </View>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("front");
  const [exercise, setExercise] = useState(EXERCISE_OPTIONS[0]);
  const [showPicker, setShowPicker] = useState(false);
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startTracking() {
    setTracking(true);
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }

  function pauseTracking() {
    setTracking(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function manualAddRep() {
    setReps(r => r + 1);
  }

  function reset() {
    pauseTracking();
    setReps(0);
    setSeconds(0);
  }

  function changeExercise(ex: typeof EXERCISE_OPTIONS[0]) {
    pauseTracking();
    setExercise(ex);
    setReps(0);
    setSeconds(0);
    setShowPicker(false);
  }

  function cancelSession() {
    pauseTracking();
    router.replace("/(tabs)/workout");
  }

  async function finishSession() {
    pauseTracking();
    if (reps === 0) {
      Alert.alert("No Reps", "Complete at least one rep before finishing.");
      return;
    }
    setShowSummary(true);
  }

  async function saveAsWorkout() {
    if (!user?.id) return;
    const calories = Math.round(reps * exercise.calPerRep);
    try {
      await LocalStore.addWorkout({
        userId: user.id,
        workoutName: `${exercise.name} (Camera)`,
        category: "strength",
        duration: Math.max(1, Math.ceil(seconds / 60)),
        caloriesBurned: calories,
        exercises: [{ exerciseName: exercise.name, sets: 1, reps, weight: 0 }],
        completedAt: new Date().toISOString(),
      });
      setShowSummary(false);
      router.replace({
        pathname: "/workout/complete",
        params: {
          duration: String(Math.max(1, Math.ceil(seconds / 60))),
          calories: String(calories),
          exercises: "1",
        },
      });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save workout");
    }
  }

  const formattedTime = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const calories = Math.round(reps * exercise.calPerRep);
  const targetPct = Math.min(reps / exercise.target, 1);

  // Permission handling
  if (!permission) {
    return <View style={[styles.container, { backgroundColor: "#000" }]} />;
  }

  if (Platform.OS !== "web" && !permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top + 40 }]}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={56} color="#6C63FF" />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            FitPulse needs camera access to detect your reps and form during workouts. Your video never leaves the device.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.permissionBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {Platform.OS !== "web" ? (
        <CameraView style={StyleSheet.absoluteFill} facing={facing} />
       ) : (
        <View style={StyleSheet.absoluteFill}>
          <WebCameraPreview facing={facing} />
        </View>
      )}

      {/* Dark overlay */}
      <LinearGradient colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={cancelSession} style={styles.headerBtn} accessibilityLabel="Cancel camera session">
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {tracking && <PulseDot active={tracking} />}
          <Text style={styles.headerTime}>{formattedTime}</Text>
        </View>
        <TouchableOpacity onPress={() => setFacing(p => p === "front" ? "back" : "front")} style={styles.headerBtn}>
          <Ionicons name="camera-reverse" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Exercise picker badge */}
      <Animated.View entering={FadeInDown.springify()} style={styles.exerciseBadgeWrap}>
        <TouchableOpacity onPress={() => setShowPicker(true)} style={[styles.exerciseBadge, { borderColor: exercise.color }]}>
          <View style={[styles.exerciseDot, { backgroundColor: exercise.color }]} />
          <Text style={styles.exerciseBadgeText}>{exercise.name}</Text>
          <Ionicons name="chevron-down" size={16} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Detection overlay box */}
      <View style={styles.detectionBox}>
        <View style={[styles.corner, styles.cornerTL, { borderColor: exercise.color }]} />
        <View style={[styles.corner, styles.cornerTR, { borderColor: exercise.color }]} />
        <View style={[styles.corner, styles.cornerBL, { borderColor: exercise.color }]} />
        <View style={[styles.corner, styles.cornerBR, { borderColor: exercise.color }]} />
        <View style={styles.detectionLabel}>
          <View style={[styles.detectionDot, { backgroundColor: tracking ? "#22C55E" : "#9B9BB5" }]} />
          <Text style={styles.detectionText}>
            {tracking ? "Detecting motion…" : "Position yourself in frame"}
          </Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{reps}</Text>
            <Text style={styles.statLabel}>Reps</Text>
          </View>
          <View style={styles.statBoxCenter}>
            <Text style={[styles.statValueLg, { color: exercise.color }]}>{Math.round(targetPct * 100)}%</Text>
            <Text style={styles.statLabel}>of {exercise.target} target</Text>
            <View style={styles.miniProgress}>
              <View style={[styles.miniProgressFill, { width: `${targetPct * 100}%`, backgroundColor: exercise.color }]} />
            </View>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{calories}</Text>
            <Text style={styles.statLabel}>Cal</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={reset}>
            <Ionicons name="refresh" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity onPress={tracking ? pauseTracking : startTracking} activeOpacity={0.85}>
            <LinearGradient
              colors={tracking ? ["#EF4444", "#DC2626"] : [exercise.color, exercise.color + "AA"]}
              style={styles.mainBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name={tracking ? "pause" : "play"} size={32} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtn} onPress={manualAddRep}>
            <Ionicons name="add" size={26} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.finishBtn} onPress={finishSession}>
          <View style={styles.finishBtnInner}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={styles.finishBtnText}>Finish & Save Session</Text>
          </View>
        </TouchableOpacity>

            <Text style={styles.hint}>Live camera preview · tap + to confirm each completed rep</Text>
      </View>

      {/* Exercise Picker */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choose Exercise</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={22} color="#9B9BB5" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {EXERCISE_OPTIONS.map(ex => (
                <TouchableOpacity
                  key={ex.name}
                  style={styles.pickerRow}
                  onPress={() => changeExercise(ex)}
                >
                  <View style={[styles.pickerDot, { backgroundColor: ex.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{ex.name}</Text>
                    <Text style={styles.pickerMeta}>Target {ex.target} reps · {ex.calPerRep} cal/rep</Text>
                  </View>
                  {exercise.name === ex.name && <Ionicons name="checkmark-circle" size={22} color={ex.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Summary Modal */}
      <Modal visible={showSummary} transparent animationType="fade" onRequestClose={() => setShowSummary(false)}>
        <View style={styles.summaryOverlay}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: exercise.color + "33" }]}>
              <Ionicons name="trophy" size={36} color={exercise.color} />
            </View>
            <Text style={styles.summaryTitle}>Session Summary</Text>
            <Text style={styles.summaryEx}>{exercise.name}</Text>

            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryVal}>{reps}</Text>
                <Text style={styles.summaryLabel}>Reps</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryVal}>{formattedTime}</Text>
                <Text style={styles.summaryLabel}>Time</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryVal}>{calories}</Text>
                <Text style={styles.summaryLabel}>Calories</Text>
              </View>
            </View>

            <TouchableOpacity onPress={saveAsWorkout} activeOpacity={0.85}>
              <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.summaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.summaryBtnText}>Save as Workout</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSummary(false)}>
              <Text style={styles.summaryCancel}>Continue session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  permissionContainer: { flex: 1, backgroundColor: "#0A0A1A", paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  permissionCard: { backgroundColor: "#1A1A2E", borderRadius: 24, padding: 28, alignItems: "center", gap: 14, width: "100%", maxWidth: 360 },
  permissionTitle: { fontSize: 22, fontWeight: "700", color: "#FFF" },
  permissionText: { fontSize: 14, fontWeight: "400", color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 20 },
  permissionBtn: { width: "100%", borderRadius: 14, overflow: "hidden", marginTop: 8 },
  permissionBtnGrad: { paddingVertical: 16, alignItems: "center" },
  permissionBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  cancelText: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.5)", padding: 12 },
  webPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  webPlaceholderText: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.5)", textAlign: "center" },
  webPlaceholderSub: { fontSize: 12, fontWeight: "400", color: "rgba(255,255,255,0.3)", textAlign: "center" },
  header: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, zIndex: 10 },
  headerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444" },
  headerTime: { fontSize: 16, fontWeight: "600", color: "#FFF", fontVariant: ["tabular-nums"] },
  exerciseBadgeWrap: { position: "absolute", top: 90, left: 0, right: 0, alignItems: "center", zIndex: 5 },
  exerciseBadge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1.5 },
  exerciseDot: { width: 8, height: 8, borderRadius: 4 },
  exerciseBadgeText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
  detectionBox: { position: "absolute", top: "30%", left: "10%", right: "10%", height: 280, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: 28, height: 28, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  detectionLabel: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  detectionDot: { width: 6, height: 6, borderRadius: 3 },
  detectionText: { fontSize: 12, fontWeight: "500", color: "#FFF" },
  bottomPanel: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 24 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 20, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 18 },
  statBox: { alignItems: "center", flex: 1 },
  statBoxCenter: { alignItems: "center", flex: 1.4, gap: 4 },
  statValue: { fontSize: 26, fontWeight: "700", color: "#FFF" },
  statValueLg: { fontSize: 28, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "400", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  miniProgress: { width: "80%", height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden", marginTop: 4 },
  miniProgressFill: { height: "100%", borderRadius: 2 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28, marginBottom: 14 },
  controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  mainBtn: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  finishBtn: { backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 14, paddingVertical: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(34,197,94,0.4)" },
  finishBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  finishBtnText: { fontSize: 14, fontWeight: "600", color: "#22C55E" },
  hint: { fontSize: 11, fontWeight: "400", color: "rgba(255,255,255,0.4)", textAlign: "center" },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  pickerCard: { backgroundColor: "#1A1A2E", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  pickerTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  pickerDot: { width: 12, height: 12, borderRadius: 6 },
  pickerName: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  pickerMeta: { fontSize: 12, fontWeight: "400", color: "rgba(255,255,255,0.5)", marginTop: 2 },
  summaryOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 24 },
  summaryCard: { backgroundColor: "#1A1A2E", borderRadius: 24, padding: 28, alignItems: "center", gap: 14, width: "100%", maxWidth: 360 },
  summaryIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  summaryTitle: { fontSize: 22, fontWeight: "700", color: "#FFF" },
  summaryEx: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.6)" },
  summaryStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", width: "100%", paddingVertical: 16, paddingHorizontal: 8, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, marginVertical: 8 },
  summaryStat: { alignItems: "center", flex: 1 },
  summaryVal: { fontSize: 22, fontWeight: "700", color: "#FFF" },
  summaryLabel: { fontSize: 11, fontWeight: "400", color: "rgba(255,255,255,0.5)", marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.1)" },
  summaryBtn: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14, alignItems: "center", marginTop: 8 },
  summaryBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  summaryCancel: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.5)", padding: 12 },
});
