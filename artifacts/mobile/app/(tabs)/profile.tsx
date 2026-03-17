import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  TextInput, Alert, Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

type Stats = {
  totalWorkouts: number;
  totalCaloriesBurned: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  bmi: number | null;
  bmiCategory: string | null;
};

type Achievement = {
  id: number;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string;
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user, logout, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: user?.name || "", bio: "", weight: String(user?.weight || ""), height: String(user?.height || "") });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["stats", user?.id],
    queryFn: async () => (await fetch(`${API_BASE}/users/stats?userId=${user?.id}`)).json(),
    enabled: !!user?.id,
  });

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ["achievements", user?.id],
    queryFn: async () => (await fetch(`${API_BASE}/achievements?userId=${user?.id}`)).json(),
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          name: editData.name,
          bio: editData.bio,
          weight: editData.weight ? parseFloat(editData.weight) : undefined,
          height: editData.height ? parseFloat(editData.height) : undefined,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      updateUser(data);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["stats", user?.id] });
    },
  });

  function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  }

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "FP";

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Feather name={editing ? "x" : "edit-2"} size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
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

        {/* Stats Row */}
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

        {/* Body Stats */}
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

        {/* Save button when editing */}
        {editing && (
          <Animated.View entering={FadeInDown.springify()}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.saveBtnText}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Achievements */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
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

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: "notifications-outline", label: "Push Notifications", action: () => {} },
              { icon: "moon-outline", label: "Dark Mode", action: () => {} },
              { icon: "lock-closed-outline", label: "Change Password", action: () => Alert.alert("Coming Soon", "Password change via email will be implemented.") },
              { icon: "help-circle-outline", label: "Help & Support", action: () => {} },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.settingsRow, i < 3 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                onPress={item.action}
              >
                <View style={styles.settingsLeft}>
                  <View style={[styles.settingsIcon, { backgroundColor: "#6C63FF22" }]}>
                    <Ionicons name={item.icon as any} size={18} color="#6C63FF" />
                  </View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <TouchableOpacity style={[styles.logoutBtn, { borderColor: "#EF444433" }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
  emptyCard: { borderRadius: 18, padding: 24, borderWidth: 1, alignItems: "center", gap: 10, marginBottom: 24 },
  emptyText: { fontSize: 14, fontWeight: "400", textAlign: "center" },
  achCard: { width: 130, borderRadius: 16, padding: 16, borderWidth: 1, alignItems: "center", gap: 6 },
  achIcon: { fontSize: 28 },
  achTitle: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  achDesc: { fontSize: 10, fontWeight: "400", textAlign: "center" },
  settingsCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  settingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  settingsLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingsIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsLabel: { fontSize: 15, fontWeight: "500" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, borderWidth: 1, marginBottom: 12 },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },
});
