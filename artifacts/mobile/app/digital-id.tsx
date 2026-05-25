import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Sharing from "expo-sharing";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";

let ViewShot: any = ({ children, style, ...rest }: any) => <View style={style} {...rest}>{children}</View>;
try { ViewShot = require("react-native-view-shot").default; } catch (_) {}

const afuSymbol = require("@/assets/images/afu-symbol.png");

const BRAND = "#00BCD4";
const CEO_HANDLE = "amkaweesi";

type MemberRole = "ceo" | "staff" | "member";
function getMemberRole(handle?: string, isAdmin?: boolean): MemberRole {
  if (handle === CEO_HANDLE) return "ceo";
  if (isAdmin) return "staff";
  return "member";
}

type CT = { flag: string[]; primary: string; secondary: string; cardBg: [string, string, string]; headerBg: [string, string] };

const THEMES: Record<string, CT> = {
  Uganda:          { flag: ["#000","#FCDC04","#D90000","#FFF"], primary: "#FCDC04", secondary: "#D90000", cardBg: ["#0A0800","#120E00","#0D0900"], headerBg: ["#1A1200","#0A0800"] },
  Kenya:           { flag: ["#006600","#CC0001","#000"],         primary: "#D90000", secondary: "#006600", cardBg: ["#0A0000","#130000","#0A0300"], headerBg: ["#180000","#0A0000"] },
  Tanzania:        { flag: ["#1EB53A","#000","#FCD116","#3A75C4"], primary: "#1EB53A", secondary: "#3A75C4", cardBg: ["#001508","#00100A","#001812"], headerBg: ["#001A0A","#000D06"] },
  Rwanda:          { flag: ["#20603D","#FAD201","#1F8FBF"],      primary: "#FAD201", secondary: "#1F8FBF", cardBg: ["#090800","#100E00","#0C0A00"], headerBg: ["#161200","#090800"] },
  Nigeria:         { flag: ["#008751","#FFF","#008751"],          primary: "#008751", secondary: "#4CAF50", cardBg: ["#001508","#001A0A","#001208"], headerBg: ["#001E0A","#000E05"] },
  Ghana:           { flag: ["#CE1126","#FCD116","#006B3F"],       primary: "#FCD116", secondary: "#CE1126", cardBg: ["#0A0800","#120E00","#0D0900"], headerBg: ["#1A1200","#0A0800"] },
  "South Africa":  { flag: ["#007A4D","#FFB612","#DE3831","#002868"], primary: "#FFB612", secondary: "#007A4D", cardBg: ["#0A0800","#110E00","#0A0A00"], headerBg: ["#161100","#080700"] },
  Ethiopia:        { flag: ["#078930","#FCDD09","#DA121A"],       primary: "#FCDD09", secondary: "#078930", cardBg: ["#080800","#0F0F00","#0A0A00"], headerBg: ["#141400","#080800"] },
  Egypt:           { flag: ["#CE1126","#FFF","#000"],             primary: "#CE1126", secondary: "#C09300", cardBg: ["#0A0000","#130000","#0A0200"], headerBg: ["#180000","#0A0000"] },
  Morocco:         { flag: ["#C1272D","#006233"],                 primary: "#006233", secondary: "#C1272D", cardBg: ["#001408","#001A0A","#001006"], headerBg: ["#001E0A","#000F05"] },
  "United States": { flag: ["#B22234","#FFF","#3C3B6E"],          primary: "#3C3B6E", secondary: "#B22234", cardBg: ["#00000A","#020010","#000008"], headerBg: ["#020018","#00000A"] },
  "United Kingdom":{ flag: ["#012169","#C8102E","#FFF"],          primary: "#012169", secondary: "#C8102E", cardBg: ["#000008","#00000E","#000005"], headerBg: ["#000010","#000008"] },
  Canada:          { flag: ["#FF0000","#FFF","#FF0000"],           primary: "#FF0000", secondary: "#8B0000", cardBg: ["#0A0000","#100000","#0A0000"], headerBg: ["#150000","#0A0000"] },
  Australia:       { flag: ["#00008B","#CC0001","#FFF"],           primary: "#00008B", secondary: "#CC0001", cardBg: ["#000008","#00000E","#000010"], headerBg: ["#000012","#000008"] },
  Germany:         { flag: ["#000","#DD0000","#FFCE00"],           primary: "#DD0000", secondary: "#FFCE00", cardBg: ["#0A0000","#110000","#0A0200"], headerBg: ["#160000","#0A0000"] },
  France:          { flag: ["#002395","#FFF","#ED2939"],           primary: "#002395", secondary: "#ED2939", cardBg: ["#000008","#00000E","#000008"], headerBg: ["#000012","#000008"] },
  India:           { flag: ["#FF9933","#FFF","#138808"],           primary: "#FF9933", secondary: "#138808", cardBg: ["#0A0500","#110800","#0A0A00"], headerBg: ["#160900","#0A0500"] },
  China:           { flag: ["#DE2910","#FFDE00"],                  primary: "#DE2910", secondary: "#FFDE00", cardBg: ["#0A0000","#130000","#0A0000"], headerBg: ["#180000","#0A0000"] },
  Japan:           { flag: ["#BC002D","#FFF"],                     primary: "#BC002D", secondary: "#8B0000", cardBg: ["#0A0000","#110000","#0A0000"], headerBg: ["#160000","#0A0000"] },
  Brazil:          { flag: ["#009C3B","#FEDF00","#002776"],        primary: "#FEDF00", secondary: "#009C3B", cardBg: ["#080800","#0F0F00","#080A00"], headerBg: ["#141400","#080800"] },
  "Saudi Arabia":  { flag: ["#006C35","#FFF"],                     primary: "#006C35", secondary: "#4CAF50", cardBg: ["#001508","#001E0A","#001006"], headerBg: ["#001E0A","#000F05"] },
  UAE:             { flag: ["#00732F","#FFF","#000","#FF0000"],    primary: "#00732F", secondary: "#FF0000", cardBg: ["#001208","#001A0A","#001006"], headerBg: ["#001A0A","#000C06"] },
  Pakistan:        { flag: ["#01411C","#FFF"],                     primary: "#01411C", secondary: "#3CB371", cardBg: ["#001208","#001A0A","#001006"], headerBg: ["#001A0A","#000C06"] },
  Indonesia:       { flag: ["#CE1126","#FFF"],                     primary: "#CE1126", secondary: "#8B0000", cardBg: ["#0A0000","#130000","#0A0000"], headerBg: ["#180000","#0A0000"] },
  Philippines:     { flag: ["#0038A8","#CE1126","#FFF","#FCD116"], primary: "#0038A8", secondary: "#CE1126", cardBg: ["#000008","#000010","#000008"], headerBg: ["#000012","#000008"] },
};
const DEFAULT_THEME: CT = {
  flag: [BRAND,"#006d7c","#004B57"], primary: BRAND, secondary: "#006d7c",
  cardBg: ["#030D10","#041218","#030D10"], headerBg: ["#041A20","#020C10"],
};
const getTheme = (c?: string | null): CT => (c && THEMES[c]) ? THEMES[c] : DEFAULT_THEME;

