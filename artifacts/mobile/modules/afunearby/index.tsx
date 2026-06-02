/**
 * AfuNearby — single hub for all device-connectivity features:
 *   • Bluetooth BLE  — real scanning / connect / disconnect (react-native-ble-plx)
 *   • Wi-Fi          — real SSID/BSSID/signal/frequency via @react-native-community/netinfo
 *                      + live local-network HTTP scanner to find LAN devices
 *   • Shortcuts      — real deep-link copy (expo-clipboard) + Share sheet + how-to guide
 *
 * Native-only (nativeOnly: true). All three surfaces are lazy-loaded so the
 * module never crashes in Expo Go or on the web bundle.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import * as Clipboard from "expo-clipboard";
import * as Network from "expo-network";

// ─── @react-native-community/netinfo (already installed) ─────────────────────
let NetInfo: any = null;
try { NetInfo = require("@react-native-community/netinfo").default; } catch {}

// ─── expo-intent-launcher (already installed) ─────────────────────────────────
let IntentLauncher: any = null;
try { IntentLauncher = require("expo-intent-launcher"); } catch {}

// ─── react-native-ble-plx lazy loader ────────────────────────────────────────
// Only load after runtime check; fallback gracefully if native module absent.
let BleManagerClass: any = null;
let BleStateEnum: Record<string, string> = {
  Unknown: "Unknown", Resetting: "Resetting", Unsupported: "Unsupported",
  Unauthorized: "Unauthorized", PoweredOff: "PoweredOff", PoweredOn: "PoweredOn",
};
let bleLoaded = false;

function ensureBle(): any {
  if (!bleLoaded) {
    bleLoaded = true;
    if (Platform.OS === "web") return null;
    try {
      const mod = require("react-native-ble-plx");
      BleManagerClass = mod.BleManager;
      if (mod.State) BleStateEnum = mod.State;
    } catch { BleManagerClass = null; }
  }
  return BleManagerClass;
}

// Singleton BLE manager — created once and reused
let _bleInstance: any = null;
function getBle(): any {
  const Cls = ensureBle();
  if (!Cls) return null;
  if (!_bleInstance) {
    try { _bleInstance = new Cls(); } catch { return null; }
  }
  return _bleInstance;
}

// ─── Bluetooth service-UUID → device type mapping ────────────────────────────
const UUID_MAP: Record<string, { label: string; icon: string }> = {
  "1800": { label: "Generic Access",      icon: "radio-outline" },
  "1801": { label: "Generic Attribute",   icon: "radio-outline" },
  "180a": { label: "Device Info",         icon: "information-circle-outline" },
  "180f": { label: "Battery",             icon: "battery-half-outline" },
  "180d": { label: "Heart Rate Monitor",  icon: "heart-outline" },
  "1812": { label: "HID Device",          icon: "game-controller-outline" },
  "110b": { label: "Audio Sink",          icon: "musical-notes-outline" },
  "110e": { label: "AV Remote",           icon: "volume-medium-outline" },
  "1108": { label: "Headset",             icon: "headset-outline" },
  "1101": { label: "Serial Port",         icon: "terminal-outline" },
  "fe9a": { label: "Amiibo / NFC",        icon: "disc-outline" },
  "feff": { label: "Google Nearby",       icon: "logo-google" },
  "fe6f": { label: "Apple Nearby",        icon: "logo-apple" },
};
function inferDevice(serviceUUIDs: string[] | null): { label: string; icon: string } {
  if (!serviceUUIDs || serviceUUIDs.length === 0) return { label: "Unknown", icon: "radio-outline" };
  for (const uuid of serviceUUIDs) {
    const key = uuid.toLowerCase().replace(/-/g, "").slice(4, 8);
    if (UUID_MAP[key]) return UUID_MAP[key];
  }
  return { label: "BLE Device", icon: "radio-outline" };
}

// ─── RSSI helpers ─────────────────────────────────────────────────────────────
function rssiLevel(rssi: number | null): 0 | 1 | 2 | 3 | 4 {
  if (rssi === null) return 0;
  if (rssi >= -50) return 4;
  if (rssi >= -65) return 3;
  if (rssi >= -75) return 2;
  if (rssi >= -85) return 1;
  return 0;
}
function rssiLabel(rssi: number | null) {
  if (rssi === null) return "—";
  if (rssi >= -50) return "Excellent";
  if (rssi >= -65) return "Good";
  if (rssi >= -75) return "Fair";
  if (rssi >= -85) return "Weak";
  return "Poor";
}
function rssiColor(rssi: number | null, accent: string) {
  const l = rssiLevel(rssi);
  if (l >= 4) return "#34C759";
  if (l >= 3) return accent;
  if (l >= 2) return "#FF9500";
  return "#FF3B30";
}

function SignalBars({ rssi, accent }: { rssi: number | null; accent: string }) {
  const level = rssiLevel(rssi);
  const color = rssiColor(rssi, accent);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {[1, 2, 3, 4].map((b) => (
        <View key={b} style={{
          width: 4, height: b * 4, borderRadius: 1,
          backgroundColor: b <= level ? color : color + "33",
        }} />
      ))}
    </View>
  );
}

// ─── Pulse dot for scanning ───────────────────────────────────────────────────
function PulseDot({ active, color }: { active: boolean; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) { scale.setValue(1); opacity.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
      ]),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active]);
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{
        position: "absolute", width: 12, height: 12, borderRadius: 6,
        backgroundColor: color, transform: [{ scale }], opacity,
      }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function toast(msg: string) {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
}
async function openSystemSettings(action: string) {
  try {
    if (Platform.OS === "android" && IntentLauncher) {
      await IntentLauncher.startActivityAsync(action);
    } else if (Platform.OS === "ios") {
      await import("react-native").then(({ Linking }) => Linking.openSettings());
    }
  } catch {
    try { (await import("react-native")).Linking.openSettings(); } catch {}
  }
}

// ─── TAB: Bluetooth BLE ──────────────────────────────────────────────────────

type BleDevice = {
  id: string;
  name: string | null;
  rssi: number | null;
  serviceUUIDs: string[] | null;
  isConnectable: boolean | null;
  seenAt: number;
};

function BluetoothTab() {
  const { colors, accent } = useTheme();
  const [btState, setBtState] = useState("Unknown");
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Map<string, BleDevice>>(new Map());
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateSub = useRef<any>(null);
  const ble = getBle();
  const bleAvailable = ble !== null;

  useEffect(() => {
    if (!ble) return;
    stateSub.current = ble.onStateChange((s: string) => setBtState(s), true);
    return () => {
      stateSub.current?.remove();
      stopScan();
    };
  }, []);

  function stopScan() {
    if (scanTimer.current) { clearTimeout(scanTimer.current); scanTimer.current = null; }
    try { ble?.stopDeviceScan(); } catch {}
    setScanning(false);
  }

  async function requestBlePermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    try {
      const { PermissionsAndroid } = await import("react-native");
      const needed: string[] = Platform.Version >= 31
        ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const results = await PermissionsAndroid.requestMultiple(needed as any);
      return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
    } catch { return true; }
  }

  async function startScan() {
    if (!ble) return;
    if (btState !== BleStateEnum.PoweredOn) {
      setError("Turn on Bluetooth to scan for nearby devices.");
      return;
    }
    const ok = await requestBlePermissions();
    if (!ok) { setPermDenied(true); return; }
    setPermDenied(false);
    setError(null);
    setDevices(new Map());
    setScanning(true);
    Vibration.vibrate(15);

    try {
      ble.startDeviceScan(null, { allowDuplicates: false }, (err: any, device: any) => {
        if (err) { stopScan(); setError(err.message ?? "Scan error"); return; }
        if (!device) return;
        setDevices((prev) => {
          const next = new Map(prev);
          const existing = next.get(device.id);
          next.set(device.id, {
            id: device.id,
            name: device.name || device.localName || existing?.name || null,
            rssi: device.rssi ?? existing?.rssi ?? null,
            serviceUUIDs: device.serviceUUIDs ?? existing?.serviceUUIDs ?? null,
            isConnectable: device.isConnectable ?? existing?.isConnectable ?? null,
            seenAt: Date.now(),
          });
          return next;
        });
      });
    } catch (e: any) {
      setError(e?.message ?? "Could not start scan");
      setScanning(false);
      return;
    }
    scanTimer.current = setTimeout(stopScan, 20000);
  }

  async function connectDevice(d: BleDevice) {
    if (!ble || connecting) return;
    setConnecting(d.id);
    setError(null);
    try {
      await ble.connectToDevice(d.id, { autoConnect: false, requestMTU: 512 });
      await ble.discoverAllServicesAndCharacteristicsForDevice(d.id);
      setConnected((prev) => new Set(prev).add(d.id));
      Vibration.vibrate([0, 40, 20, 40]);
      toast("Connected to " + (d.name ?? d.id.slice(0, 8)));
    } catch (e: any) {
      setError("Connect failed: " + (e?.message ?? "unknown error"));
    } finally { setConnecting(null); }
  }

  async function disconnectDevice(id: string) {
    try { await ble?.cancelDeviceConnection(id); } catch {}
    setConnected((prev) => { const s = new Set(prev); s.delete(id); return s; });
    toast("Disconnected");
  }

  const sorted = useMemo(() => {
    return [...devices.values()].sort((a, b) => {
      const ca = connected.has(a.id) ? 1 : 0;
      const cb = connected.has(b.id) ? 1 : 0;
      if (ca !== cb) return cb - ca;
      return (b.rssi ?? -999) - (a.rssi ?? -999);
    });
  }, [devices, connected]);

  if (!bleAvailable) {
    return <PlaceholderCard icon="bluetooth" title="Bluetooth — APK Build Required"
      desc="BLE scanning requires the AfuChat APK. Install via EAS and reopen this screen." accent={accent} colors={colors} />;
  }

  const btOff = btState === BleStateEnum.PoweredOff || btState === "Unknown";
  const btBad = btState === BleStateEnum.Unauthorized || btState === BleStateEnum.Unsupported;

  return (
    <ScrollView style={sh.scroll} contentContainerStyle={sh.content} showsVerticalScrollIndicator={false}>

      {/* Status header */}
      <View style={[sh.card, { borderColor: btOff || btBad ? "#FF3B3040" : accent + "40", backgroundColor: btOff || btBad ? "#FF3B3010" : accent + "10" }]}>
        <View style={[sh.iconWrap, { backgroundColor: btOff || btBad ? "#FF3B3025" : accent + "25" }]}>
          <Ionicons name="bluetooth" size={24} color={btOff || btBad ? "#FF3B30" : accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[sh.cardTitle, { color: colors.text }]}>
            {btState === BleStateEnum.PoweredOn ? "Bluetooth On"
              : btState === BleStateEnum.PoweredOff ? "Bluetooth Off"
              : btState === BleStateEnum.Unauthorized ? "Permission Denied"
              : btState === BleStateEnum.Unsupported ? "BLE Unsupported"
              : "Initialising…"}
          </Text>
          <Text style={[sh.cardSub, { color: colors.textMuted }]}>
            {btState === BleStateEnum.PoweredOn
              ? `${devices.size} device${devices.size !== 1 ? "s" : ""} found · tap Scan to search`
              : btState === BleStateEnum.PoweredOff ? "Enable Bluetooth in Settings"
              : btState === BleStateEnum.Unauthorized ? "Tap Settings → grant Bluetooth"
              : "Bluetooth Low Energy is unavailable"}
          </Text>
        </View>
        {(btOff || btBad) && (
          <TouchableOpacity onPress={() => openSystemSettings("android.settings.BLUETOOTH_SETTINGS")}
            style={[sh.actionPill, { backgroundColor: accent }]}>
            <Text style={sh.actionPillText}>Settings</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Permission denied warning */}
      {permDenied && (
        <View style={[sh.warnRow, { backgroundColor: "#FF950015", borderColor: "#FF950040" }]}>
          <Ionicons name="warning" size={15} color="#FF9500" />
          <Text style={{ color: "#FF9500", fontSize: 12, flex: 1, lineHeight: 17 }}>
            Bluetooth permission denied. Open Settings → AfuChat → Permissions → enable Bluetooth.
          </Text>
          <TouchableOpacity onPress={() => openSystemSettings("android.settings.APPLICATION_DETAILS_SETTINGS")}>
            <Text style={{ color: "#FF9500", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Fix</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error banner */}
      {error && !permDenied && (
        <View style={[sh.warnRow, { backgroundColor: "#FF3B3015", borderColor: "#FF3B3040" }]}>
          <Ionicons name="alert-circle" size={15} color="#FF3B30" />
          <Text style={{ color: "#FF3B30", fontSize: 12, flex: 1, lineHeight: 17 }}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={15} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      )}

      {/* Scan button */}
      <TouchableOpacity
        onPress={scanning ? stopScan : startScan}
        disabled={btBad}
        style={[sh.scanBtn, {
          borderColor: scanning ? "#FF3B3060" : accent + "60",
          backgroundColor: scanning ? "#FF3B3010" : accent + "10",
          opacity: btBad ? 0.4 : 1,
        }]}
      >
        <PulseDot active={scanning} color={scanning ? "#FF3B30" : accent} />
        <Text style={[sh.scanBtnTxt, { color: scanning ? "#FF3B30" : accent }]}>
          {scanning ? "Scanning… (tap to stop)" : "Scan for Bluetooth Devices"}
        </Text>
        {scanning && <Text style={{ color: colors.textMuted, fontSize: 11 }}>20 s</Text>}
      </TouchableOpacity>

      {/* Device list */}
      {sorted.length > 0 && (
        <>
          <SectionHeader label={`DEVICES (${sorted.length})`} colors={colors} />
          <View style={{ gap: 8 }}>
            {sorted.map((d) => {
              const isConn = connected.has(d.id);
              const isCing = connecting === d.id;
              const devType = inferDevice(d.serviceUUIDs);
              const sigColor = rssiColor(d.rssi, accent);
              return (
                <View key={d.id} style={[sh.deviceRow, {
                  backgroundColor: isConn ? accent + "0E" : colors.surface,
                  borderColor: isConn ? accent + "40" : colors.border,
                }]}>
                  <View style={[sh.devIcon, { backgroundColor: isConn ? accent + "20" : colors.backgroundSecondary }]}>
                    <Ionicons name={devType.icon as any} size={20} color={isConn ? accent : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[sh.devName, { color: colors.text }]} numberOfLines={1}>
                        {d.name ?? "Unnamed Device"}
                      </Text>
                      {isConn && (
                        <View style={[sh.connPill, { backgroundColor: accent + "25" }]}>
                          <Text style={{ color: accent, fontSize: 9, fontFamily: "Inter_600SemiBold" }}>CONNECTED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[sh.devSub, { color: colors.textMuted }]} numberOfLines={1}>
                      {devType.label}  ·  {d.id.slice(0, 17)}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <SignalBars rssi={d.rssi} accent={accent} />
                      <Text style={{ fontSize: 10, color: sigColor, fontFamily: "Inter_500Medium" }}>
                        {rssiLabel(d.rssi)}{d.rssi !== null ? ` (${d.rssi} dBm)` : ""}
                      </Text>
                      {d.isConnectable === false && (
                        <Text style={{ fontSize: 10, color: colors.textMuted }}>· non-connectable</Text>
                      )}
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    {d.isConnectable !== false && (
                      <TouchableOpacity
                        onPress={() => isConn ? disconnectDevice(d.id) : connectDevice(d)}
                        disabled={isCing}
                        style={[sh.smallBtn, {
                          backgroundColor: isConn ? "#FF3B3015" : accent + "15",
                          borderColor: isConn ? "#FF3B3050" : accent + "50",
                        }]}
                      >
                        <Text style={[sh.smallBtnTxt, { color: isConn ? "#FF3B30" : accent }]}>
                          {isCing ? "…" : isConn ? "Disconnect" : "Connect"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={async () => {
                        await Clipboard.setStringAsync(d.id);
                        toast("Address copied");
                      }}
                      style={[sh.smallBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    >
                      <Text style={[sh.smallBtnTxt, { color: colors.textSecondary }]}>Copy ID</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {!scanning && sorted.length === 0 && btState === BleStateEnum.PoweredOn && (
        <View style={[sh.emptyBox, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="radio-outline" size={40} color={colors.textMuted} />
          <Text style={[sh.emptyTxt, { color: colors.textMuted }]}>
            Tap "Scan" to search for nearby Bluetooth devices.{"\n"}
            Make sure devices are in pairing or discoverable mode.
          </Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ─── TAB: Wi-Fi & Local Network ───────────────────────────────────────────────

type WifiDetails = {
  ssid: string | null;
  bssid: string | null;
  strength: number | null;
  frequency: number | null;
  linkSpeed: number | null;
  ipAddress: string | null;
  subnet: string | null;
  type: string;
  isConnected: boolean;
  isInternetReachable: boolean | null;
};

type LanDevice = {
  ip: string;
  status: number;
  type: string;
  label: string;
  icon: string;
  latencyMs: number;
};

function wifiStrengthLabel(s: number | null): string {
  if (s === null) return "—";
  if (s >= 80) return "Excellent";
  if (s >= 60) return "Good";
  if (s >= 40) return "Fair";
  if (s >= 20) return "Weak";
  return "Poor";
}

function guessDeviceLabel(ip: string, status: number): { label: string; icon: string; type: string } {
  const last = parseInt(ip.split(".").pop() ?? "0");
  if (last === 1 || last === 254) return { label: "Router / Gateway", icon: "home-outline", type: "router" };
  if (last === 2) return { label: "Secondary Router / AP", icon: "wifi-outline", type: "ap" };
  if (status === 200) return { label: "Web Server / NAS", icon: "server-outline", type: "server" };
  return { label: "Local Device", icon: "desktop-outline", type: "device" };
}

async function probeLan(subnet: string): Promise<LanDevice[]> {
  // Probe gateway addresses + a small range around .1–.10 and .254
  const targets = Array.from(new Set([1, 2, 3, 4, 5, 10, 100, 150, 200, 253, 254]));
  const found: LanDevice[] = [];
  await Promise.all(
    targets.map(async (host) => {
      const ip = `${subnet}.${host}`;
      const t0 = Date.now();
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 600);
        const res = await fetch(`http://${ip}`, { method: "HEAD", signal: ctrl.signal });
        clearTimeout(timer);
        const ms = Date.now() - t0;
        const { label, icon, type } = guessDeviceLabel(ip, res.status);
        found.push({ ip, status: res.status, label, icon, type, latencyMs: ms });
      } catch {}
    })
  );
  return found.sort((a, b) => {
    const order = (x: LanDevice) => x.type === "router" ? 0 : x.type === "ap" ? 1 : 2;
    return order(a) - order(b);
  });
}

function WifiTab() {
  const { colors, accent } = useTheme();
  const [wifi, setWifi] = useState<WifiDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [lanDevices, setLanDevices] = useState<LanDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWifi = useCallback(async () => {
    try {
      const [expoState, expoIp] = await Promise.all([
        Network.getNetworkStateAsync(),
        Network.getIpAddressAsync().catch(() => ""),
      ]);

      let details: Partial<WifiDetails> = {
        type: String(expoState.type ?? "UNKNOWN"),
        isConnected: expoState.isConnected ?? false,
        isInternetReachable: expoState.isInternetReachable ?? null,
        ipAddress: expoIp || null,
      };

      if (NetInfo) {
        const ni = await NetInfo.fetch();
        if (ni.type === "wifi" && ni.details) {
          const d = ni.details as any;
          details.ssid = d.ssid ?? null;
          details.bssid = d.bssid ?? null;
          details.strength = d.strength ?? null;
          details.frequency = d.frequency ?? null;
          details.linkSpeed = d.linkSpeed ?? null;
          details.ipAddress = d.ipAddress ?? details.ipAddress ?? null;
          details.subnet = d.subnet ?? null;
        }
      }

      setWifi(details as WifiDetails);
    } catch { setWifi(null); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchWifi(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); setLanDevices([]); fetchWifi(); }, [fetchWifi]);

  async function runLanScan() {
    if (scanning) return;
    const ip = wifi?.ipAddress ?? (await Network.getIpAddressAsync().catch(() => ""));
    if (!ip) { toast("No IP address — connect to Wi-Fi first"); return; }
    const parts = ip.split(".");
    if (parts.length !== 4) { toast("Cannot determine subnet"); return; }
    const subnet = parts.slice(0, 3).join(".");
    setScanning(true);
    setLanDevices([]);
    Vibration.vibrate(15);
    const found = await probeLan(subnet);
    setLanDevices(found);
    setScanning(false);
    toast(found.length ? `Found ${found.length} device${found.length > 1 ? "s" : ""}` : "No HTTP-accessible devices found");
  }

  const isWifi = wifi?.type?.toLowerCase().includes("wifi") || wifi?.ssid != null;
  const subnetStr = useMemo(() => {
    const ip = wifi?.ipAddress;
    if (!ip) return "";
    const p = ip.split(".");
    if (p.length !== 4) return "";
    return p.slice(0, 3).join(".") + ".0/24";
  }, [wifi?.ipAddress]);

  return (
    <ScrollView
      style={sh.scroll}
      contentContainerStyle={sh.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      {/* Status card */}
      <View style={[sh.card, { borderColor: isWifi ? accent + "40" : "#FF950040", backgroundColor: isWifi ? accent + "10" : "#FF950010" }]}>
        <View style={[sh.iconWrap, { backgroundColor: isWifi ? accent + "25" : "#FF950025" }]}>
          <Ionicons name={isWifi ? "wifi" : "cellular"} size={24} color={isWifi ? accent : "#FF9500"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[sh.cardTitle, { color: colors.text }]}>
            {loading ? "Detecting network…"
              : !wifi?.isConnected ? "No Network"
              : isWifi ? (wifi.ssid ? `Wi-Fi: ${wifi.ssid}` : "Connected to Wi-Fi")
              : `Mobile Data (${wifi.type})`}
          </Text>
          <Text style={[sh.cardSub, { color: colors.textMuted }]}>
            {wifi?.isInternetReachable ? "Internet reachable"
              : wifi?.isConnected ? "Local network only"
              : "Offline"}
            {wifi?.strength != null ? `  ·  ${wifiStrengthLabel(wifi.strength)}` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={() => openSystemSettings("android.settings.WIFI_SETTINGS")}
          style={[sh.actionPill, { backgroundColor: accent }]}>
          <Text style={sh.actionPillText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Network detail grid */}
      {wifi && (
        <View style={[sh.grid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {wifi.ssid && <GridRow label="Network (SSID)" value={wifi.ssid} colors={colors} copyable />}
          {wifi.bssid && <GridRow label="BSSID / AP MAC" value={wifi.bssid} colors={colors} copyable />}
          {wifi.ipAddress && <GridRow label="IP Address" value={wifi.ipAddress} colors={colors} copyable />}
          {subnetStr && <GridRow label="Subnet" value={subnetStr} colors={colors} />}
          {wifi.frequency && <GridRow label="Frequency" value={`${wifi.frequency} MHz${wifi.frequency >= 5000 ? " (5 GHz)" : " (2.4 GHz)"}`} colors={colors} />}
          {wifi.linkSpeed && <GridRow label="Link Speed" value={`${wifi.linkSpeed} Mbps`} colors={colors} />}
          {wifi.strength != null && (
            <GridRow
              label="Signal Strength"
              value={`${wifi.strength}% · ${wifiStrengthLabel(wifi.strength)}`}
              valueColor={wifi.strength >= 60 ? "#34C759" : wifi.strength >= 40 ? accent : "#FF9500"}
              colors={colors}
            />
          )}
          <GridRow
            label="Internet"
            value={wifi.isInternetReachable === true ? "Reachable" : wifi.isInternetReachable === false ? "Unreachable" : "Checking…"}
            valueColor={wifi.isInternetReachable === true ? "#34C759" : wifi.isInternetReachable === false ? "#FF3B30" : colors.textMuted}
            colors={colors}
          />
        </View>
      )}

      {/* LAN Scanner */}
      {isWifi && (
        <>
          <SectionHeader label="LOCAL NETWORK DEVICES" colors={colors} />
          <TouchableOpacity
            onPress={runLanScan}
            disabled={scanning}
            style={[sh.scanBtn, { borderColor: scanning ? "#FF3B3060" : accent + "60", backgroundColor: scanning ? "#FF3B3010" : accent + "10" }]}
          >
            <PulseDot active={scanning} color={scanning ? "#FF3B30" : accent} />
            <Text style={[sh.scanBtnTxt, { color: scanning ? "#FF3B30" : accent }]}>
              {scanning ? "Probing local network…" : "Scan Local Network (HTTP)"}
            </Text>
          </TouchableOpacity>

          {lanDevices.length > 0 && (
            <View style={{ gap: 8 }}>
              {lanDevices.map((d) => (
                <View key={d.ip} style={[sh.deviceRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[sh.devIcon, { backgroundColor: accent + "20" }]}>
                    <Ionicons name={d.icon as any} size={20} color={accent} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[sh.devName, { color: colors.text }]}>{d.label}</Text>
                    <Text style={[sh.devSub, { color: colors.textMuted }]}>{d.ip}  ·  {d.latencyMs} ms</Text>
                    <Text style={{ fontSize: 10, color: "#34C759" }}>HTTP {d.status} · Responding</Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => { await Clipboard.setStringAsync(d.ip); toast("IP copied"); }}
                    style={[sh.smallBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  >
                    <Text style={[sh.smallBtnTxt, { color: colors.textSecondary }]}>Copy IP</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {!scanning && lanDevices.length === 0 && (
            <View style={[sh.tip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={[sh.tipTxt, { color: colors.textMuted }]}>
                The scanner probes common local IPs (x.x.x.1–10, .100, .150, .200, .254) for HTTP services.
                It finds routers, NAS drives, smart TVs, and printers. Devices without HTTP won't appear.
              </Text>
            </View>
          )}
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function GridRow({
  label, value, valueColor, colors, copyable,
}: { label: string; value: string; valueColor?: string; colors: any; copyable?: boolean }) {
  return (
    <>
      <TouchableOpacity
        style={sh.gridRow}
        onPress={copyable ? async () => { await Clipboard.setStringAsync(value); toast(label + " copied"); } : undefined}
        disabled={!copyable}
        activeOpacity={copyable ? 0.65 : 1}
      >
        <Text style={[sh.gridLabel, { color: colors.textMuted }]}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}>
          <Text style={[sh.gridValue, { color: valueColor ?? colors.text }]} numberOfLines={1}>{value}</Text>
          {copyable && <Ionicons name="copy-outline" size={11} color={colors.textMuted} />}
        </View>
      </TouchableOpacity>
      <View style={[sh.divider, { backgroundColor: colors.border }]} />
    </>
  );
}

// ─── TAB: App Shortcuts ───────────────────────────────────────────────────────

const SHORTCUTS = [
  { id: "home",     label: "AfuChat Home",   sub: "Main feed",               icon: "home",            color: "#007AFF", link: "afuchat://" },
  { id: "ai",       label: "AfuAI",          sub: "AI assistant",            icon: "sparkles",        color: "#00BCD4", link: "afuchat://ai" },
  { id: "chat",     label: "New Message",    sub: "Start a conversation",    icon: "chatbubble",      color: "#34C759", link: "afuchat://chats" },
  { id: "wallet",   label: "AfuPay",         sub: "Wallet & payments",       icon: "wallet",          color: "#5856D6", link: "afuchat://wallet" },
  { id: "discover", label: "Discover",       sub: "Find people nearby",      icon: "compass",         color: "#BF5AF2", link: "afuchat://discover" },
  { id: "profile",  label: "My Profile",     sub: "View & edit profile",     icon: "person",          color: "#FF2D55", link: "afuchat://me" },
  { id: "music",    label: "AfuMusic",       sub: "Play local music",        icon: "musical-notes",   color: "#5856D6", link: "afuchat://music" },
  { id: "camera",   label: "Camera / Story", sub: "Take photo or video",     icon: "camera",          color: "#FF9500", link: "afuchat://stories" },
  { id: "qr",       label: "QR Scanner",     sub: "Scan any QR code",        icon: "qr-code",         color: "#1C1C1E", link: "afuchat://qr-scanner" },
  { id: "nearby",   label: "Nearby Devices", sub: "Bluetooth & Wi-Fi hub",   icon: "radio",           color: "#007AFF", link: "afuchat://nearby" },
];

function ShortcutsTab() {
  const { colors, accent } = useTheme();

  async function copyLink(link: string, label: string) {
    await Clipboard.setStringAsync(link);
    toast(`"${label}" link copied`);
  }

  async function shareLink(link: string, label: string) {
    try {
      await Share.share({
        message: `Open ${label} in AfuChat: ${link}`,
        title: `AfuChat — ${label}`,
      });
    } catch {}
  }

  async function openInBrowser(link: string) {
    try {
      const { Linking } = await import("react-native");
      // Convert afuchat:// deep link to a web URL for browser "Add to Home Screen"
      const web = link.replace("afuchat://", "https://afuchat.com/");
      await Linking.openURL(web);
    } catch { toast("Could not open browser"); }
  }

  return (
    <ScrollView style={sh.scroll} contentContainerStyle={sh.content} showsVerticalScrollIndicator={false}>

      {/* Info header */}
      <View style={[sh.card, { borderColor: accent + "40", backgroundColor: accent + "10" }]}>
        <View style={[sh.iconWrap, { backgroundColor: accent + "25" }]}>
          <Ionicons name="apps" size={24} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[sh.cardTitle, { color: colors.text }]}>App Shortcuts</Text>
          <Text style={[sh.cardSub, { color: colors.textMuted }]}>
            Copy deep links or share them to add AfuChat screens to your home screen.
          </Text>
        </View>
      </View>

      {/* How-to guide */}
      <View style={[sh.tip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <Ionicons name="bulb-outline" size={16} color={accent} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.text, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>How to add a shortcut</Text>
          <Text style={[sh.tipTxt, { color: colors.textMuted }]}>
            1. Tap <Text style={{ fontFamily: "Inter_600SemiBold" }}>Share</Text> on any shortcut below.{"\n"}
            2. Choose <Text style={{ fontFamily: "Inter_600SemiBold" }}>Open in Chrome</Text>.{"\n"}
            3. Tap Chrome menu (⋮) → <Text style={{ fontFamily: "Inter_600SemiBold" }}>Add to Home screen</Text>.{"\n\n"}
            Or long-press the AfuChat icon → choose a quick action from the popup.
          </Text>
        </View>
      </View>

      <SectionHeader label={`SHORTCUTS (${SHORTCUTS.length})`} colors={colors} />

      <View style={{ gap: 8 }}>
        {SHORTCUTS.map((s) => (
          <View key={s.id} style={[sh.deviceRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[sh.devIcon, { backgroundColor: s.color + "22" }]}>
              <Ionicons name={s.icon as any} size={20} color={s.color} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[sh.devName, { color: colors.text }]}>{s.label}</Text>
              <Text style={[sh.devSub, { color: colors.textMuted }]}>{s.sub}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: "Inter_400Regular" }}>{s.link}</Text>
            </View>
            <View style={{ gap: 6 }}>
              <TouchableOpacity
                onPress={() => shareLink(s.link, s.label)}
                style={[sh.smallBtn, { backgroundColor: s.color + "15", borderColor: s.color + "50" }]}
              >
                <Ionicons name="share-outline" size={12} color={s.color} />
                <Text style={[sh.smallBtnTxt, { color: s.color }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => copyLink(s.link, s.label)}
                style={[sh.smallBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              >
                <Ionicons name="copy-outline" size={12} color={colors.textSecondary} />
                <Text style={[sh.smallBtnTxt, { color: colors.textSecondary }]}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Install note */}
      <View style={[sh.tip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text style={[sh.tipTxt, { color: colors.textMuted }]}>
          Deep links (afuchat://) open directly in the AfuChat app. To install/uninstall shortcuts,
          long-press any shortcut on your home screen and tap <Text style={{ fontFamily: "Inter_600SemiBold" }}>Remove</Text>.
          AfuChat has <Text style={{ fontFamily: "Inter_600SemiBold" }}>INSTALL_SHORTCUT</Text> and{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>UNINSTALL_SHORTCUT</Text> permissions enabled.
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ label, colors }: { label: string; colors: any }) {
  return <Text style={[sh.sectionLabel, { color: colors.textMuted }]}>{label}</Text>;
}

function PlaceholderCard({ icon, title, desc, accent, colors }: {
  icon: string; title: string; desc: string; accent: string; colors: any;
}) {
  return (
    <View style={{ flex: 1, padding: 32, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: colors.background }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: accent + "20", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as any} size={34} color={accent} />
      </View>
      <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>{title}</Text>
      <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 20 }}>{desc}</Text>
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

type Tab = "bluetooth" | "wifi" | "shortcuts";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "bluetooth", label: "Bluetooth",  icon: "bluetooth" },
  { id: "wifi",      label: "Wi-Fi",      icon: "wifi" },
  { id: "shortcuts", label: "Shortcuts",  icon: "apps" },
];

export default function AfuNearbyApp() {
  const { colors, accent } = useTheme();
  const [tab, setTab] = useState<Tab>("bluetooth");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tab bar */}
      <View style={[sh.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)}
              style={[sh.tab, active && { borderBottomColor: accent }]}>
              <Ionicons name={t.icon as any} size={17} color={active ? accent : colors.textMuted} />
              <Text style={[sh.tabTxt, { color: active ? accent : colors.textMuted }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === "bluetooth"  && <BluetoothTab />}
      {tab === "wifi"       && <WifiTab />}
      {tab === "shortcuts"  && <ShortcutsTab />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sh = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  tabBar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 11, borderBottomWidth: 2.5, borderBottomColor: "transparent" },
  tabTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  iconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  actionPillText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  warnRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: 12, borderWidth: 1 },
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  scanBtnTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  deviceRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  devIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  devName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  devSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  connPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  smallBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  smallBtnTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyBox: { alignItems: "center", justifyContent: "center", padding: 32, borderRadius: 16, gap: 10 },
  emptyTxt: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  grid: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  gridRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  gridLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  gridValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right", flexShrink: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  tip: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  tipTxt: { fontSize: 12, lineHeight: 18, flex: 1 },
});
