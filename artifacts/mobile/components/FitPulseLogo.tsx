import React from "react";
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Circle, Line, Polyline, G } from "react-native-svg";
import { View } from "react-native";

type Props = {
  size?: number;
};

export default function FitPulseLogo({ size = 48 }: Props) {
  const s = size;
  const r = s * 0.22; // border radius

  return (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s} viewBox="0 0 100 100">
        <Defs>
          {/* Main background gradient: purple → orange */}
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#5B4FD9" />
            <Stop offset="55%" stopColor="#7C63FF" />
            <Stop offset="100%" stopColor="#FF6B35" />
          </LinearGradient>
          {/* Pulse line gradient: cyan → white */}
          <LinearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#00D4FF" />
            <Stop offset="100%" stopColor="#FFFFFF" />
          </LinearGradient>
          {/* Dumbbell gradient */}
          <LinearGradient id="dbGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0.75)" />
          </LinearGradient>
        </Defs>

        {/* Background — rounded square */}
        <Rect x="0" y="0" width="100" height="100" rx="22" ry="22" fill="url(#bgGrad)" />

        {/* Subtle inner glow overlay */}
        <Rect x="0" y="0" width="100" height="50" rx="22" ry="22" fill="rgba(255,255,255,0.06)" />

        {/* ─── Dumbbell icon (top portion) ─── */}
        {/* Left plate outer */}
        <Rect x="10" y="28" width="10" height="22" rx="3" ry="3" fill="url(#dbGrad)" />
        {/* Left plate inner */}
        <Rect x="20" y="32" width="6" height="14" rx="2" ry="2" fill="rgba(255,255,255,0.85)" />
        {/* Bar */}
        <Rect x="26" y="37" width="48" height="4" rx="2" ry="2" fill="rgba(255,255,255,0.9)" />
        {/* Right plate inner */}
        <Rect x="74" y="32" width="6" height="14" rx="2" ry="2" fill="rgba(255,255,255,0.85)" />
        {/* Right plate outer */}
        <Rect x="80" y="28" width="10" height="22" rx="3" ry="3" fill="url(#dbGrad)" />

        {/* ─── Heartbeat / Pulse line (bottom portion) ─── */}
        {/* Glow behind pulse */}
        <Polyline
          points="6,72 22,72 30,58 38,84 46,64 54,80 62,68 70,72 94,72"
          fill="none"
          stroke="rgba(0,212,255,0.25)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Main pulse line */}
        <Polyline
          points="6,72 22,72 30,58 38,84 46,64 54,80 62,68 70,72 94,72"
          fill="none"
          stroke="url(#pulseGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

      </Svg>
    </View>
  );
}