const ROLES = {
  ceo:    { label: "CEO & FOUNDER",   color: Colors.gold ?? "#D4A853", bg: "rgba(212,168,83,0.15)"  },
  staff:  { label: "STAFF",           color: BRAND,                    bg: "rgba(0,188,212,0.15)"   },
  member: { label: "DIGITAL CITIZEN", color: "#9B59B6",                bg: "rgba(155,89,182,0.15)"  },
};

function fmtDate(iso: string) { const d = new Date(iso); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; }
function addYears(iso: string, n: number) { const d = new Date(iso); d.setFullYear(d.getFullYear()+n); return d.toISOString(); }
function padMember(n: number) { return String(n).padStart(6,"0"); }
function mrz1(name: string) { return `AFUCHAT<<${name.toUpperCase().replace(/[^A-Z ]/g,"").replace(/ /g,"<").padEnd(30,"<").slice(0,30)}`; }
function mrz2(id: string, c: string) { return `${id.padEnd(9,"<")}${(c||"AFU").toUpperCase().slice(0,3).padEnd(3,"<")}${"<".repeat(17)}`; }

/* ─── CAPTURE HELPERS ─── */
async function h2cCapture(el: HTMLElement): Promise<HTMLCanvasElement> {
  const h2c = (await import("html2canvas")).default;
  return h2c(el, { useCORS: true, allowTaint: false, backgroundColor: null, scale: 3, logging: false });
}
async function webDownload(domRef: React.RefObject<View | null>, filename: string) {
  const el = domRef.current as unknown as HTMLElement | null;
  if (!el) return;
  const canvas = await h2cCapture(el);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
async function nativeDownload(ref: React.RefObject<any>) {
  if (!ref.current || typeof (ref.current as any).capture !== "function") return;
  const uri: string = await (ref.current as any).capture();
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png" });
}
async function webPrint(frontRef: React.RefObject<View | null>, backRef: React.RefObject<View | null>, handle: string) {
  const frontEl = frontRef.current as unknown as HTMLElement | null;
  const backEl  = backRef.current  as unknown as HTMLElement | null;
  if (!frontEl || !backEl) return;
  const [fc, bc] = await Promise.all([h2cCapture(frontEl), h2cCapture(backEl)]);
  const frontSrc = fc.toDataURL("image/png");
  const backSrc  = bc.toDataURL("image/png");
  const w = fc.width / 3; const h = fc.height / 3;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) { alert("Allow pop-ups to use Print."); return; }
  win.document.write(`<!DOCTYPE html><html><head>
  <meta charset="utf-8"/>
  <title>AfuChat ID — @${handle}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#111;font-family:sans-serif;color:#aaa}
  .page{width:100vw;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;page-break-inside:avoid}
  .page:last-child{page-break-after:auto}.label{font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;opacity:.5}
  img{border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.6);max-width:90vw}
  .hint{position:fixed;top:16px;right:16px;font-size:12px;background:#222;padding:8px 16px;border-radius:8px;cursor:pointer;border:1px solid #333}
  @media print{body{background:#fff}.hint{display:none}img{box-shadow:none}}</style>
  </head><body>
  <button class="hint" onclick="window.print()">🖨 Print (Ctrl+P)</button>
  <div class="page"><div class="label">Front</div><img src="${frontSrc}" width="${w}" height="${h}" /></div>
  <div class="page"><div class="label">Back</div><img src="${backSrc}" width="${w}" height="${h}" /></div>
  <script>setTimeout(()=>window.print(),800)<\/script></body></html>`);
  win.document.close();
}

