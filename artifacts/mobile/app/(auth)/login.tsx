import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { LocalStore } from "@/lib/localStore";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetError, setResetError] = useState("");

  function validate() {
    const errs: Record<string, string> = {};
    if (!email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Please check your credentials");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setResetError("");
    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError("Enter the email used for this offline account");
      return;
    }
    if (resetPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError("Passwords do not match");
      return;
    }
    try {
      await LocalStore.resetPassword(resetEmail, resetPassword);
      setResetVisible(false);
      setEmail(resetEmail.trim().toLowerCase());
      setPassword("");
      setResetEmail("");
      setResetPassword("");
      setResetConfirm("");
      Alert.alert("Password updated", "Your offline password has been changed. Sign in with the new password.");
    } catch (err: any) {
      setResetError(err.message || "Unable to reset password");
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrap, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={v => { setEmail(v); if (errors.email) setErrors(prev => ({ ...prev, email: "" })); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
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
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={v => { setPassword(v); if (errors.password) setErrors(prev => ({ ...prev, password: "" })); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={() => { setResetError(""); setResetVisible(true); }}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.loginBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.loginBtnText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or try demo</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => { setEmail("demo@fitpulse.app"); setPassword("demo123"); }}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={18} color="#6C63FF" />
              <Text style={styles.demoBtnText}>Fill Demo Credentials</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={resetVisible} transparent animationType="slide" onRequestClose={() => setResetVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.resetCard}>
            <View style={styles.resetHeader}>
              <Text style={styles.resetTitle}>Reset offline password</Text>
              <TouchableOpacity onPress={() => setResetVisible(false)}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.resetSub}>This works on this device only. Enter your account email and choose a new password.</Text>
            <TextInput style={styles.resetInput} placeholder="Account email" placeholderTextColor="rgba(255,255,255,0.35)" value={resetEmail} onChangeText={setResetEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.resetInput} placeholder="New password" placeholderTextColor="rgba(255,255,255,0.35)" value={resetPassword} onChangeText={setResetPassword} secureTextEntry />
            <TextInput style={styles.resetInput} placeholder="Confirm new password" placeholderTextColor="rgba(255,255,255,0.35)" value={resetConfirm} onChangeText={setResetConfirm} secureTextEntry />
            {resetError ? <Text style={styles.resetError}>{resetError}</Text> : null}
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetPassword}>
              <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.loginBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.loginBtnText}>Update Password</Text>
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
  inner: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  header: { marginBottom: 36 },
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
  forgotBtn: { alignSelf: "flex-end" },
  forgotText: { fontSize: 13, fontWeight: "500", color: "#6C63FF" },
  loginBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8, shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnGrad: { paddingVertical: 18, alignItems: "center" },
  loginBtnText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  dividerText: { fontSize: 12, fontWeight: "400", color: "rgba(255,255,255,0.3)" },
  demoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(108,99,255,0.12)", borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(108,99,255,0.3)" },
  demoBtnText: { fontSize: 14, fontWeight: "500", color: "#6C63FF" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: "auto", paddingTop: 24 },
  footerText: { fontSize: 14, fontWeight: "400", color: "rgba(255,255,255,0.4)" },
  footerLink: { fontSize: 14, fontWeight: "600", color: "#6C63FF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  resetCard: { backgroundColor: "#1A1A2E", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 12 },
  resetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resetTitle: { fontSize: 20, fontWeight: "700", color: "#FFF" },
  resetSub: { fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.55)", marginBottom: 4 },
  resetInput: { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, color: "#FFF", fontSize: 15 },
  resetError: { fontSize: 13, color: "#EF4444", textAlign: "center" },
  resetBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
});
