import React, { useEffect } from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import Colors from "@/constants/colors";

type Props = {
  progress: number;
  label?: string;
  value?: string;
  color?: string;
  height?: number;
};

export function AnimatedProgressBar({ progress, label, value, color, height = 8 }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 1000,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      {(label || value) && (
        <View style={styles.labelRow}>
          {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
          {value && <Text style={[styles.value, { color: colors.text }]}>{value}</Text>}
        </View>
      )}
      <View style={[styles.track, { height, backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.fill,
            animStyle,
            { height, backgroundColor: color || colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  track: { borderRadius: 100, overflow: "hidden" },
  fill: { borderRadius: 100 },
});