/* ─── MAIN SCREEN ─── */
export default function DigitalIdScreen() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [memberNumber, setMemberNumber] = useState<number | null>(null);
  const [loading,      setLoading]       = useState(true);
  const [showBack,     setShowBack]      = useState(false);
  const [dlState,      setDlState]       = useState<"idle"|"front"|"back"|"print">("idle");

  const flipVal = useSharedValue(0);
  const frontDomRef  = useRef<View>(null);
  const backDomRef   = useRef<View>(null);
  const frontShotRef = useRef<any>(null);
  const backShotRef  = useRef<any>(null);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      setLoading(true);
      try {
        const { count } = await supabase.from("profiles")
          .select("*", { count: "exact", head: true })
          .lt("created_at", profile.created_at ?? new Date().toISOString());
        setMemberNumber((count ?? 0) + 1);
      } catch { setMemberNumber(1); }
      finally { setLoading(false); }
    })();
  }, [profile?.id]);

  const theme    = useMemo(() => getTheme(profile?.country), [profile?.country]);
  const role     = useMemo(() => getMemberRole(profile?.handle, profile?.is_admin), [profile]);
  const roleConf = ROLES[role];

  const afuId = useMemo(() => {
    if (!profile?.id) return "00000000";
    const hex = profile.id.replace(/-/g, "");
    return String(parseInt(hex.slice(0,8), 16) % 100000000).padStart(8, "0");
  }, [profile?.id]);

  const qrValue  = `afuchat://id/${afuId}`;
  const issued   = profile?.created_at ? fmtDate(profile.created_at)              : "01/01/2024";
  const expires  = profile?.created_at ? fmtDate(addYears(profile.created_at, 10)) : "01/01/2034";
  const mrzLine1 = mrz1(profile?.display_name ?? "UNKNOWN");
  const mrzLine2 = mrz2(afuId, profile?.country ?? "AFU");

  const CARD_W = Math.min(width - 32, 380);
  const CARD_H = Math.round(CARD_W / 1.586);

  function flip() {
    const next = showBack ? 0 : 1;
    flipVal.value = withTiming(next, { duration: 600, easing: Easing.out(Easing.cubic) });
    setShowBack(!showBack);
  }

  const frontFace = useAnimatedStyle(() => ({
    transform: [{ perspective: 1600 }, { rotateY: `${interpolate(flipVal.value, [0,1], [0, 180])}deg` }],
    backfaceVisibility: "hidden" as any,
    position: "absolute" as any, top: 0, left: 0, right: 0, bottom: 0,
  }));
  const backFace = useAnimatedStyle(() => ({
    transform: [{ perspective: 1600 }, { rotateY: `${interpolate(flipVal.value, [0,1], [-180, 0])}deg` }],
    backfaceVisibility: "hidden" as any,
    position: "absolute" as any, top: 0, left: 0, right: 0, bottom: 0,
  }));

  async function download(side: "front" | "back") {
    setDlState(side);
    const filename = `afuchat-id-${side}-${profile?.handle ?? "card"}.png`;
    try {
      if (Platform.OS === "web") await webDownload(side === "front" ? frontDomRef : backDomRef, filename);
      else await nativeDownload(side === "front" ? frontShotRef : backShotRef);
    } finally { setDlState("idle"); }
  }

  async function handlePrint() {
    if (Platform.OS !== "web") return;
    setDlState("print");
    try { await webPrint(frontDomRef, backDomRef, profile?.handle ?? "user"); }
    finally { setDlState("idle"); }
  }

  if (loading) return <ProfileSkeleton />;

  const cp = { cardWidth: CARD_W, cardHeight: CARD_H, theme, profile, role, roleConf,
               memberNumber, afuId, issued, expires, mrzLine1, mrzLine2, qrValue };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* HEADER */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Digital ID</Text>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={handlePrint}
          disabled={Platform.OS !== "web" || dlState !== "idle"}
        >
          {dlState === "print"
            ? <ActivityIndicator size="small" color={colors.textMuted} />
            : <Ionicons name="print-outline" size={20} color={Platform.OS === "web" ? colors.text : colors.textMuted} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* FLIP CARD STAGE */}
        <TouchableOpacity activeOpacity={0.95} onPress={flip}
          style={[s.stage, { width: CARD_W, height: CARD_H }]}>
          <Animated.View style={[{ width: CARD_W, height: CARD_H }, frontFace]}>
            <CardFront {...cp} />
          </Animated.View>
          <Animated.View style={[{ width: CARD_W, height: CARD_H }, backFace]}>
            <CardBack {...cp} />
          </Animated.View>
        </TouchableOpacity>

        {/* FLIP INDICATOR */}
        <View style={s.flipRow}>
          <View style={[s.flipPill, { backgroundColor: isDark ? "#ffffff12" : "#00000010" }]}>
            <Ionicons name="sync-outline" size={11} color={colors.textMuted} />
            <Text style={[s.flipTxt, { color: colors.textMuted }]}>
              {showBack ? "Showing back — tap to flip" : "Tap card to flip"}
            </Text>
          </View>
          <View style={[s.sideDot, { backgroundColor: showBack ? theme.secondary : theme.primary }]} />
          <Text style={[s.sideLabel, { color: colors.textMuted }]}>{showBack ? "BACK" : "FRONT"}</Text>
        </View>

        {/* ACTION BUTTONS */}
        <View style={s.actionRow}>
          <ActionBtn label="Save Front" icon="download-outline" color={BRAND}
            loading={dlState === "front"} disabled={dlState !== "idle"} onPress={() => download("front")} />
          <ActionBtn label="Save Back" icon="download-outline" color={theme.primary}
            loading={dlState === "back"} disabled={dlState !== "idle"} onPress={() => download("back")} />
          {Platform.OS === "web" && (
            <ActionBtn label="Print" icon="print-outline" color={colors.textMuted}
              loading={dlState === "print"} disabled={dlState !== "idle"} onPress={handlePrint} />
          )}
        </View>

        {/* HINT */}
        <View style={[s.tip, { backgroundColor: isDark ? "#ffffff07" : "#00000007", borderColor: BRAND + "22" }]}>
          <Ionicons name="scan-circle-outline" size={13} color={BRAND} />
          <Text style={[s.tipText, { color: colors.textMuted }]}>
            Show your QR code so others can scan and send you payments instantly.
          </Text>
        </View>
      </ScrollView>

      {/* HIDDEN CAPTURE LAYERS */}
      <View style={s.captureLayer} pointerEvents="none">
        <ViewShot ref={frontShotRef} options={{ format: "png", quality: 1, result: "tmpfile" }}>
          <View ref={frontDomRef}><CardFront {...cp} /></View>
        </ViewShot>
        <ViewShot ref={backShotRef} options={{ format: "png", quality: 1, result: "tmpfile" }}>
          <View ref={backDomRef}><CardBack {...cp} /></View>
        </ViewShot>
      </View>
    </View>
  );
}

