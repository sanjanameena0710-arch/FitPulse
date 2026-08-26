import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { CameraType } from "expo-camera";

type FormStatus = "GOOD" | "ADJUST";

type WebPoseCameraProps = {
  facing: CameraType;
  tracking: boolean;
  reps: number;
  exerciseName: string;
  accentColor: string;
  onRep: () => void;
  onFormChange: (status: FormStatus) => void;
};

type Point = { x: number; y: number; visibility: number };

type PushUpState = "up" | "down";

type NormalizedLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
};

type PoseLandmarkerLike = {
  detectForVideo: (videoFrame: HTMLVideoElement, timestamp: number) => { landmarks?: NormalizedLandmark[][] };
  close: () => void;
};

type MediaPipeVisionRuntime = {
  FilesetResolver: {
    forVisionTasks: (wasmPath: string) => Promise<unknown>;
  };
  PoseLandmarker: {
    createFromOptions: (vision: unknown, options: Record<string, unknown>) => Promise<PoseLandmarkerLike>;
  };
};

declare global {
  interface Window {
    FitPulseVision?: MediaPipeVisionRuntime;
  }
}

const VISION_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.js";
const WASM_ASSET_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const POSE_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const SKELETON_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 3], [0, 2], [2, 4],
  [5, 6],
  [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 29], [29, 31], [28, 30], [30, 32],
];

const JOINT_INDICES = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

function loadMediaPipeVision(): Promise<MediaPipeVisionRuntime> {
  if (window.FitPulseVision) return Promise.resolve(window.FitPulseVision);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-fitpulse-vision]");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.FitPulseVision) resolve(window.FitPulseVision);
        else reject(new Error("MediaPipe vision runtime did not initialize."));
      }, { once: true });
      existing.addEventListener("error", () => reject(new Error("MediaPipe vision runtime could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = VISION_SCRIPT_URL;
    script.dataset.fitpulseVision = "true";
    script.onload = () => {
      const runtime = (window as Window & { Vision?: MediaPipeVisionRuntime }).Vision;
      if (runtime) {
        window.FitPulseVision = runtime;
        resolve(runtime);
      } else {
        reject(new Error("MediaPipe vision runtime did not initialize."));
      }
    };
    script.onerror = () => reject(new Error("MediaPipe vision runtime could not be loaded."));
    document.head.appendChild(script);
  });
}

function toPoint(landmark: NormalizedLandmark): Point {
  return {
    x: landmark.x,
    y: landmark.y,
    visibility: landmark.visibility ?? 1,
  };
}

function average(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    visibility: Math.min(a.visibility, b.visibility),
  };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angle(a: Point, b: Point, c: Point) {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const denominator = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (!denominator) return 180;
  const cosine = Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / denominator));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function isPushUpExercise(name: string) {
  return name.trim().toLowerCase() === "push-ups" || name.trim().toLowerCase() === "push ups";
}

function getDisplayTransform(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const videoWidth = video.videoWidth || canvas.clientWidth;
  const videoHeight = video.videoHeight || canvas.clientHeight;
  const canvasWidth = canvas.clientWidth || videoWidth;
  const canvasHeight = canvas.clientHeight || videoHeight;
  const videoRatio = videoWidth / Math.max(videoHeight, 1);
  const canvasRatio = canvasWidth / Math.max(canvasHeight, 1);

  if (videoRatio > canvasRatio) {
    const drawnWidth = canvasHeight * videoRatio;
    return { width: drawnWidth, height: canvasHeight, offsetX: (canvasWidth - drawnWidth) / 2, offsetY: 0 };
  }

  const drawnHeight = canvasWidth / videoRatio;
  return { width: canvasWidth, height: drawnHeight, offsetX: 0, offsetY: (canvasHeight - drawnHeight) / 2 };
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  width: number,
  color: string,
  transform: ReturnType<typeof getDisplayTransform>,
  canvas: HTMLCanvasElement,
) {
  if (from.visibility < 0.35 || to.visibility < 0.35) return;
  const x1 = from.x * transform.width + transform.offsetX;
  const y1 = from.y * transform.height + transform.offsetY;
  const x2 = to.x * transform.width + transform.offsetX;
  const y2 = to.y * transform.height + transform.offsetY;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();

  if (width >= 2.5) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.stroke();
  }

  void canvas;
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  start: Point,
  control: Point,
  end: Point,
  transform: ReturnType<typeof getDisplayTransform>,
) {
  const sx = start.x * transform.width + transform.offsetX;
  const sy = start.y * transform.height + transform.offsetY;
  const cx = control.x * transform.width + transform.offsetX;
  const cy = control.y * transform.height + transform.offsetY;
  const ex = end.x * transform.width + transform.offsetX;
  const ey = end.y * transform.height + transform.offsetY;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
}

