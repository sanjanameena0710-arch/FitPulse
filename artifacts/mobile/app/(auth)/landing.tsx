import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform,
  StatusBar, ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, withRepeat, withSequence, Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

function FloatingOrb({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  const opacity = useSharedValue(0.3);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 2000 }), withTiming(0.3, { duration: 2000 })),
      -1, true
    );
    translateY.value = withRepeat(
      withSequence(withTiming(-15, { duration: 2500 }), withTiming(15, { duration: 2500 })),
      -1, true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />
  );
}

function StatBadge({ icon, label, value, delay }: { icon: string; label: string; value: string; delay: number }) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(30);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    translateX.value = withDelay(delay, withSpring(0, { damping: 15 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.statBadge, style]}>
      <MaterialCommunityIcons name={icon as any} size={18} color="#6C63FF" />
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(40);
  const subOpacity = useSharedValue(0);
  const btnsOpacity = useSharedValue(0);
  const btnsY = useSharedValue(30);

  useEffect(() => {
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 700 }));
    titleY.value = withDelay(400, withSpring(0, { damping: 14 }));
    subOpacity.value = withDelay(700, withTiming(1, { duration: 700 }));
    btnsOpacity.value = withDelay(1000, withTiming(1, { duration: 600 }));
    btnsY.value = withDelay(1000, withSpring(0, { damping: 14 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));
  const btnsStyle = useAnimatedStyle(() => ({
    opacity: btnsOpacity.value,
    transform: [{ translateY: btnsY.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={["#0A0A1A", "#1A0A2E", "#0F0F2A"]}
        style={StyleSheet.absoluteFill}
      />

      <FloatingOrb x={-40} y={height * 0.1} size={200} color="rgba(108,99,255,0.2)" delay={0} />
      <FloatingOrb x={width - 100} y={height * 0.3} size={160} color="rgba(255,107,53,0.15)" delay={500} />
      <FloatingOrb x={width * 0.2} y={height * 0.6} size={120} color="rgba(0,212,255,0.1)" delay={1000} />

      <View style={[styles.inner, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20), paddingBottom: insets.bottom + 34 }]}>
        <View style={styles.logoRow}>
          <LinearGradient colors={["#6C63FF", "#FF6B35"]} style={styles.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <MaterialCommunityIcons name="lightning-bolt" size={28} color="#FFF" />
          </LinearGradient>
          <Text style={styles.brandName}>FitPulse</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBadge icon="weight-lifter" label="Workouts" value="10K+" delay={600} />
          <StatBadge icon="fire" label="Calories" value="2M+" delay={800} />
          <StatBadge icon="account-group" label="Members" value="50K+" delay={1000} />
        </View>

        <Animated.View style={[styles.heroSection, titleStyle]}>
          <Text style={styles.heroTitle}>Train{"\n"}Harder,{"\n"}Live{"\n"}Better.</Text>
        </Animated.View>

        <Animated.Text style={[styles.heroSub, subStyle]}>
          Your personal fitness companion. Track workouts, monitor progress, and achieve your goals.
        </Animated.Text>

        <Animated.View style={[styles.btns, btnsStyle]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/(auth)/register")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#6C63FF", "#9C8FFF"]}
              style={styles.primaryBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryBtnText}>Get Started Free</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF" },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 40 },
  statBadge: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    padding: 12, flexDirection: "row", alignItems: "center", gap: 8,
  },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  heroSection: { marginTop: "auto", marginBottom: 16 },
  heroTitle: {
    fontSize: 60, fontFamily: "Inter_700Bold", color: "#FFF",
    lineHeight: 66, letterSpacing: -2,
  },
  heroSub: {
    fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)",
    lineHeight: 24, marginBottom: 36,
  },
  btns: { gap: 12 },
  primaryBtn: { borderRadius: 16, overflow: "hidden", shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  primaryBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, paddingHorizontal: 24, gap: 8 },
  primaryBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  secondaryBtn: { alignItems: "center", paddingVertical: 14 },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)" },
});