/* ─── ACTION BUTTON ─── */
function ActionBtn({ label, icon, color, loading, disabled, onPress }: {
  label: string; icon: string; color: string; loading: boolean; disabled: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.actionBtn, { borderColor: color + "55" }, disabled && s.actionBtnDim]}
      onPress={onPress} disabled={disabled}
    >
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : <Ionicons name={icon as any} size={14} color={color} />}
      <Text style={[s.actionBtnTxt, { color }]}>{loading ? "Working…" : label}</Text>
    </TouchableOpacity>
  );
}

/* ─── SHARED CARD PARTS ─── */
function FlagStrip({ colors: fc, h = 5 }: { colors: string[]; h?: number }) {
  return (
    <View style={{ flexDirection: "row", height: h }}>
      {fc.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
    </View>
  );
}

function SecurityPattern({ w, h, color }: { w: number; h: number; color: string }) {
  if (Platform.OS !== "web") return null;
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const step = 14;
  for (let i = -h; i < w + h; i += step) {
    lines.push({ x1: i, y1: 0, x2: i + h, y2: h });
    lines.push({ x1: i + h, y1: 0, x2: i, y2: h });
  }
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
      <svg width={w} height={h} style={{ position: "absolute", top: 0, left: 0 } as any}>
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={color} strokeWidth="0.5" opacity="0.12" />
        ))}
      </svg>
    </View>
  );
}

