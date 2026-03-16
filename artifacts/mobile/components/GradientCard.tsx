import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  colors: [string, string];
  style?: ViewStyle;
  children: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  borderRadius?: number;
};

export function GradientCard({ colors, style, children, start, end, borderRadius = 20 }: Props) {
  return (
    <LinearGradient
      colors={colors}
      start={start || { x: 0, y: 0 }}
      end={end || { x: 1, y: 1 }}
      style={[{ borderRadius }, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function GlassCard({ style, children }: { style?: ViewStyle; children: React.ReactNode }) {
  return (
    <View style={[styles.glass, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
});
