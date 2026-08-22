import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  TextInput, Alert, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { LocalStore, Achievement } from "@/lib/localStore";

type Stats = {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  bmi: number | null;
  bmiCategory: string | null;
};

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Lose Weight",
  muscle_gain: "Build Muscle",
  endurance: "Endurance",
  flexibility: "Flexibility",
  general_fitness: "Stay Fit",
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  lightly_active: "Lightly Active",
  moderately_active: "Moderately Active",
  very_active: "Very Active",
  extra_active: "Extra Active",
};

function ModalCard({
  visible, onClose, title, children, colors,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  colors: typeof Colors.dark;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user, logout, updateUser, changeEmail, changePassword } = useAuth();

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || "",
    bio: "",
    weight: String(user?.weight || ""),
    height: String(user?.height || ""),
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ newEmail: "", password: "" });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwData, setPwData] = useState({ current: "", newPw: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const [stats, setStats] = useState<Stats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [s, a] = await Promise.all([
      LocalStore.getStats(user.id),
      LocalStore.getAchievements(user.id),
    ]);
    setStats(s);
    setAchievements(a);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function startEdit() {
    setEditData({
      name: user?.name || "",
      bio: user?.bio || "",
      weight: String(user?.weight || ""),
      height: String(user?.height || ""),
    });
    setEditing(true);
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await updateUser({
        name: editData.name,
        bio: editData.bio,
        weight: editData.weight ? parseFloat(editData.weight) : undefined,
        height: editData.height ? parseFloat(editData.height) : undefined,
      });
      setEditing(false);
      await load();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  function handleLogout() {
    if (Platform.OS === "web") {
      const ok = window.confirm("Are you sure you want to log out?");
      if (ok) logout();
    } else {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => logout() },
      ]);
    }
  }

  async function handleChangeEmail() {
    setEmailError("");
    if (!emailData.newEmail.includes("@")) { setEmailError("Please enter a valid email address"); return; }
    if (!emailData.password) { setEmailError("Please enter your current password"); return; }
    setEmailLoading(true);
    try {
      await changeEmail(emailData.newEmail, emailData.password);
      setShowEmailModal(false);
      setEmailData({ newEmail: "", password: "" });
      Alert.alert("Success", "Your email has been updated!");
    } catch (err: any) {
      setEmailError(err.message || "Failed to change email");
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleChangePassword() {
    setPwError("");
    if (!pwData.current) { setPwError("Enter your current password"); return; }
    if (pwData.newPw.length < 6) { setPwError("New password must be at least 6 characters"); return; }
    if (pwData.newPw !== pwData.confirm) { setPwError("New passwords do not match"); return; }
    setPwLoading(true);
    try {
      await changePassword(pwData.current, pwData.newPw);
      setShowPasswordModal(false);
      setPwData({ current: "", newPw: "", confirm: "" });
      Alert.alert("Success", "Your password has been updated!");
    } catch (err: any) {
      setPwError(err.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  }

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "FP";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity onPress={() => editing ? setEditing(false) : startEdit()}>
            <Feather name={editing ? "x" : "edit-2"} size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient colors={["#6C63FF", "#9C8FFF", "#FF6B35"]} style={styles.profileCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            {editing ? (
              <View style={styles.editNameWrap}>
                <TextInput
                  style={styles.editNameInput}
                  value={editData.name}
                  onChangeText={v => setEditData(prev => ({ ...prev, name: v }))}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                />
              </View>
            ) : (
              <Text style={styles.profileName}>{user?.name}</Text>
            )}
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.profileBadges}>
              <View style={styles.profileBadge}>
                <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FFF" />
                <Text style={styles.profileBadgeText}>{GOAL_LABELS[user?.fitnessGoal || ""] || user?.fitnessGoal}</Text>
              </View>
              <View style={styles.profileBadge}>
                <Ionicons name="fitness" size={14} color="#FFF" />
                <Text style={styles.profileBadgeText}>{ACTIVITY_LABELS[user?.activityLevel || ""] || "Active"}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.statsRow}>
          {[
            { label: "Workouts", value: stats?.totalWorkouts || 0 },
            { label: "Streak", value: `${stats?.currentStreak || 0}d` },
            { label: "Best", value: `${stats?.longestStreak || 0}d` },
            { label: "Min", value: stats?.totalMinutes || 0 },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Body Stats</Text>
          <View style={[styles.bodyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {editing ? (
              <View style={styles.editBodyRow}>
                <View style={styles.editBodyField}>
                  <Text style={[styles.bodyLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
                  <TextInput
                    style={[styles.editBodyInput, { color: colors.text, borderColor: colors.border }]}
                    value={editData.weight}
                    onChangeText={v => setEditData(prev => ({ ...prev, weight: v }))}
                    keyboardType="decimal-pad"
                    placeholder="70"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.editBodyField}>
                  <Text style={[styles.bodyLabel, { color: colors.textSecondary }]}>Height (cm)</Text>
                  <TextInput
                    style={[styles.editBodyInput, { color: colors.text, borderColor: colors.border }]}
                    value={editData.height}
                    onChangeText={v => setEditData(prev => ({ ...prev, height: v }))}
                    keyboardType="decimal-pad"
                    placeholder="175"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.bodyRow}>
                {[
                  { label: "Weight", value: user?.weight ? `${user.weight} kg` : "—" },
                  { label: "Height", value: user?.height ? `${user.height} cm` : "—" },
                  { label: "BMI", value: stats?.bmi ? String(stats.bmi) : "—" },
                  { label: "Category", value: stats?.bmiCategory || "—" },
                ].map((b, i) => (
                  <View key={i} style={styles.bodyItem}>
                    <Text style={[styles.bodyValue, { color: colors.text }]}>{b.value}</Text>
                    <Text style={[styles.bodyLabel, { color: colors.textMuted }]}>{b.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>

        {editing && (
          <Animated.View entering={FadeInDown.springify()}>
            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={savingProfile}>
              <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.saveBtnText}>{savingProfile ? "Saving..." : "Save Changes"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Tools</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={[styles.quickTool, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/workout/camera")}
              activeOpacity={0.85}
            >
              <View style={[styles.quickToolIcon, { backgroundColor: "#FF6B3522" }]}>
                <Ionicons name="videocam" size={20} color="#FF6B35" />
              </View>
              <Text style={[styles.quickToolName, { color: colors.text }]}>Rep Counter</Text>
              <Text style={[styles.quickToolDesc, { color: colors.textMuted }]}>Live camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickTool, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/photos")}
              activeOpacity={0.85}
            >
              <View style={[styles.quickToolIcon, { backgroundColor: "#22C55E22" }]}>
                <Ionicons name="images" size={20} color="#22C55E" />
              </View>
              <Text style={[styles.quickToolName, { color: colors.text }]}>Progress Photos</Text>
              <Text style={[styles.quickToolDesc, { color: colors.textMuted }]}>Before & after</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickTool, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/achievements")}
              activeOpacity={0.85}
            >
              <View style={[styles.quickToolIcon, { backgroundColor: "#F59E0B22" }]}>
                <Ionicons name="trophy" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.quickToolName, { color: colors.text }]}>Achievements</Text>
              <Text style={[styles.quickToolDesc, { color: colors.textMuted }]}>{achievements.length} unlocked</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
            <TouchableOpacity onPress={() => router.push("/achievements")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {achievements.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="trophy-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Complete workouts to earn achievements</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
              {achievements.map((ach, i) => (
                <View key={i} style={[styles.achCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={styles.achIcon}>{ach.icon}</Text>
                  <Text style={[styles.achTitle, { color: colors.text }]}>{ach.title}</Text>
                  <Text style={[styles.achDesc, { color: colors.textMuted }]}>{ach.description}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Account</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              {
                icon: "mail-outline", label: "Change Email",
                sub: user?.email,
                action: () => { setEmailData({ newEmail: "", password: "" }); setEmailError(""); setShowEmailModal(true); },
              },
              {
                icon: "lock-closed-outline", label: "Change Password",
                sub: "Update your password",
                action: () => { setPwData({ current: "", newPw: "", confirm: "" }); setPwError(""); setShowPasswordModal(true); },
              },
              {
                icon: "cloud-offline-outline", label: "Offline Mode",
                sub: "All data stored on device",
                action: () => Alert.alert("Offline", "FitPulse works fully offline. Your data never leaves this device."),
              },
              {
                icon: "help-circle-outline", label: "Help & Support",
                sub: "Get help",
                action: () => Alert.alert("Support", "Contact us at support@fitpulse.app"),
              },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={i}
                style={[styles.settingsRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={styles.settingsLeft}>
                  <View style={[styles.settingsIcon, { backgroundColor: "#6C63FF22" }]}>
                    <Ionicons name={item.icon as any} size={18} color="#6C63FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingsLabel, { color: colors.text }]}>{item.label}</Text>
                    {item.sub ? <Text style={[styles.settingsSub, { color: colors.textMuted }]} numberOfLines={1}>{item.sub}</Text> : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <TouchableOpacity style={[styles.logoutBtn, { borderColor: "#EF444444", backgroundColor: "#EF444411" }]} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <ModalCard visible={showEmailModal} onClose={() => setShowEmailModal(false)} title="Change Email" colors={colors}>
        <Text style={[styles.modalSub, { color: colors.textMuted }]}>Current: {user?.email}</Text>
        <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.modalInput, { color: colors.text }]}
            placeholder="New email address"
            placeholderTextColor={colors.textMuted}
            value={emailData.newEmail}
            onChangeText={v => setEmailData(p => ({ ...p, newEmail: v }))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.modalInput, { color: colors.text }]}
            placeholder="Current password (to confirm)"
            placeholderTextColor={colors.textMuted}
            value={emailData.password}
            onChangeText={v => setEmailData(p => ({ ...p, password: v }))}
            secureTextEntry
          />
        </View>
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        <TouchableOpacity style={[styles.modalBtn, emailLoading && { opacity: 0.6 }]} onPress={handleChangeEmail} disabled={emailLoading}>
          <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.modalBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.modalBtnText}>{emailLoading ? "Updating..." : "Update Email"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ModalCard>

      <ModalCard visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password" colors={colors}>
        {[
          { placeholder: "Current password", key: "current", value: pwData.current },
          { placeholder: "New password (min 6 chars)", key: "newPw", value: pwData.newPw },
          { placeholder: "Confirm new password", key: "confirm", value: pwData.confirm },
        ].map(f => (
          <View key={f.key} style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.modalInput, { color: colors.text }]}
              placeholder={f.placeholder}
              placeholderTextColor={colors.textMuted}
              value={f.value}
              onChangeText={v => setPwData(p => ({ ...p, [f.key]: v }))}
              secureTextEntry
            />
          </View>
        ))}
        {pwError ? <Text style={styles.errorText}>{pwError}</Text> : null}
        <TouchableOpacity style={[styles.modalBtn, pwLoading && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={pwLoading}>
          <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.modalBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.modalBtnText}>{pwLoading ? "Updating..." : "Update Password"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ModalCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 20 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  profileCard: { borderRadius: 22, padding: 24, alignItems: "center", gap: 8, marginBottom: 16 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#FFF" },
  profileName: { fontSize: 22, fontWeight: "700", color: "#FFF" },
  profileEmail: { fontSize: 14, fontWeight: "400", color: "rgba(255,255,255,0.7)" },
  profileBadges: { flexDirection: "row", gap: 10, marginTop: 6 },
  profileBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  profileBadgeText: { fontSize: 12, fontWeight: "500", color: "#FFF" },
  editNameWrap: { width: "100%" },
  editNameInput: { fontSize: 22, fontWeight: "700", color: "#FFF", textAlign: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.4)", paddingBottom: 4 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 10, fontWeight: "400" },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: "500" },
  bodyCard: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 24 },
  bodyRow: { flexDirection: "row", justifyContent: "space-around" },
  bodyItem: { alignItems: "center", gap: 4 },
  bodyValue: { fontSize: 18, fontWeight: "700" },
  bodyLabel: { fontSize: 11, fontWeight: "400" },
  editBodyRow: { flexDirection: "row", gap: 16 },
  editBodyField: { flex: 1, gap: 6 },
  editBodyInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: "400" },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 24 },
  saveBtnGrad: { paddingVertical: 16, alignItems: "center" },
  saveBtnText: { fontSize: 16, fontWeight: "600", color: "#FFF" },
  quickGrid: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickTool: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, gap: 6 },
  quickToolIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quickToolName: { fontSize: 13, fontWeight: "600" },
  quickToolDesc: { fontSize: 11, fontWeight: "400" },
  emptyCard: { borderRadius: 18, padding: 24, borderWidth: 1, alignItems: "center", gap: 10, marginBottom: 24 },
  emptyText: { fontSize: 14, fontWeight: "400", textAlign: "center" },
  achCard: { width: 130, borderRadius: 16, padding: 16, borderWidth: 1, alignItems: "center", gap: 6 },
  achIcon: { fontSize: 28 },
  achTitle: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  achDesc: { fontSize: 10, fontWeight: "400", textAlign: "center" },
  settingsCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  settingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  settingsLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsLabel: { fontSize: 15, fontWeight: "500" },
  settingsSub: { fontSize: 12, fontWeight: "400", marginTop: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, borderWidth: 1, marginBottom: 12 },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalClose: { padding: 4 },
  modalSub: { fontSize: 13, fontWeight: "400", marginBottom: -4 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 },
  modalInput: { flex: 1, fontSize: 15, fontWeight: "400", paddingVertical: 12 },
  modalBtn: { borderRadius: 12, overflow: "hidden", marginTop: 4 },
  modalBtnGrad: { paddingVertical: 14, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  errorText: { fontSize: 13, color: "#EF4444", textAlign: "center" },
});