function MagneticStripe({ w }: { w: number }) {
  return (
    <View style={{ width: w, height: 38, backgroundColor: "#1a1a1a", marginVertical: 0 }}>
      <View style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
        {[...Array(6)].map((_, i) => (
          <View key={i} style={{ height: 2, backgroundColor: i % 2 === 0 ? "#333" : "#111", flex: 1 }} />
        ))}
      </View>
    </View>
  );
}

function Chip({ size = 32, primary }: { size?: number; primary: string }) {
  const s2 = size * 0.6;
  return (
    <View style={{
      width: size, height: Math.round(size * 0.78),
      borderRadius: 4, backgroundColor: "#C8A84B",
      borderWidth: 0.5, borderColor: "#A07828",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      ...Platform.select({ web: { boxShadow: "inset 0 0 6px rgba(0,0,0,0.4)" } as any, default: {} }),
    }}>
      <View style={{ width: s2, height: s2 * 0.75, borderRadius: 2, borderWidth: 0.5, borderColor: "#A07828", backgroundColor: "#B8943C", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: s2 * 0.6, height: 0.5, backgroundColor: "#8B6914", marginVertical: 2 }} />
        <View style={{ width: s2 * 0.6, height: 0.5, backgroundColor: "#8B6914", marginVertical: 2 }} />
        <View style={{ width: s2 * 0.6, height: 0.5, backgroundColor: "#8B6914", marginVertical: 2 }} />
      </View>
    </View>
  );
}

