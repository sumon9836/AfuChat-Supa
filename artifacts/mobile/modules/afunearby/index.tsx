/**
 * AfuNearby — Bluetooth BLE scanner, Wi-Fi network info, and App Shortcuts hub.
 *
 * Bluetooth: react-native-ble-plx (lazy-loaded; falls back gracefully in Expo Go).
 * Wi-Fi:     expo-network + expo-intent-launcher for system settings.
 * Shortcuts: Android ShortcutManager via Linking + Clipboard.
 *
 * All three tabs are native-only (nativeOnly: true in registry).
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
  Clipboard,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "@/components/ui/SafeGradient";
import * as Network from "expo-network";

// ─── BLE lazy loader ─────────────────────────────────────────────────────────
// react-native-ble-plx requires a custom native build.
// In Expo Go the native module is absent; we guard with NativeModules check.

let BleManager: any = null;
let BleState: any = { Unknown: "Unknown", PoweredOff: "PoweredOff", PoweredOn: "PoweredOn", Unauthorized: "Unauthorized", Unsupported: "Unsupported" };
let bleManagerInstance: any = null;
let bleAvailable = false;

if (Platform.OS !== "web") {
  try {
    const bleModule = require("react-native-ble-plx");
    BleManager = bleModule.BleManager;
    BleState = bleModule.State ?? BleState;
    bleAvailable = true;
  } catch {
    bleAvailable = false;
  }
}

function getBleMgr(): any {
  if (!bleAvailable || !BleManager) return null;
  if (!bleManagerInstance) {
    try {
      bleManagerInstance = new BleManager();
    } catch {
      bleAvailable = false;
      return null;
    }
  }
  return bleManagerInstance;
}

// ─── Intent launcher (lazy) ──────────────────────────────────────────────────
let IntentLauncher: any = null;
try {
  IntentLauncher = require("expo-intent-launcher");
} catch {}

async function openWifiSettings() {
  try {
    if (Platform.OS === "android" && IntentLauncher) {
      await IntentLauncher.startActivityAsync("android.settings.WIFI_SETTINGS");
    } else if (Platform.OS === "ios") {
      await Linking.openURL("App-Prefs:WIFI");
    }
  } catch {
    try { await Linking.openSettings(); } catch {}
  }
}

async function openBluetoothSettings() {
  try {
    if (Platform.OS === "android" && IntentLauncher) {
      await IntentLauncher.startActivityAsync("android.settings.BLUETOOTH_SETTINGS");
    } else if (Platform.OS === "ios") {
      await Linking.openURL("App-Prefs:Bluetooth");
    }
  } catch {
    try { await Linking.openSettings(); } catch {}
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type BleDevice = {
  id: string;
  name: string | null;
  rssi: number | null;
  serviceUUIDs: string[] | null;
  isConnectable: boolean | null;
  connectedAt?: number;
};

type Tab = "bluetooth" | "wifi" | "shortcuts";

// ─── RSSI helpers ─────────────────────────────────────────────────────────────

function rssiToLevel(rssi: number | null): 0 | 1 | 2 | 3 | 4 {
  if (rssi === null) return 0;
  if (rssi >= -50) return 4;
  if (rssi >= -65) return 3;
  if (rssi >= -75) return 2;
  if (rssi >= -85) return 1;
  return 0;
}

function rssiLabel(rssi: number | null): string {
  if (rssi === null) return "Unknown";
  if (rssi >= -50) return "Excellent";
  if (rssi >= -65) return "Good";
  if (rssi >= -75) return "Fair";
  if (rssi >= -85) return "Weak";
  return "Poor";
}

function SignalBars({ rssi, color }: { rssi: number | null; color: string }) {
  const level = rssiToLevel(rssi);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 16 }}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={{
            width: 4,
            height: bar * 4,
            borderRadius: 1,
            backgroundColor: bar <= level ? color : color + "33",
          }}
        />
      ))}
    </View>
  );
}

// ─── Bluetooth Tab ────────────────────────────────────────────────────────────

function BluetoothTab() {
  const { colors, accent } = useTheme();
  const [bleState, setBleState] = useState<string>("Unknown");
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Map<string, BleDevice>>(new Map());
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateSubscription = useRef<any>(null);

  const mgr = getBleMgr();

  useEffect(() => {
    if (!mgr) return;
    stateSubscription.current = mgr.onStateChange((state: string) => {
      setBleState(state);
    }, true);
    return () => {
      stateSubscription.current?.remove();
      stopScan();
    };
  }, []);

  function stopScan() {
    if (scanTimer.current) { clearTimeout(scanTimer.current); scanTimer.current = null; }
    try { mgr?.stopDeviceScan(); } catch {}
    setScanning(false);
  }

  async function requestPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    try {
      const { PermissionsAndroid } = require("react-native");
      const perms: string[] = [];
      if (Platform.Version >= 31) {
        perms.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );
      } else {
        perms.push(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
      }
      const results = await PermissionsAndroid.requestMultiple(perms);
      return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
    } catch {
      return false;
    }
  }

  async function startScan() {
    if (!mgr || bleState !== BleState.PoweredOn) return;
    const granted = await requestPermissions();
    if (!granted) { setPermDenied(true); return; }
    setPermDenied(false);
    setDevices(new Map());
    setScanning(true);
    Vibration.vibrate(10);

    try {
      mgr.startDeviceScan(null, { allowDuplicates: false }, (err: any, device: any) => {
        if (err) {
          console.warn("[AfuNearby] scan error:", err.message);
          stopScan();
          return;
        }
        if (!device) return;
        setDevices((prev) => {
          const next = new Map(prev);
          next.set(device.id, {
            id: device.id,
            name: device.name || device.localName || null,
            rssi: device.rssi,
            serviceUUIDs: device.serviceUUIDs ?? null,
            isConnectable: device.isConnectable ?? null,
          });
          return next;
        });
      });
    } catch (e: any) {
      console.warn("[AfuNearby] startDeviceScan error:", e?.message);
      stopScan();
      return;
    }

    // Auto-stop after 15 s
    scanTimer.current = setTimeout(stopScan, 15000);
  }

  async function connectDevice(device: BleDevice) {
    if (!mgr || connecting) return;
    setConnecting(device.id);
    try {
      await mgr.connectToDevice(device.id, { autoConnect: false, requestMTU: 512 });
      await mgr.discoverAllServicesAndCharacteristicsForDevice(device.id);
      setConnected((prev) => new Set(prev).add(device.id));
      setDevices((prev) => {
        const next = new Map(prev);
        const d = next.get(device.id);
        if (d) next.set(device.id, { ...d, connectedAt: Date.now() });
        return next;
      });
      Vibration.vibrate([0, 30, 20, 30]);
      toast("Connected to " + (device.name ?? "device"));
    } catch (e: any) {
      toast("Connection failed: " + (e?.message ?? "unknown error"));
    } finally {
      setConnecting(null);
    }
  }

  async function disconnectDevice(deviceId: string) {
    try {
      await mgr?.cancelDeviceConnection(deviceId);
      setConnected((prev) => { const s = new Set(prev); s.delete(deviceId); return s; });
      toast("Disconnected");
    } catch {}
  }

  const deviceList = useMemo(() => {
    return [...devices.values()].sort((a, b) => {
      const aConn = connected.has(a.id) ? 1 : 0;
      const bConn = connected.has(b.id) ? 1 : 0;
      if (aConn !== bConn) return bConn - aConn;
      return (b.rssi ?? -999) - (a.rssi ?? -999);
    });
  }, [devices, connected]);

  if (!bleAvailable) {
    return (
      <UnavailableScreen
        icon="bluetooth"
        title="Bluetooth Not Available"
        desc="Bluetooth scanning requires the AfuChat APK build. Expo Go does not support native Bluetooth."
        accent={accent}
        colors={colors}
      />
    );
  }

  const btOff = bleState === BleState.PoweredOff || bleState === BleState.Unknown;
  const btUnauth = bleState === BleState.Unauthorized || bleState === BleState.Unsupported;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      {/* State card */}
      <LinearGradient
        colors={bleState === BleState.PoweredOn ? [accent + "22", accent + "11"] : ["#FF3B3022", "#FF3B3011"]}
        style={[bStyles.stateCard, { borderColor: bleState === BleState.PoweredOn ? accent + "44" : "#FF3B3044" }]}
      >
        <Ionicons
          name="bluetooth"
          size={28}
          color={bleState === BleState.PoweredOn ? accent : "#FF3B30"}
        />
        <View style={{ flex: 1 }}>
          <Text style={[bStyles.stateTitle, { color: colors.text }]}>
            {bleState === BleState.PoweredOn ? "Bluetooth Active" :
             bleState === BleState.PoweredOff ? "Bluetooth Off" :
             bleState === BleState.Unauthorized ? "Permission Denied" :
             bleState === BleState.Unsupported ? "Not Supported" : "Checking…"}
          </Text>
          <Text style={[bStyles.stateSub, { color: colors.textMuted }]}>
            {bleState === BleState.PoweredOn
              ? `${devices.size} device${devices.size !== 1 ? "s" : ""} found`
              : bleState === BleState.PoweredOff
              ? "Enable Bluetooth to scan for nearby devices"
              : bleState === BleState.Unauthorized
              ? "Grant Bluetooth permission in Settings"
              : "Bluetooth Low Energy is not available on this device"}
          </Text>
        </View>
        {(btOff || btUnauth) && (
          <TouchableOpacity onPress={openBluetoothSettings} style={[bStyles.settingsBtn, { backgroundColor: accent }]}>
            <Text style={bStyles.settingsBtnText}>Settings</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Permission denied banner */}
      {permDenied && (
        <View style={[bStyles.warnBanner, { backgroundColor: "#FF9500" + "22", borderColor: "#FF950044" }]}>
          <Ionicons name="warning" size={16} color="#FF9500" />
          <Text style={{ color: "#FF9500", flex: 1, fontSize: 13 }}>
            Bluetooth permission denied. Tap Settings → Permissions → Bluetooth.
          </Text>
          <TouchableOpacity onPress={openBluetoothSettings}>
            <Text style={{ color: "#FF9500", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Fix</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scan button */}
      <TouchableOpacity
        onPress={scanning ? stopScan : startScan}
        disabled={btOff || btUnauth}
        style={[bStyles.scanBtn, {
          backgroundColor: scanning ? "#FF3B3020" : accent + "20",
          borderColor: scanning ? "#FF3B3060" : accent + "60",
          opacity: (btOff || btUnauth) ? 0.4 : 1,
        }]}
      >
        <ScanningDot active={scanning} color={scanning ? "#FF3B30" : accent} />
        <Text style={[bStyles.scanBtnText, { color: scanning ? "#FF3B30" : accent }]}>
          {scanning ? "Scanning… (tap to stop)" : "Scan for Nearby Devices"}
        </Text>
      </TouchableOpacity>

      {/* Device list */}
      {deviceList.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={[bStyles.sectionLabel, { color: colors.textMuted }]}>
            DISCOVERED DEVICES ({deviceList.length})
          </Text>
          {deviceList.map((d) => {
            const isConn = connected.has(d.id);
            const isConnecting = connecting === d.id;
            return (
              <View
                key={d.id}
                style={[bStyles.deviceCard, {
                  backgroundColor: isConn ? accent + "12" : colors.surface,
                  borderColor: isConn ? accent + "44" : colors.border,
                }]}
              >
                <View style={[bStyles.deviceIcon, { backgroundColor: isConn ? accent + "22" : colors.backgroundSecondary }]}>
                  <Ionicons
                    name={isConn ? "bluetooth" : "radio-outline"}
                    size={20}
                    color={isConn ? accent : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[bStyles.deviceName, { color: colors.text }]} numberOfLines={1}>
                    {d.name ?? "Unknown Device"}
                  </Text>
                  <Text style={[bStyles.deviceAddr, { color: colors.textMuted }]} numberOfLines={1}>
                    {d.id}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <SignalBars rssi={d.rssi} color={isConn ? accent : colors.textSecondary} />
                    <Text style={[bStyles.deviceRssi, { color: colors.textMuted }]}>
                      {d.rssi !== null ? `${d.rssi} dBm · ` : ""}{rssiLabel(d.rssi)}
                    </Text>
                  </View>
                  {d.serviceUUIDs && d.serviceUUIDs.length > 0 && (
                    <Text style={[bStyles.serviceUUIDs, { color: colors.textMuted }]} numberOfLines={1}>
                      Services: {d.serviceUUIDs.slice(0, 3).map(u => u.slice(0, 8)).join(", ")}
                      {d.serviceUUIDs.length > 3 ? ` +${d.serviceUUIDs.length - 3}` : ""}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => isConn ? disconnectDevice(d.id) : connectDevice(d)}
                  disabled={isConnecting}
                  style={[bStyles.connectBtn, {
                    backgroundColor: isConn ? "#FF3B3020" : accent + "20",
                    borderColor: isConn ? "#FF3B3060" : accent + "50",
                  }]}
                >
                  <Text style={[bStyles.connectBtnText, { color: isConn ? "#FF3B30" : accent }]}>
                    {isConnecting ? "…" : isConn ? "Disconnect" : "Connect"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {!scanning && deviceList.length === 0 && bleState === BleState.PoweredOn && (
        <View style={[bStyles.emptyBox, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="radio-outline" size={36} color={colors.textMuted} />
          <Text style={[bStyles.emptyText, { color: colors.textMuted }]}>
            No devices found. Tap "Scan" to search for nearby Bluetooth devices.
          </Text>
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// Animated scanning dot
function ScanningDot({ active, color }: { active: boolean; color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      anim.setValue(1);
    }
  }, [active]);
  return (
    <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: anim }} />
  );
}

// ─── Wi-Fi Tab ────────────────────────────────────────────────────────────────

type NetworkInfo = {
  type: string;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  ip: string;
};

function WifiTab() {
  const { colors, accent } = useTheme();
  const [netInfo, setNetInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNetInfo = useCallback(async () => {
    try {
      const [state, ip] = await Promise.all([
        Network.getNetworkStateAsync(),
        Network.getIpAddressAsync().catch(() => ""),
      ]);
      setNetInfo({
        type: state.type ?? "UNKNOWN",
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        ip: ip ?? "",
      });
    } catch {
      setNetInfo(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNetInfo(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchNetInfo(); }, [fetchNetInfo]);

  const isWifi = netInfo?.type === "WIFI" || netInfo?.type === Network.NetworkStateType?.WIFI;
  const subnet = useMemo(() => {
    if (!netInfo?.ip) return "";
    const parts = netInfo.ip.split(".");
    if (parts.length === 4) return parts.slice(0, 3).join(".") + ".0/24";
    return "";
  }, [netInfo?.ip]);

  const gateway = useMemo(() => {
    if (!netInfo?.ip) return "";
    const parts = netInfo.ip.split(".");
    if (parts.length === 4) return parts.slice(0, 3).join(".") + ".1";
    return "";
  }, [netInfo?.ip]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
    >
      {/* Network status card */}
      <LinearGradient
        colors={isWifi ? [accent + "22", accent + "11"] : ["#FF9500" + "22", "#FF9500" + "11"]}
        style={[bStyles.stateCard, { borderColor: isWifi ? accent + "44" : "#FF950044" }]}
      >
        <Ionicons name={isWifi ? "wifi" : "cellular"} size={28} color={isWifi ? accent : "#FF9500"} />
        <View style={{ flex: 1 }}>
          <Text style={[bStyles.stateTitle, { color: colors.text }]}>
            {loading ? "Detecting network…" :
              netInfo?.isConnected ? isWifi ? "Connected via Wi-Fi" : `Connected via ${netInfo?.type}` :
              "No Connection"}
          </Text>
          <Text style={[bStyles.stateSub, { color: colors.textMuted }]}>
            {netInfo?.isInternetReachable ? "Internet reachable" : netInfo?.isConnected ? "Local network only" : "Offline"}
          </Text>
        </View>
        <TouchableOpacity onPress={openWifiSettings} style={[bStyles.settingsBtn, { backgroundColor: accent }]}>
          <Text style={bStyles.settingsBtnText}>Settings</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Network info grid */}
      {netInfo && (
        <View style={[wStyles.infoGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <InfoRow label="IP Address" value={netInfo.ip || "—"} colors={colors} copyable />
          <View style={[wStyles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Network Type" value={netInfo.type} colors={colors} />
          <View style={[wStyles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Subnet" value={subnet || "—"} colors={colors} copyable />
          <View style={[wStyles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Gateway (est.)" value={gateway || "—"} colors={colors} copyable />
          <View style={[wStyles.divider, { backgroundColor: colors.border }]} />
          <InfoRow
            label="Internet"
            value={netInfo.isInternetReachable === null ? "Checking…" : netInfo.isInternetReachable ? "Reachable" : "Unreachable"}
            valueColor={netInfo.isInternetReachable ? "#34C759" : netInfo.isInternetReachable === null ? colors.textMuted : "#FF3B30"}
            colors={colors}
          />
        </View>
      )}

      {/* Actions */}
      <View style={{ gap: 10 }}>
        <Text style={[bStyles.sectionLabel, { color: colors.textMuted }]}>QUICK ACTIONS</Text>
        <ActionCard
          icon="wifi"
          title="Wi-Fi Networks"
          desc="Browse and connect to available Wi-Fi networks"
          color="#007AFF"
          colors={colors}
          onPress={openWifiSettings}
        />
        <ActionCard
          icon="settings-outline"
          title="Network Settings"
          desc="Manage VPN, hotspot, and advanced network options"
          color={accent}
          colors={colors}
          onPress={async () => {
            try {
              if (Platform.OS === "android" && IntentLauncher) {
                await IntentLauncher.startActivityAsync("android.settings.WIRELESS_SETTINGS");
              } else {
                await Linking.openSettings();
              }
            } catch {}
          }}
        />
        <ActionCard
          icon="copy-outline"
          title="Copy IP Address"
          desc={netInfo?.ip ? `Your IP: ${netInfo.ip}` : "No IP detected"}
          color="#34C759"
          colors={colors}
          onPress={() => {
            if (netInfo?.ip) {
              Clipboard.setString(netInfo.ip);
              toast("IP address copied");
            }
          }}
        />
      </View>

      {/* Wi-Fi tips */}
      <View style={[wStyles.tipBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <Text style={[wStyles.tipText, { color: colors.textMuted }]}>
          {isWifi
            ? "You're on Wi-Fi. Nearby device discovery uses mDNS/Bonjour — supported devices (printers, smart TVs, Chromecasts) will appear in your local network apps."
            : "Connect to a Wi-Fi network to discover and interact with nearby devices on the same network."}
        </Text>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
  colors,
  copyable,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: any;
  copyable?: boolean;
}) {
  return (
    <TouchableOpacity
      style={wStyles.infoRow}
      onPress={copyable ? () => { Clipboard.setString(value); toast(label + " copied"); } : undefined}
      disabled={!copyable}
      activeOpacity={copyable ? 0.7 : 1}
    >
      <Text style={[wStyles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={[wStyles.infoValue, { color: valueColor ?? colors.text }]} numberOfLines={1}>
          {value}
        </Text>
        {copyable && <Ionicons name="copy-outline" size={12} color={colors.textMuted} />}
      </View>
    </TouchableOpacity>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  color,
  colors,
  onPress,
}: {
  icon: string;
  title: string;
  desc: string;
  color: string;
  colors: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[wStyles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.75}
    >
      <View style={[wStyles.actionIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[wStyles.actionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[wStyles.actionDesc, { color: colors.textMuted }]} numberOfLines={2}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Shortcuts Tab ────────────────────────────────────────────────────────────

type ShortcutDef = {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
};

const APP_SHORTCUTS: ShortcutDef[] = [
  { id: "home",     label: "AfuChat Home",    subtitle: "Open AfuChat feed",          icon: "home",           color: "#007AFF", route: "afuchat://" },
  { id: "ai",       label: "AfuAI",           subtitle: "Jump to your AI assistant",  icon: "sparkles",       color: "#00BCD4", route: "afuchat://ai" },
  { id: "chat",     label: "New Chat",        subtitle: "Start a new conversation",   icon: "chatbubble",     color: "#34C759", route: "afuchat://chats" },
  { id: "camera",   label: "Camera",          subtitle: "Take a photo or video",      icon: "camera",         color: "#FF9500", route: "afuchat://camera" },
  { id: "wallet",   label: "AfuPay",          subtitle: "Open your wallet",           icon: "wallet",         color: "#5856D6", route: "afuchat://wallet" },
  { id: "profile",  label: "My Profile",      subtitle: "View your profile",          icon: "person",         color: "#FF2D55", route: "afuchat://me" },
  { id: "discover", label: "Discover",        subtitle: "Explore people near you",    icon: "compass",        color: "#BF5AF2", route: "afuchat://discover" },
  { id: "music",    label: "AfuMusic",        subtitle: "Play your music library",    icon: "musical-notes",  color: "#5856D6", route: "afuchat://music" },
];

function ShortcutsTab() {
  const { colors, accent } = useTheme();
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  async function pinShortcut(s: ShortcutDef) {
    if (Platform.OS !== "android") {
      toast("Home screen shortcuts are supported on Android.");
      return;
    }
    try {
      if (IntentLauncher) {
        await IntentLauncher.startActivityAsync(
          "android.intent.action.CREATE_SHORTCUT",
          {
            data: s.route,
            extra: {
              "android.intent.extra.shortcut.NAME": s.label,
            },
          }
        );
      }
      setPinned((prev) => new Set(prev).add(s.id));
      toast(`"${s.label}" shortcut added to home screen`);
    } catch {
      toast("Open AfuChat, long-press the app icon → Shortcuts to add.");
    }
  }

  function copyDeepLink(s: ShortcutDef) {
    Clipboard.setString(s.route);
    toast("Deep link copied: " + s.route);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Info banner */}
      <LinearGradient
        colors={[accent + "22", accent + "11"]}
        style={[bStyles.stateCard, { borderColor: accent + "44" }]}
      >
        <Ionicons name="add-circle" size={28} color={accent} />
        <View style={{ flex: 1 }}>
          <Text style={[bStyles.stateTitle, { color: colors.text }]}>App Shortcuts</Text>
          <Text style={[bStyles.stateSub, { color: colors.textMuted }]}>
            Pin frequently used AfuChat features directly to your home screen.
          </Text>
        </View>
      </LinearGradient>

      {/* Android tip */}
      {Platform.OS === "android" && (
        <View style={[wStyles.tipBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.textMuted} />
          <Text style={[wStyles.tipText, { color: colors.textMuted }]}>
            Long-press the AfuChat icon on your home screen to see quick shortcuts, or tap "Pin" below to add a shortcut directly.
          </Text>
        </View>
      )}

      <Text style={[bStyles.sectionLabel, { color: colors.textMuted }]}>AVAILABLE SHORTCUTS</Text>

      <View style={{ gap: 8 }}>
        {APP_SHORTCUTS.map((s) => {
          const isPinned = pinned.has(s.id);
          return (
            <View
              key={s.id}
              style={[bStyles.deviceCard, {
                backgroundColor: isPinned ? s.color + "10" : colors.surface,
                borderColor: isPinned ? s.color + "44" : colors.border,
              }]}
            >
              <View style={[bStyles.deviceIcon, { backgroundColor: s.color + "20" }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[bStyles.deviceName, { color: colors.text }]}>{s.label}</Text>
                <Text style={[bStyles.deviceAddr, { color: colors.textMuted }]}>{s.subtitle}</Text>
                <Text style={[bStyles.serviceUUIDs, { color: colors.textMuted }]}>{s.route}</Text>
              </View>
              <View style={{ gap: 6 }}>
                <TouchableOpacity
                  onPress={() => pinShortcut(s)}
                  style={[bStyles.connectBtn, {
                    backgroundColor: isPinned ? s.color + "20" : s.color + "20",
                    borderColor: isPinned ? s.color + "60" : s.color + "50",
                  }]}
                >
                  <Text style={[bStyles.connectBtnText, { color: s.color }]}>
                    {isPinned ? "Pinned ✓" : "Pin"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => copyDeepLink(s)}
                  style={[bStyles.connectBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                >
                  <Text style={[bStyles.connectBtnText, { color: colors.textSecondary }]}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Install/uninstall note */}
      <View style={[wStyles.tipBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <Text style={[wStyles.tipText, { color: colors.textMuted }]}>
          Shortcuts use AfuChat deep links (afuchat://). Your launcher must support pinned shortcuts (Android 8.0+). To remove a shortcut, long-press it on your home screen.
        </Text>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function UnavailableScreen({
  icon,
  title,
  desc,
  accent,
  colors,
}: {
  icon: string;
  title: string;
  desc: string;
  accent: string;
  colors: any;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14, backgroundColor: colors.background }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: accent + "20", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as any} size={32} color={accent} />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>{title}</Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 20 }}>{desc}</Text>
    </View>
  );
}

function toast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
}

// ─── Main AfuNearby screen ────────────────────────────────────────────────────

export default function AfuNearbyApp() {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("bluetooth");

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "bluetooth", label: "Bluetooth", icon: "bluetooth" },
    { id: "wifi",      label: "Wi-Fi",     icon: "wifi" },
    { id: "shortcuts", label: "Shortcuts", icon: "apps" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tab bar */}
      <View style={[sStyles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setActiveTab(t.id)}
              style={[sStyles.tab, active && { borderBottomColor: accent }]}
            >
              <Ionicons name={t.icon as any} size={18} color={active ? accent : colors.textMuted} />
              <Text style={[sStyles.tabLabel, { color: active ? accent : colors.textMuted }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === "bluetooth" && <BluetoothTab />}
      {activeTab === "wifi" && <WifiTab />}
      {activeTab === "shortcuts" && <ShortcutsTab />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const bStyles = StyleSheet.create({
  stateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  stateTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  stateSub: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  settingsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settingsBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  scanBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deviceAddr: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deviceRssi: { fontSize: 11, fontFamily: "Inter_400Regular" },
  serviceUUIDs: { fontSize: 10, fontFamily: "Inter_400Regular" },
  connectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  connectBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 16,
    gap: 12,
  },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});

const wStyles = StyleSheet.create({
  infoGrid: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tipBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  tipText: { fontSize: 12, lineHeight: 18, flex: 1 },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
});

const sStyles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
