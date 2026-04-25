import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image,
  Modal, TextInput, Alert, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { LocalStore, ProgressPhoto } from "@/lib/localStore";

const { width } = Dimensions.get("window");
const photoSize = (width - 60) / 2;

export default function PhotosScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newPhoto, setNewPhoto] = useState<{ uri: string; weight: string; note: string }>({ uri: "", weight: "", note: "" });
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setPhotos(await LocalStore.getProgressPhotos(user.id));
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: Platform.OS === "web",
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = Platform.OS === "web" && asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setNewPhoto({ uri, weight: String(user?.weight || ""), note: "" });
      setShowAdd(true);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Needed", "Camera permission required to take a progress photo");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: Platform.OS === "web",
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = Platform.OS === "web" && asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setNewPhoto({ uri, weight: String(user?.weight || ""), note: "" });
      setShowAdd(true);
    }
  }

  async function savePhoto() {
    if (!user?.id || !newPhoto.uri) return;
    await LocalStore.addProgressPhoto({
      userId: user.id,
      uri: newPhoto.uri,
      weight: newPhoto.weight ? parseFloat(newPhoto.weight) : undefined,
      note: newPhoto.note.trim() || undefined,
      takenAt: new Date().toISOString(),
    });
    setShowAdd(false);
    setNewPhoto({ uri: "", weight: "", note: "" });
    load();
  }

  function deletePhoto(id: number) {
    Alert.alert("Delete Photo?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await LocalStore.deleteProgressPhoto(id); load(); } },
    ]);
  }

  function togglePhoto(id: number) {
    if (!compareMode) return;
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const comparedPhotos = selected.map(id => photos.find(p => p.id === id)!).filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Progress Photos</Text>
          <TouchableOpacity onPress={() => { setCompareMode(!compareMode); setSelected([]); }} style={[styles.compareBtn, { backgroundColor: compareMode ? colors.primary : colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="compare" size={18} color={compareMode ? "#FFF" : colors.text} />
          </TouchableOpacity>
        </View>

        {compareMode && (
          <View style={[styles.compareBanner, { backgroundColor: colors.primary + "22" }]}>
            <MaterialCommunityIcons name="compare" size={18} color={colors.primary} />
            <Text style={[styles.compareText, { color: colors.primary }]}>
              Tap 2 photos to compare ({selected.length}/2 selected)
            </Text>
          </View>
        )}

        {comparedPhotos.length === 2 && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.comparison, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.compareTitle, { color: colors.text }]}>Side by Side</Text>
            <View style={styles.compareRow}>
              {comparedPhotos.map((p, i) => (
                <View key={p.id} style={styles.compareItem}>
                  <Image source={{ uri: p.uri }} style={styles.compareImg} />
                  <Text style={[styles.compareDate, { color: colors.text }]}>
                    {new Date(p.takenAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                  {p.weight && <Text style={[styles.compareWeight, { color: colors.textMuted }]}>{p.weight} kg</Text>}
                </View>
              ))}
            </View>
            {comparedPhotos[0].weight && comparedPhotos[1].weight && (
              <View style={[styles.diffBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.diffText, { color: colors.textSecondary }]}>
                  Weight change: {(comparedPhotos[1].weight! - comparedPhotos[0].weight!).toFixed(1)} kg
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {photos.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="image-multiple-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No photos yet</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Track your transformation by taking progress photos. They're stored privately on your device.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {photos.map((p, i) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 60).springify()}>
                <TouchableOpacity
                  style={[
                    styles.photoCard,
                    selected.includes(p.id) && { borderColor: colors.primary, borderWidth: 3 },
                  ]}
                  onPress={() => togglePhoto(p.id)}
                  onLongPress={() => deletePhoto(p.id)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: p.uri }} style={styles.photoImg} />
                  <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.photoOverlay}>
                    <Text style={styles.photoDate}>
                      {new Date(p.takenAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </Text>
                    {p.weight && <Text style={styles.photoWeight}>{p.weight} kg</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        {photos.length > 0 && (
          <Text style={[styles.hint, { color: colors.textMuted }]}>Long-press to delete · Tap compare icon to see side-by-side</Text>
        )}
      </ScrollView>

      {/* FABs */}
      <View style={[styles.fabRow, { bottom: insets.bottom + 24 }]}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
          <View style={[styles.fabSecondary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="image" size={22} color={colors.primary} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={takePhoto} activeOpacity={0.85}>
          <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="camera" size={26} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Add modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Progress Photo</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {newPhoto.uri ? <Image source={{ uri: newPhoto.uri }} style={styles.previewImg} /> : null}

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Current Weight (kg)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              placeholder="e.g. 70"
              placeholderTextColor={colors.textMuted}
              value={newPhoto.weight}
              onChangeText={v => setNewPhoto(p => ({ ...p, weight: v }))}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, minHeight: 60 }]}
              placeholder="How are you feeling? Goals reached?"
              placeholderTextColor={colors.textMuted}
              value={newPhoto.note}
              onChangeText={v => setNewPhoto(p => ({ ...p, note: v }))}
              multiline
            />

            <TouchableOpacity onPress={savePhoto} activeOpacity={0.85}>
              <LinearGradient colors={["#6C63FF", "#9C8FFF"]} style={styles.modalBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.modalBtnText}>Save Photo</Text>
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
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, marginBottom: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  compareBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  compareBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 16 },
  compareText: { fontSize: 13, fontWeight: "500" },
  comparison: { borderRadius: 18, padding: 14, borderWidth: 1, marginBottom: 20, gap: 10 },
  compareTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  compareRow: { flexDirection: "row", gap: 10 },
  compareItem: { flex: 1, alignItems: "center", gap: 4 },
  compareImg: { width: "100%", height: 200, borderRadius: 12 },
  compareDate: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  compareWeight: { fontSize: 11, fontWeight: "400" },
  diffBadge: { padding: 10, borderRadius: 10, alignItems: "center" },
  diffText: { fontSize: 12, fontWeight: "500" },
  emptyCard: { borderRadius: 20, padding: 36, borderWidth: 1, alignItems: "center", gap: 10, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 13, fontWeight: "400", textAlign: "center", lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoCard: { width: photoSize, height: photoSize * 1.3, borderRadius: 14, overflow: "hidden", position: "relative" },
  photoImg: { width: "100%", height: "100%" },
  photoOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, gap: 2 },
  photoDate: { fontSize: 12, fontWeight: "600", color: "#FFF" },
  photoWeight: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.85)" },
  hint: { fontSize: 11, fontWeight: "400", textAlign: "center", marginTop: 14 },
  fabRow: { position: "absolute", right: 20, flexDirection: "column", gap: 12, alignItems: "center" },
  fab: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  fabSecondary: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalLabel: { fontSize: 13, fontWeight: "500", marginTop: 4 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  previewImg: { width: "100%", height: 180, borderRadius: 14, marginBottom: 4 },
  modalBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  modalBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
