import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withSpring, withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WorkoutCompleteScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ duration?: string; calories?: string; exercises?: string }>();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(100, withSpring(1, { damping: 12 }));
    opacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    contentOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0A0A1A", "#0F1A0A"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.inner, {
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 60),
        paddingBottom: insets.bottom + 40,
      }]}>
        <Animated.View style={[styles.iconWrap, iconStyle]}>
          <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.iconGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="checkmark" size={64} color="#FFF" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.content, contentStyle]}>
          <Text style={styles.congrats}>Workout{"\n"}Complete!</Text>
          <Text style={styles.sub}>Great job! You crushed it today.</Text>

          <View style={styles.cards}>
            {[
              { icon: "flame", label: "Calories Burned", value: params.calories || "0", color: "#FF6B35" },
              { icon: "time", label: "Duration", value: `${params.duration || 0} min`, color: "#6C63FF" },
              { icon: "trophy", label: "Exercises", value: params.exercises || "0", color: "#F59E0B" },
            ].map((c, i) => (
              <View key={i} style={styles.card}>
                <View style={[styles.cardIcon, { backgroundColor: c.color + "22" }]}>
                  <Ionicons name={c.icon as any} size={20} color={c.color} />
                </View>
                <Text style={styles.cardValue}>{c.value}</Text>
                <Text style={styles.cardLabel}>{c.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.homeBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="home" size={20} color="#FFF" />
              <Text style={styles.homeBtnText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.anotherBtn}
            onPress={() => router.replace("/workout/active")}
          >
            <Text style={styles.anotherText}>Start Another Workout</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 32, alignItems: "center" },
  iconWrap: { marginBottom: 32 },
  iconGrad: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", shadowColor: "#22C55E", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 12 },
  content: { width: "100%", alignItems: "center" },
  congrats: { fontSize: 48, fontWeight: "700", color: "#FFF", textAlign: "center", letterSpacing: -2, lineHeight: 52, marginBottom: 16 },
  sub: { fontSize: 16, fontWeight: "400", color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 36 },
  cards: { flexDirection: "row", gap: 12, marginBottom: 40 },
  card: { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, padding: 14, alignItems: "center", gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardValue: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  cardLabel: { fontSize: 10, fontWeight: "400", color: "rgba(255,255,255,0.5)", textAlign: "center" },
  homeBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginBottom: 14, shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  homeBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, gap: 10 },
  homeBtnText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  anotherBtn: { paddingVertical: 12 },
  anotherText: { fontSize: 15, fontWeight: "500", color: "rgba(255,255,255,0.5)" },
});
