import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const GOALS = [
  { id: "weight_loss", label: "Lose Weight", icon: "flame", color: "#FF6B35" },
  { id: "muscle_gain", label: "Build Muscle", icon: "barbell", color: "#6C63FF" },
  { id: "endurance", label: "Endurance", icon: "bicycle", color: "#00D4FF" },
  { id: "flexibility", label: "Flexibility", icon: "body", color: "#22C55E" },
  { id: "general_fitness", label: "Stay Fit", icon: "heart", color: "#F59E0B" },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState("general_fitness");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email";
    if (!password || password.length < 6) errs.password = "Password must be at least 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleRegister() {
    setLoading(true);
    try {
      await register({ name: name.trim(), email, password, fitnessGoal: selectedGoal });
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0A0A1A", "#1A0A2E"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.inner, {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
            paddingBottom: insets.bottom + 34,
          }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.steps}>
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
            </View>
          </View>

          {step === 1 ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Start your fitness journey today</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={[styles.inputWrap, errors.name && styles.inputError]}>
                    <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
                    <TextInput
                      style={styles.input}
                      placeholder="John Doe"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[styles.inputWrap, errors.email && styles.inputError]}>
                    <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" />
                    <TextInput
                      style={styles.input}
                      placeholder="your@email.com"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.inputWrap, errors.password && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.4)" />
                    <TextInput
                      style={styles.input}
                      placeholder="Min. 6 characters"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => { if (validateStep1()) setStep(2); }}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.btnText}>Next</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Your Goal</Text>
                <Text style={styles.subtitle}>What are you training for?</Text>
              </View>

              <View style={styles.goalsGrid}>
                {GOALS.map((goal) => (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles.goalCard, selectedGoal === goal.id && styles.goalCardSelected]}
                    onPress={() => setSelectedGoal(goal.id)}
                    activeOpacity={0.8}
                  >
                    {selectedGoal === goal.id && (
                      <LinearGradient colors={[goal.color + "22", goal.color + "11"]} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />
                    )}
                    <View style={[styles.goalIcon, { backgroundColor: goal.color + "22" }]}>
                      <Ionicons name={goal.icon as any} size={26} color={goal.color} />
                    </View>
                    <Text style={[styles.goalLabel, selectedGoal === goal.id && { color: goal.color }]}>{goal.label}</Text>
                    {selectedGoal === goal.id && (
                      <View style={[styles.goalCheck, { backgroundColor: goal.color }]}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.nextBtn, loading && { opacity: 0.7 }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Start Training</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, paddingHorizontal: 24 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
  steps: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  stepDotActive: { backgroundColor: "#6C63FF", width: 20 },
  stepLine: { width: 24, height: 2, backgroundColor: "rgba(255,255,255,0.1)" },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "700", color: "#FFF", letterSpacing: -1 },
  subtitle: { fontSize: 15, fontWeight: "400", color: "rgba(255,255,255,0.5)", marginTop: 8 },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.7)" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 16, paddingVertical: 16,
  },
  inputError: { borderColor: "rgba(239,68,68,0.6)" },
  input: { flex: 1, fontSize: 15, fontWeight: "400", color: "#FFF" },
  errorText: { fontSize: 12, fontWeight: "400", color: "#EF4444" },
  nextBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8, shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  btnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, gap: 8 },
  btnText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  goalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  goalCard: {
    width: "47%", borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)", padding: 18, alignItems: "center", gap: 10,
    overflow: "hidden",
  },
  goalCardSelected: { borderColor: "#6C63FF" },
  goalIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  goalLabel: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.8)", textAlign: "center" },
  goalCheck: { position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: "auto", paddingTop: 24 },
  footerText: { fontSize: 14, fontWeight: "400", color: "rgba(255,255,255,0.4)" },
  footerLink: { fontSize: 14, fontWeight: "600", color: "#6C63FF" },
});