function smoothLandmarks(previous: Point[] | null, next: Point[], alpha = 0.42) {
  if (!previous || previous.length !== next.length) return next;
  return next.map((point, index) => ({
    x: previous[index].x + (point.x - previous[index].x) * alpha,
    y: previous[index].y + (point.y - previous[index].y) * alpha,
    visibility: point.visibility,
  }));
}

function drawPose(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: Point[],
  accentColor: string,
  pushUp: boolean,
  form: FormStatus,
) {
  const transform = getDisplayTransform(video, canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 13;
  for (const [fromIndex, toIndex] of SKELETON_CONNECTIONS) {
    const from = landmarks[fromIndex];
    const to = landmarks[toIndex];
    if (!from || !to) continue;
    drawLine(ctx, from, to, 2.4, accentColor, transform, canvas);
  }
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#b9f7ff";
  for (const index of JOINT_INDICES) {
    const point = landmarks[index];
    if (!point || point.visibility < 0.35) continue;
    const x = point.x * transform.width + transform.offsetX;
    const y = point.y * transform.height + transform.offsetY;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (!pushUp) return;
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftWrist || !rightWrist) return;

  const highlight = form === "GOOD" ? "#00f5d4" : "#ffbd69";
  ctx.save();
  ctx.shadowColor = highlight;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = highlight;
  ctx.lineWidth = 3;

  drawLine(ctx, leftShoulder, leftElbow, 3.8, highlight, transform, canvas);
  drawLine(ctx, leftElbow, leftWrist, 3.8, highlight, transform, canvas);
  drawLine(ctx, rightShoulder, rightElbow, 3.8, highlight, transform, canvas);
  drawLine(ctx, rightElbow, rightWrist, 3.8, highlight, transform, canvas);

  const chest = average(leftShoulder, rightShoulder);
  const chestControl = { x: chest.x, y: chest.y + 0.085, visibility: chest.visibility };
  drawCurve(ctx, leftShoulder, chestControl, rightShoulder, transform);

  const chestLower = { x: chest.x, y: chest.y + 0.14, visibility: chest.visibility };
  drawCurve(ctx, leftShoulder, chestLower, rightShoulder, transform);
  ctx.restore();
}

function calculatePushUpForm(landmarks: Point[]) {
  const required = [5, 6, 11, 12, 13, 14, 15, 16, 23, 24, 27, 28];
  if (required.some(index => !landmarks[index] || landmarks[index].visibility < 0.45)) {
    return { status: "ADJUST" as FormStatus, phase: "up" as PushUpState, elbowAngle: 180 };
  }

  const shoulder = average(landmarks[11], landmarks[12]);
  const hip = average(landmarks[23], landmarks[24]);
  const ankle = average(landmarks[27], landmarks[28]);
  const leftElbowAngle = angle(landmarks[11], landmarks[13], landmarks[15]);
  const rightElbowAngle = angle(landmarks[12], landmarks[14], landmarks[16]);
  const elbowAngle = Math.min(leftElbowAngle, rightElbowAngle);
  const torsoLevel = Math.abs(shoulder.y - hip.y);
  const legLevel = Math.abs(hip.y - ankle.y);
  const shoulderWidth = distance(landmarks[11], landmarks[12]);
  const alignmentGood = torsoLevel < 0.24 && legLevel < 0.34 && shoulderWidth > 0.04;
  const good = alignmentGood && elbowAngle >= 145;
  const down = alignmentGood && elbowAngle <= 112;

  return {
    status: good || down ? "GOOD" as FormStatus : "ADJUST" as FormStatus,
    phase: down ? "down" as PushUpState : "up" as PushUpState,
    elbowAngle,
  };
}

export default function WebPoseCamera({
  facing,
  tracking,
  reps,
  exerciseName,
  accentColor,
  onRep,
  onFormChange,
}: WebPoseCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarkerLike | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const smoothedRef = useRef<Point[] | null>(null);
  const pushUpPhaseRef = useRef<PushUpState>("up");
  const downFramesRef = useRef(0);
  const upFramesRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashScale = useRef(new Animated.Value(0.75)).current;
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formStatus, setFormStatus] = useState<FormStatus>("ADJUST");

  useEffect(() => {
    let cancelled = false;

    async function open() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera is not supported in this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing === "front" ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Camera permission was denied.");
      }
    }

    void open();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [facing]);

  useEffect(() => {
    let cancelled = false;

    async function loadLandmarker() {
      try {
        setLoading(true);
        const { FilesetResolver, PoseLandmarker } = await loadMediaPipeVision();
        const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_PATH);
        let landmarker: PoseLandmarkerLike;
        try {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL_PATH, delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.55,
            minPosePresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
        } catch {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL_PATH, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.55,
            minPosePresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setError("");
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Pose model could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLandmarker();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    pushUpPhaseRef.current = "up";
    downFramesRef.current = 0;
    upFramesRef.current = 0;
  }, [tracking, exerciseName]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const renderFrame = () => {
      const ctx = canvas.getContext("2d");
      const landmarker = landmarkerRef.current;
      if (!ctx) return;

      const width = video.clientWidth || video.videoWidth || 1;
      const height = video.clientHeight || video.videoHeight || 1;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      if (landmarker && video.readyState >= 2 && video.videoWidth > 0 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        const raw = result.landmarks?.[0]?.map(toPoint) ?? [];
        if (raw.length) {
          const smoothed = smoothLandmarks(smoothedRef.current, raw);
          smoothedRef.current = smoothed;
          const pushUp = isPushUpExercise(exerciseName);
          const detection = pushUp
            ? calculatePushUpForm(smoothed)
            : { status: "ADJUST" as FormStatus, phase: "up" as PushUpState, elbowAngle: 180 };
          setFormStatus(detection.status);
          onFormChange(detection.status);
          drawPose(ctx, canvas, video, smoothed, accentColor, pushUp, detection.status);

          if (tracking && pushUp) {
            if (detection.phase === "down" && detection.status === "GOOD") {
              downFramesRef.current += 1;
              upFramesRef.current = 0;
              if (downFramesRef.current >= 3) pushUpPhaseRef.current = "down";
            } else if (detection.phase === "up" && detection.status === "GOOD") {
              upFramesRef.current += 1;
              downFramesRef.current = 0;
              if (pushUpPhaseRef.current === "down" && upFramesRef.current >= 3) {
                pushUpPhaseRef.current = "up";
                flashOpacity.setValue(0.95);
                flashScale.setValue(0.75);
                Animated.parallel([
                  Animated.timing(flashOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
                  Animated.spring(flashScale, { toValue: 1.15, friction: 5, useNativeDriver: true }),
                ]).start();
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => flashOpacity.setValue(0), 600);
                onRep();
              }
            } else {
              downFramesRef.current = 0;
              upFramesRef.current = 0;
            }
          }
        } else {
          setFormStatus("ADJUST");
          onFormChange("ADJUST");
          ctx.clearRect(0, 0, width, height);
          pushUpPhaseRef.current = "up";
          downFramesRef.current = 0;
          upFramesRef.current = 0;
        }
      }

      animationRef.current = requestAnimationFrame(renderFrame);
    };

    animationRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [accentColor, exerciseName, onFormChange, onRep, tracking]);

  return (
    <View style={styles.container}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={styles.video as React.CSSProperties}
      />
      <canvas ref={canvasRef} style={styles.canvas as React.CSSProperties} />
      <View pointerEvents="none" style={styles.hud}>
        <Animated.View style={[styles.repFlash, { opacity: flashOpacity, transform: [{ scale: flashScale }] }]}>
          <Text style={styles.repFlashText}>+1</Text>
        </Animated.View>
        <Text style={styles.counter}>PUSH-UPS: {reps}</Text>
        <Text style={[styles.form, { color: formStatus === "GOOD" ? "#00f5d4" : "#ffbd69" }]}>FORM: {formStatus}</Text>
        {loading && <Text style={styles.modelStatus}>Loading pose detection…</Text>}
        {!loading && !error && <Text style={styles.modelStatus}>Full body tracking active</Text>}
      </View>
      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>Allow camera access and use HTTPS to enable live pose tracking.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  video: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", backgroundColor: "#000" },
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" },
  hud: { position: "absolute", top: 142, left: 0, right: 0, alignItems: "center" },
  repFlash: { position: "absolute", top: -34, alignItems: "center", justifyContent: "center" },
  repFlashText: { color: "#00f5d4", fontSize: 22, fontWeight: "900", textShadowColor: "#00f5d4", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  counter: { color: "#FFF", fontSize: 24, fontWeight: "800", letterSpacing: 1, textShadowColor: "#6C63FF", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  form: { fontSize: 15, fontWeight: "800", marginTop: 4, letterSpacing: 1, textShadowColor: "#000", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  modelStatus: { color: "rgba(255,255,255,0.72)", fontSize: 10, marginTop: 3 },
  errorBox: { position: "absolute", left: 24, right: 24, bottom: "42%", padding: 16, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center" },
  errorText: { color: "#FFF", fontSize: 14, fontWeight: "600", textAlign: "center" },
  errorHint: { color: "rgba(255,255,255,0.65)", fontSize: 12, textAlign: "center", marginTop: 6 },
});
