import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() || "";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (!WEB_APP_URL) {
    return (
      <View style={styles.messageScreen}>
        <StatusBar style="light" />
        <Text style={styles.title}>FitPulse</Text>
        <Text style={styles.message}>
          The frontend URL is not configured for this APK.
        </Text>
        <Text style={styles.hint}>
          Build with EXPO_PUBLIC_WEB_APP_URL set to your deployed frontend URL.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <WebView
        source={{ uri: WEB_APP_URL }}
        style={styles.webView}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        onLoadStart={() => {
          setError("");
          setLoading(true);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={event => {
          setLoading(false);
          setError(event.nativeEvent.description || "Unable to load FitPulse.");
        }}
      />
      {loading && !error && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#9C8FFF" />
          <Text style={styles.loadingText}>Loading FitPulse…</Text>
        </View>
      )}
      {!!error && (
        <View style={styles.messageScreen}>
          <Text style={styles.title}>FitPulse</Text>
          <Text style={styles.message}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => Linking.openURL(WEB_APP_URL)}>
            <Text style={styles.retryText}>Open website</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A1A" },
  webView: { flex: 1, backgroundColor: "#0A0A1A" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#0A0A1A",
  },
  loadingText: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  messageScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#0A0A1A",
  },
  title: { color: "#FFF", fontSize: 28, fontWeight: "700", marginBottom: 16 },
  message: { color: "#FFF", fontSize: 16, textAlign: "center", lineHeight: 23 },
  hint: { color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 10 },
  retryButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: "#6C63FF" },
  retryText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
});