function HoloStrip({ w, primary }: { w: number; primary: string }) {
  if (Platform.OS !== "web") {
    return <View style={{ width: w, height: 24, backgroundColor: primary + "22" }} />;
  }
  return (
    <View style={{ width: w, height: 22, overflow: "hidden" }}>
      <svg width={w} height={22} style={{ position: "absolute", top: 0, left: 0 } as any}>
        <defs>
          <linearGradient id="holo" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#FF0080" stopOpacity="0.25" />
            <stop offset="20%"  stopColor={primary}  stopOpacity="0.35" />
            <stop offset="40%"  stopColor="#00FFCC"  stopOpacity="0.25" />
            <stop offset="60%"  stopColor="#FFD700"  stopOpacity="0.3"  />
            <stop offset="80%"  stopColor="#8B5CF6"  stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FF0080"  stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={w} height={22} fill="url(#holo)" />
        {[...Array(Math.floor(w / 8))].map((_, i) => (
          <line key={i} x1={i * 8} y1="0" x2={i * 8} y2="22"
            stroke="#ffffff" strokeWidth="0.3" opacity="0.15" />
        ))}
      </svg>
    </View>
  );
}

type CP = {
  cardWidth: number; cardHeight: number; theme: CT; profile: any; role: MemberRole;
  roleConf: typeof ROLES[MemberRole]; memberNumber: number | null; afuId: string;
  issued: string; expires: string; mrzLine1: string; mrzLine2: string; qrValue: string;
};

function Field({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <View style={{ gap: 1 }}>
      <Text style={s.fLbl}>{label}</Text>
      <Text style={[s.fVal, mono && s.fMono, accent ? { color: accent } : {}]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/* ─── FRONT FACE ─── */
function CardFront({ cardWidth: cw, cardHeight: ch, theme, profile, roleConf, memberNumber, afuId, issued, expires, mrzLine1, mrzLine2 }: CP) {
  const PHOTO_W = Math.round(cw * 0.28);
  const PHOTO_H = Math.round(PHOTO_W * 1.28);
  const chipSize = Math.round(cw * 0.085);

  return (
    <View style={[s.card, { width: cw, height: ch }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={theme.cardBg}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <SecurityPattern w={cw} h={ch} color={theme.primary} />

      {/* TOP FLAG STRIPE */}
      <FlagStrip colors={theme.flag} h={6} />

      {/* HEADER BAND */}
      <LinearGradient colors={theme.headerBg} style={s.hdr}>
        <Image source={afuSymbol} style={{ width: 22, height: 22 }} tintColor={BRAND} resizeMode="contain" />
        <View style={{ flex: 1, marginLeft: 7 }}>
          <Text style={s.hdrBrand}>AFUCHAT UNIVERSE</Text>
          <Text style={s.hdrSub}>DIGITAL IDENTITY CARD</Text>
        </View>
        {/* role badge */}
        <View style={[s.roleBadge, { backgroundColor: roleConf.bg, borderColor: roleConf.color + "66" }]}>
          <Text style={[s.roleTxt, { color: roleConf.color }]}>{roleConf.label}</Text>
        </View>
      </LinearGradient>

      {/* HOLOGRAPHIC STRIP */}
      <HoloStrip w={cw} primary={theme.primary} />

      {/* MAIN BODY */}
      <View style={{ flex: 1, flexDirection: "row", paddingHorizontal: 12, paddingTop: 8, gap: 12 }}>

        {/* LEFT: photo + chip */}
        <View style={{ alignItems: "center", gap: 8 }}>
          {/* Photo box — rectangle like real ID */}
          <View style={[s.photoBox, {
            width: PHOTO_W, height: PHOTO_H,
            borderColor: theme.primary + "99",
          }]}>
            {profile?.avatar_url
              ? <Image source={{ uri: profile.avatar_url }}
                  style={{ width: PHOTO_W - 4, height: PHOTO_H - 4, borderRadius: 2 }}
                  resizeMode="cover" />
              : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <Ionicons name="person" size={PHOTO_W * 0.38} color="#ffffff28" />
                  <Text style={{ fontSize: 6, color: "#ffffff22", letterSpacing: 0.5 }}>PHOTO</Text>
                </View>}
          </View>
          {/* Chip */}
          <Chip size={chipSize} primary={theme.primary} />
        </View>

        {/* RIGHT: ID fields */}
        <View style={{ flex: 1, gap: 6, paddingTop: 2 }}>
          <Field label="SURNAME / FULL NAME" value={profile?.display_name ?? "— — —"} />
          <View style={{ height: 0.5, backgroundColor: theme.primary + "33" }} />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="MEMBER NO." value={`AFU‑${padMember(memberNumber ?? 1)}`} mono accent={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="AFU ID" value={afuId} mono accent={theme.secondary || "#ffffff99"} />
            </View>
          </View>

          <Field label="NATIONALITY" value={profile?.country ?? "DIGITAL CITIZEN"} />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="DATE OF ISSUE" value={issued} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="DATE OF EXPIRY" value={expires} />
            </View>
          </View>

          {/* Signature area */}
          <View style={{ marginTop: 2 }}>
            <Text style={s.sigLbl}>HOLDER'S SIGNATURE</Text>
            <Text style={[s.sigVal, { borderBottomColor: theme.primary + "55" }]}>
              {profile?.display_name ?? ""}
            </Text>
          </View>
        </View>
      </View>

      {/* MRZ ZONE */}
      <View style={[s.mrzZone, { borderTopColor: theme.primary + "22" }]}>
        <Text style={s.mrz} numberOfLines={1}>{mrzLine1}</Text>
        <Text style={s.mrz} numberOfLines={1}>{mrzLine2}</Text>
      </View>

      {/* BOTTOM FLAG */}
      <FlagStrip colors={theme.flag} h={5} />
    </View>
  );
}

/* ─── BACK FACE ─── */
function CardBack({ cardWidth: cw, cardHeight: ch, theme, profile, memberNumber, afuId, issued, expires, qrValue, mrzLine1, mrzLine2 }: CP) {
  const QR_SIZE = Math.round(ch * 0.42);

  return (
    <View style={[s.card, { width: cw, height: ch }]}>
      {/* Background */}
      <LinearGradient
        colors={[theme.cardBg[2], theme.cardBg[1], theme.cardBg[0]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
      />
      <SecurityPattern w={cw} h={ch} color={theme.secondary || theme.primary} />

      {/* TOP FLAG */}
      <FlagStrip colors={theme.flag} h={6} />

      {/* MAGNETIC STRIPE */}
      <MagneticStripe w={cw} />

      {/* SIGNATURE PANEL */}
      <View style={[s.signaturePanel, { borderColor: theme.primary + "22" }]}>
        <View style={[s.signatureStripes]}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? "#ffffff08" : "#00000008" }} />
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, gap: 8 }}>
          <Image source={afuSymbol} style={{ width: 14, height: 14 }} tintColor={BRAND} resizeMode="contain" />
          <Text style={[s.panelTxt, { color: BRAND }]}>AFUCHAT UNIVERSE · DIGITAL FINGERPRINT</Text>
          <View style={{ flex: 1 }} />
          <View style={[s.secChip, { borderColor: theme.primary + "55" }]}>
            <Ionicons name="lock-closed" size={6} color={theme.primary} />
            <Text style={[s.secTxt, { color: theme.primary }]}>SECURE</Text>
          </View>
        </View>
      </View>

      {/* HOLOGRAPHIC STRIP */}
      <HoloStrip w={cw} primary={theme.primary} />

      {/* MAIN BACK BODY */}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 12 }}>

        {/* QR Code */}
        <View style={[s.qrBox, { borderColor: theme.primary + "44", backgroundColor: "#ffffff08" }]}>
          <QRCode
            value={qrValue}
            size={QR_SIZE}
            color="#ffffff"
            backgroundColor="transparent"
            logo={afuSymbol}
            logoSize={QR_SIZE * 0.18}
            logoBackgroundColor="transparent"
          />
        </View>

        {/* Right info panel */}
        <View style={{ flex: 1, gap: 7 }}>
          <Field label="AFU ID" value={afuId} mono accent={theme.primary} />
          <View style={{ height: 0.5, backgroundColor: theme.primary + "33" }} />
          <Field label="MEMBER NO." value={`AFU‑${padMember(memberNumber ?? 1)}`} mono />
          <Field label="NATIONALITY" value={profile?.country ?? "DIGITAL CITIZEN"} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="ISSUED" value={issued} /></View>
            <View style={{ flex: 1 }}><Field label="EXPIRES" value={expires} /></View>
          </View>
          <View style={{ marginTop: 2 }}>
            <Text style={s.sigLbl}>SCAN TO VERIFY</Text>
            <Text style={[s.sigLbl, { color: theme.primary, letterSpacing: 0.3, marginTop: 1 }]}>
              afuchat://id/{afuId}
            </Text>
          </View>
        </View>
      </View>

      {/* MRZ ZONE */}
      <View style={[s.mrzZone, { borderTopColor: theme.primary + "22" }]}>
        <Text style={s.mrz} numberOfLines={1}>{mrzLine1}</Text>
        <Text style={s.mrz} numberOfLines={1}>{mrzLine2}</Text>
      </View>

      {/* BOTTOM FLAG */}
      <FlagStrip colors={theme.flag} h={5} />
    </View>
  );
}

/* ─── STYLES ─── */
const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: 0.3 },
  scroll: { alignItems: "center", paddingTop: 24, gap: 16 },
  stage: { position: "relative" },
  flipRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  flipPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  flipTxt: { fontSize: 11, letterSpacing: 0.3 },
  sideDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
  sideLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  actionBtnDim: { opacity: 0.4 },
  actionBtnTxt: { fontSize: 13, fontWeight: "600" },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, padding: 12, borderWidth: 0.5, maxWidth: 360, width: "90%" },
  tipText: { flex: 1, fontSize: 11, lineHeight: 17 },
  captureLayer: { position: "absolute", left: 0, top: 0, opacity: 0, zIndex: -1, pointerEvents: "none" as any },

  /* Card shell */
  card: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 12px 40px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.06)" } as any,
      default: { shadowColor: "#000", shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
    }),
  },

  /* Header */
  hdr: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7 },
  hdrBrand: { fontSize: 10, fontWeight: "900", color: BRAND, letterSpacing: 2, lineHeight: 13 },
  hdrSub: { fontSize: 6.5, color: "#ffffff55", letterSpacing: 0.8, lineHeight: 10 },

  /* Role badge */
  roleBadge: { borderWidth: 0.5, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  roleTxt: { fontSize: 6, fontWeight: "800", letterSpacing: 0.8 },

  /* Photo box — rectangular like a real ID */
  photoBox: {
    borderWidth: 1.5,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#ffffff08",
  },

  /* Fields */
  fLbl: { fontSize: 6.5, fontWeight: "700", color: "#ffffff44", letterSpacing: 1, lineHeight: 9 },
  fVal: { fontSize: 10, color: "#ffffffcc", fontWeight: "600", lineHeight: 14 },
  fMono: { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 11, letterSpacing: 1.2, fontWeight: "800" },

  /* Signature */
  sigLbl: { fontSize: 6, fontWeight: "700", color: "#ffffff33", letterSpacing: 0.8, marginBottom: 2 },
  sigVal: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#ffffffaa",
    borderBottomWidth: 0.5,
    paddingBottom: 2,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },

  /* MRZ Zone */
  mrzZone: {
    backgroundColor: "#000000aa",
    borderTopWidth: 0.5,
    paddingHorizontal: 10,
    paddingTop: 3,
    paddingBottom: 2,
  },
  mrz: {
    fontSize: 6,
    color: "#ffffff55",
    letterSpacing: 1.8,
    lineHeight: 9,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  /* Back */
  signaturePanel: { borderBottomWidth: 0.5, overflow: "hidden" },
  signatureStripes: { flexDirection: "row", height: 18 },
  panelTxt: { fontSize: 6.5, fontWeight: "800", letterSpacing: 0.8 },
  secChip: { flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 0.5, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 2 },
  secTxt: { fontSize: 5.5, fontWeight: "700", letterSpacing: 0.5 },
  qrBox: { padding: 8, borderWidth: 0.5, borderRadius: 8 },
});
