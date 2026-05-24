import React, { useEffect, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { showAlert } from "@/lib/alert";
import Colors from "@/constants/colors";

let CameraView: any = null;
let useCameraPermissions: any = null;
if (Platform.OS !== "web") {
  try {
    const cam = require("expo-camera");
    CameraView = cam.CameraView;
    useCameraPermissions = cam.useCameraPermissions;
  } catch (_) {}
}

function WebQRPlaceholder({ onResult }: { onResult: (data: string) => void }) {
  const { colors } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function start() {
      try {
        stream = await (navigator.mediaDevices as any).getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setActive(true);
        }
        let BDClass: any = (window as any).BarcodeDetector;
        if (!BDClass) {
          try { const m = await import("https://cdn.jsdelivr.net/npm/barcode-detector@3/dist/es/pure.min.js" as any); BDClass = m.BarcodeDetector; } catch (_) {}
        }
        if (BDClass && videoRef.current) {
          const detector = new BDClass({ formats: ["qr_code"] });
          interval = setInterval(async () => {
            try {
              const barcodes = await detector.detect(videoRef.current!);
              if (barcodes.length > 0) { onResult(barcodes[0].rawValue); }
            } catch (_) {}
          }, 600);
        }
      } catch (_) { setActive(false); }
    }
    start();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (interval) clearInterval(interval);
    };
  }, [onResult]);

  if (Platform.OS !== "web") return null;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <video ref={videoRef as any} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted />
    </View>
  );
}

export default function AfuQRApp() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions
    ? (useCameraPermissions as () => [any, () => Promise<any>])()
    : [{ granted: false }, async () => {}];

  function handleScanned(data: string) {
    if (scanned) return;
    setScanned(true);
    setResult(data);
  }

  async function handleResult() {
    if (!result) return;
    if (result.startsWith("http://") || result.startsWith("https://")) {
      try { await Linking.openURL(result); } catch { showAlert("Error", "Could not open URL."); }
    } else {
      showAlert("QR Code", result);
    }
  }

  function reset() { setScanned(false); setResult(null); }

  if (!CameraView || !permission) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <View style={s.placeholderWrap}>
          <Ionicons name="qr-code" size={80} color={colors.textMuted} />
          <Text style={[s.title, { color: colors.text }]}>QR Scanner</Text>
          <Text style={[s.sub, { color: colors.textMuted }]}>Camera not available in this environment.</Text>
          {Platform.OS === "web" && <WebQRPlaceholder onResult={handleScanned} />}
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <View style={s.placeholderWrap}>
          <Ionicons name="camera" size={60} color={colors.textMuted} />
          <Text style={[s.title, { color: colors.text }]}>Camera Permission</Text>
          <Text style={[s.sub, { color: colors.textMuted }]}>AfuQR needs camera access to scan QR codes.</Text>
          <TouchableOpacity style={[s.permBtn, { backgroundColor: Colors.brand }]} onPress={requestPermission}>
            <Text style={s.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: "#000" }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : ({ data }: { data: string }) => handleScanned(data)}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      <View style={s.overlay} pointerEvents="none">
        <View style={[s.topMask, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
        <View style={s.scanRow}>
          <View style={[s.sideMask, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
          <View style={s.frame}>
            <View style={[s.corner, s.tl, { borderColor: Colors.brand }]} />
            <View style={[s.corner, s.tr, { borderColor: Colors.brand }]} />
            <View style={[s.corner, s.bl, { borderColor: Colors.brand }]} />
            <View style={[s.corner, s.br, { borderColor: Colors.brand }]} />
          </View>
          <View style={[s.sideMask, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
        </View>
        <View style={[s.bottomMask, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
      </View>

      {!scanned && (
        <View style={[s.hint, { bottom: insets.bottom + 60 }]}>
          <Text style={s.hintText}>Point camera at a QR code</Text>
        </View>
      )}

      {result && (
        <View style={[s.resultCard, { bottom: insets.bottom + 20, backgroundColor: colors.surface }]}>
          <Text style={[s.resultLabel, { color: colors.textMuted }]}>SCANNED</Text>
          <Text style={[s.resultText, { color: colors.text }]} numberOfLines={3}>{result}</Text>
          <View style={s.resultBtns}>
            <TouchableOpacity style={[s.resultBtn, { backgroundColor: Colors.brand }]} onPress={handleResult}>
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={s.resultBtnText}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.resultBtn, { backgroundColor: colors.inputBg }]} onPress={reset}>
              <Ionicons name="scan" size={16} color={colors.text} />
              <Text style={[s.resultBtnText, { color: colors.text }]}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const FRAME = 220;
const s = StyleSheet.create({
  root: { flex: 1 },
  placeholderWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  permBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  permBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  overlay: { ...StyleSheet.absoluteFillObject },
  topMask: { flex: 1 },
  scanRow: { flexDirection: "row", height: FRAME },
  sideMask: { flex: 1 },
  frame: { width: FRAME, height: FRAME },
  corner: { position: "absolute", width: 28, height: 28, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  bottomMask: { flex: 1 },
  hint: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  hintText: { color: "rgba(255,255,255,0.8)", fontFamily: "Inter_500Medium", fontSize: 14, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  resultCard: { position: "absolute", left: 16, right: 16, borderRadius: 20, padding: 16, gap: 8, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  resultLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  resultText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  resultBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  resultBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  resultBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
