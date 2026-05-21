import "react-native-gesture-handler";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Text, TextInput } from "react-native";
import { Slot, router, usePathname } from "expo-router";
import * as Font from "expo-font";
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  MessageCircle, Compass, Search, Bot, Wallet, Grid3X3,
  User, Settings, Edit3, Users, Bookmark, Star,
  LogOut, Copy, ExternalLink, MoreHorizontal, FileText, Film, Hash,
} from "lucide-react";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useTheme } from "@/hooks/useTheme";
import { AppAccentProvider } from "@/context/AppAccentContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AdvancedFeaturesProvider } from "@/context/AdvancedFeaturesContext";
import { ChatPreferencesProvider } from "@/context/ChatPreferencesContext";
import { DataModeProvider } from "@/context/DataModeContext";
import { TabSwipeProvider } from "@/context/TabSwipeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastContainer } from "@/components/ui/ToastContainer";
import AlertModal from "@/components/ui/AlertModal";
import { initConnectivityToasts } from "@/lib/toast";
import { supabase } from "@/lib/supabase";
import { getLocalConversations } from "@/lib/storage/localConversations";

// Disable font scaling globally on web too
(Text as any).defaultProps = { ...((Text as any).defaultProps ?? {}), allowFontScaling: false };
(TextInput as any).defaultProps = { ...((TextInput as any).defaultProps ?? {}), allowFontScaling: false };

/* ─────────────────────────────────────────────────────────────
   CSS — desktop shell styles
───────────────────────────────────────────────────────────── */
const DT_CSS = `
*,*::before,*::after{box-sizing:border-box}

.dt-shell{
  display:flex;height:100vh;overflow:hidden;
  font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
}

.dt-lt{
  --dt-bg:#F5F0E8;--dt-sb:#FFFFFF;--dt-bdr:#DDD7C9;
  --dt-txt:#1A1208;--dt-txt2:#5A5040;--dt-txt3:#8C7F6A;
  --dt-hover:rgba(0,0,0,0.046);--dt-active:rgba(0,188,212,0.10);
  --dt-inp:#EDE8DC;--dt-cl:#00BCD4;
}
.dt-dk{
  --dt-bg:#0F0F0F;--dt-sb:#1C1C1E;--dt-bdr:#2C2C2E;
  --dt-txt:#F1F1F1;--dt-txt2:#AAAAAA;--dt-txt3:#717171;
  --dt-hover:rgba(255,255,255,0.055);--dt-active:rgba(0,188,212,0.14);
  --dt-inp:#2C2C2E;--dt-cl:#00BCD4;
}

.dt-sidebar{
  width:248px;flex-shrink:0;
  display:flex;flex-direction:column;
  height:100vh;background:var(--dt-sb);
  border-right:1.5px solid var(--dt-bdr);
  overflow:hidden;
}

.dt-logo{
  display:flex;align-items:center;gap:9px;
  padding:0 14px 0 16px;height:56px;
  border-bottom:1.5px solid var(--dt-bdr);flex-shrink:0;
}
.dt-logo-img{
  width:28px;height:28px;border-radius:7px;
  object-fit:cover;flex-shrink:0;
}
.dt-logo-name{
  font-size:16px;font-weight:800;color:var(--dt-txt);
  letter-spacing:-.4px;flex:1;line-height:1;
}
.dt-logo-name em{color:var(--dt-cl);font-style:normal}

.dt-icon-btn{
  background:none;border:none;cursor:pointer;
  padding:6px;border-radius:7px;color:var(--dt-txt3);
  display:flex;align-items:center;justify-content:center;
  transition:background .13s,color .13s;flex-shrink:0;
}
.dt-icon-btn:hover{background:var(--dt-hover);color:var(--dt-txt)}

.dt-search{padding:10px 10px 4px;flex-shrink:0}
.dt-search-inner{position:relative;display:flex;align-items:center}
.dt-search-ico{
  position:absolute;left:9px;color:var(--dt-txt3);
  pointer-events:none;flex-shrink:0;
}
.dt-search-inp{
  width:100%;padding:7px 10px 7px 30px;border-radius:8px;
  border:1.5px solid var(--dt-bdr);background:var(--dt-inp);
  color:var(--dt-txt);font-size:13px;font-family:inherit;
  outline:none;cursor:pointer;transition:border-color .13s;
}
.dt-search-inp::placeholder{color:var(--dt-txt3)}
.dt-search-inp:hover,.dt-search-inp:focus{border-color:var(--dt-cl)}

.dt-nav{flex:1;overflow-y:auto;padding:4px 0 4px}
.dt-nav::-webkit-scrollbar{width:3px}
.dt-nav::-webkit-scrollbar-thumb{background:var(--dt-bdr);border-radius:2px}
.dt-nav-section{margin-bottom:2px}
.dt-nav-lbl{
  font-size:10px;font-weight:700;letter-spacing:.09em;
  text-transform:uppercase;color:var(--dt-txt3);
  padding:10px 18px 3px;display:block;
}
.dt-nav-item{
  display:flex;align-items:center;gap:11px;
  padding:8px 14px;border-radius:9px;margin:1px 8px;
  cursor:pointer;text-decoration:none;color:var(--dt-txt2);
  font-size:13.5px;font-weight:500;
  transition:background .12s,color .12s;
  user-select:none;
}
.dt-nav-item:hover{background:var(--dt-hover);color:var(--dt-txt)}
.dt-nav-item.act{
  background:var(--dt-active);color:var(--dt-cl);font-weight:700;
}
.dt-badge{
  margin-left:auto;background:var(--dt-cl);color:#000;
  font-size:9.5px;font-weight:800;min-width:17px;height:17px;
  border-radius:9px;display:flex;align-items:center;
  justify-content:center;padding:0 5px;line-height:1;
}

.dt-notif{
  display:flex;align-items:center;gap:11px;
  padding:8px 14px;margin:1px 8px;border-radius:9px;
  cursor:pointer;text-decoration:none;color:var(--dt-txt2);
  font-size:13.5px;font-weight:500;
  transition:background .12s,color .12s;
  user-select:none;
}
.dt-notif:hover{background:var(--dt-hover);color:var(--dt-txt)}

.dt-user{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;border-top:1.5px solid var(--dt-bdr);
  flex-shrink:0;cursor:pointer;transition:background .12s;
}
.dt-user:hover{background:var(--dt-hover)}
.dt-user-av{
  width:34px;height:34px;border-radius:50%;
  object-fit:cover;flex-shrink:0;
  border:2px solid var(--dt-bdr);
}
.dt-user-av-ph{
  width:34px;height:34px;border-radius:50%;
  background:var(--dt-cl);color:#000;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:800;flex-shrink:0;
}
.dt-user-info{flex:1;min-width:0}
.dt-user-name{
  font-size:13px;font-weight:600;color:var(--dt-txt);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.dt-user-handle{
  font-size:11px;color:var(--dt-txt3);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}

.dt-content{
  flex:1;display:flex;flex-direction:column;
  overflow:hidden;min-width:0;
  background:var(--dt-bg);
  height:100vh;
}
.dt-content > div{flex:1;min-height:0;display:flex;flex-direction:column}

.dt-loading{
  display:flex;flex:1;align-items:center;
  justify-content:center;background:var(--dt-bg);
}
.dt-spin{
  width:32px;height:32px;border-radius:50%;
  border:3px solid var(--dt-bdr);
  border-top-color:var(--dt-cl);
  animation:dt-rot .8s linear infinite;
}
@keyframes dt-rot{to{transform:rotate(360deg)}}

.dt-drop{
  position:fixed;z-index:9500;
  background:var(--dt-sb);border:1.5px solid var(--dt-bdr);
  border-radius:12px;padding:6px;min-width:204px;
  box-shadow:0 12px 36px rgba(0,0,0,0.16),0 3px 10px rgba(0,0,0,0.08);
}
.dt-dk .dt-drop{box-shadow:0 12px 40px rgba(0,0,0,0.60),0 4px 14px rgba(0,0,0,0.35)}
.dt-drop-item{
  display:flex;align-items:center;gap:10px;
  padding:8px 10px;border-radius:8px;cursor:pointer;
  font-size:13px;font-weight:500;color:var(--dt-txt2);
  transition:background .1s,color .1s;
  background:none;border:none;width:100%;text-align:left;
  font-family:inherit;line-height:1.3;text-decoration:none;
}
.dt-drop-item:hover{background:var(--dt-hover);color:var(--dt-txt)}
.dt-danger{color:#EF4444!important}
.dt-danger:hover{background:rgba(239,68,68,0.10)!important;color:#EF4444!important}
.dt-drop-lbl{
  display:flex;align-items:center;gap:10px;
  padding:5px 10px 6px;font-size:10.5px;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;color:var(--dt-txt3);
  cursor:default;user-select:none;
}
.dt-drop-hr{height:1px;background:var(--dt-bdr);margin:4px 2px;border:none}

@media(max-width:820px){.dt-sidebar{display:none}}

.dt-bnav{
  display:none;
  position:fixed;
  bottom:calc(14px + env(safe-area-inset-bottom,0px));
  left:50%;
  transform:translateX(-50%);
  width:max-content;
  max-width:calc(100vw - 24px);
  z-index:200;
  border-radius:999px;
  background:var(--dt-sb);
  border:1px solid var(--dt-bdr);
  backdrop-filter:blur(40px) saturate(2);
  -webkit-backdrop-filter:blur(40px) saturate(2);
}
.dt-dk .dt-bnav{box-shadow:0 12px 40px rgba(0,0,0,0.55),0 4px 14px rgba(0,0,0,0.30);}
.dt-lt .dt-bnav{box-shadow:0 8px 32px rgba(0,0,0,0.10),0 2px 8px rgba(0,0,0,0.06);}
@media(max-width:820px){.dt-bnav{display:flex}}
.dt-bnav-inner{display:flex;align-items:center;padding:6px 8px;gap:0;}
.dt-bnav-item{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;width:62px;padding:2px 0;
  text-decoration:none;color:rgba(110,108,118,1);
  font-size:10px;font-weight:700;letter-spacing:.08px;
  transition:color .16s;cursor:pointer;
  background:none;border:none;font-family:inherit;
  border-radius:32px;-webkit-tap-highlight-color:transparent;
  user-select:none;flex-shrink:0;
}
.dt-dk .dt-bnav-item{color:rgba(95,93,105,1)}
.dt-bnav-item:active{opacity:.68}
.dt-bnav-item.act{color:#00BCD4;font-weight:700}
.dt-bnav-icon{
  position:relative;width:54px;height:36px;border-radius:18px;
  display:flex;align-items:center;justify-content:center;
}
.dt-bnav-badge{
  position:absolute;top:-3px;right:-1px;
  background:#00BCD4;color:#000;
  font-size:9px;font-weight:800;min-width:16px;height:16px;
  border-radius:8px;display:flex;align-items:center;
  justify-content:center;padding:0 4px;line-height:1;
  pointer-events:none;
}
.dt-bnav-label{font-size:10.5px;font-weight:inherit;letter-spacing:.04px;line-height:1}
`;

/* ─────────────────────────────────────────────────────────────
   Navigation structure
───────────────────────────────────────────────────────────── */
const NAV = [
  {
    label: "Workspace",
    items: [
      { label: "Chats",       Icon: MessageCircle, route: "/(tabs)"           as const, matchPaths: ["/", "/(tabs)", "/index", "/chat"] },
      { label: "Discover",    Icon: Compass,       route: "/(tabs)/discover"  as const, matchPaths: ["/discover", "/(tabs)/discover"] },
      { label: "Search",      Icon: Search,        route: "/(tabs)/search"    as const, matchPaths: ["/search", "/(tabs)/search"] },
    ],
  },
  {
    label: "Features",
    items: [
      { label: "AfuAI",  Icon: Bot,      route: "/ai"          as const, matchPaths: ["/ai"] },
      { label: "Wallet", Icon: Wallet,   route: "/wallet"      as const, matchPaths: ["/wallet"] },
      { label: "Apps",   Icon: Grid3X3,  route: "/(tabs)/apps" as const, matchPaths: ["/apps", "/(tabs)/apps"] },
    ],
  },
  {
    label: "Social",
    items: [
      { label: "Communities", Icon: Users,    route: "/(tabs)/communities" as const, matchPaths: ["/communities", "/(tabs)/communities"] },
      { label: "Saved",       Icon: Bookmark, route: "/saved-posts"        as const, matchPaths: ["/saved-posts", "/saved"] },
    ],
  },
  {
    label: "You",
    items: [
      { label: "Profile",      Icon: User, route: "/(tabs)/me"  as const, matchPaths: ["/me", "/(tabs)/me"] },
      { label: "Achievements", Icon: Star, route: "/achievements" as const, matchPaths: ["/achievements"] },
    ],
  },
];

const BNAV = [
  { label: "Chats",    Icon: MessageCircle, route: "/(tabs)"          as const, matchPaths: ["/", "/(tabs)", "/index", "/chat"], useAfuSymbol: true },
  { label: "Discover", Icon: Compass,       route: "/(tabs)/discover" as const, matchPaths: ["/discover", "/(tabs)/discover"],   useAfuSymbol: false },
  { label: "Apps",     Icon: Grid3X3,       route: "/(tabs)/apps"     as const, matchPaths: ["/apps", "/(tabs)/apps"],            useAfuSymbol: false },
  { label: "Profile",  Icon: User,          route: "/(tabs)/me"       as const, matchPaths: ["/me", "/(tabs)/me"],                useAfuSymbol: false },
] as const;

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function isActiveRoute(pathname: string, matchPaths: string[]): boolean {
  return matchPaths.some((p) => {
    if (p === "/" || p === "/(tabs)" || p === "/index") {
      return (
        pathname === "/" ||
        pathname === "/(tabs)" ||
        pathname === "/(tabs)/index" ||
        pathname === "/index" ||
        pathname.startsWith("/chat/")
      );
    }
    return pathname === p || pathname.startsWith(p + "/");
  });
}

/** Routes that should show WITHOUT the desktop sidebar shell */
function isNoShell(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/index" ||
    pathname.startsWith("/(auth)") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/download") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/features") ||
    pathname.startsWith("/careers") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/landing") ||
    pathname === "/+not-found"
  );
}

/* ─────────────────────────────────────────────────────────────
   Root Web Layout — provides all contexts
───────────────────────────────────────────────────────────── */
export default function RootWebLayout() {
  const [, fontError] = Font.useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => { initConnectivityToasts(); }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AppAccentProvider>
            <DataModeProvider>
              <AuthProvider>
                <LanguageProvider>
                  <AdvancedFeaturesProvider>
                    <ChatPreferencesProvider>
                      <TabSwipeProvider>
                        <style dangerouslySetInnerHTML={{ __html: DT_CSS }} />
                        <DesktopShell />
                        <ToastContainer />
                        <AlertModal />
                      </TabSwipeProvider>
                    </ChatPreferencesProvider>
                  </AdvancedFeaturesProvider>
                </LanguageProvider>
              </AuthProvider>
            </DataModeProvider>
          </AppAccentProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

/* ─────────────────────────────────────────────────────────────
   Desktop Shell — reads auth context, renders sidebar or passthrough
───────────────────────────────────────────────────────────── */
function DesktopShell() {
  const { session, profile, loading, user } = useAuth();
  const { isDark } = useTheme();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  /* ── dropdown state ── */
  const composeRef = useRef<HTMLButtonElement | null>(null);
  const [composeDrop, setComposeDrop] = useState<{ top: number; left: number } | null>(null);
  const [userDrop, setUserDrop]       = useState<{ bottom: number; left: number } | null>(null);
  const [navCtx, setNavCtx]           = useState<{ x: number; y: number; route: string; label: string } | null>(null);

  const closeAll = useCallback(() => { setComposeDrop(null); setUserDrop(null); setNavCtx(null); }, []);

  useEffect(() => {
    if (!composeDrop && !userDrop && !navCtx) return;
    const onDown = (e: MouseEvent) => { if (!(e.target as Element)?.closest?.(".dt-drop")) closeAll(); };
    const onKey  = (e: KeyboardEvent) => { if (e.key === "Escape") closeAll(); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [composeDrop, userDrop, navCtx, closeAll]);

  /* ── unread count ── */
  const refreshUnread = useCallback(async () => {
    try {
      const convs = await getLocalConversations();
      setUnread(convs.reduce((s, c) => s + (c.unread_count ?? 0), 0));
    } catch (_) {}
  }, []);

  useEffect(() => { refreshUnread(); }, [refreshUnread]);

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("dt-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refreshUnread)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_receipts" }, refreshUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, refreshUnread]);

  /* ── auth guard ── */
  useEffect(() => {
    if (loading) return;
    if (!session && !isNoShell(pathname)) {
      if (typeof window !== "undefined") {
        const hasStored = Object.keys(window.localStorage || {}).some(
          (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
        );
        if (hasStored) return;
      }
      router.replace("/(auth)/login");
      return;
    }
    if (session && profile && !profile.onboarding_completed && !pathname.startsWith("/onboarding")) {
      router.replace({ pathname: "/onboarding", params: { userId: session.user.id } } as any);
    }
  }, [session, profile, loading, pathname]);

  const noShell = isNoShell(pathname) || !session;

  /* ── no-shell routes: just render content ── */
  if (loading && !noShell) {
    const theme = isDark ? "dt-dk" : "dt-lt";
    return (
      <div className={`dt-shell ${theme}`} style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="dt-loading"><div className="dt-spin" /></div>
      </div>
    );
  }

  if (noShell) {
    return <Slot />;
  }

  const theme = isDark ? "dt-dk" : "dt-lt";
  const displayName = profile?.display_name || profile?.handle || "User";
  const avatarUrl   = profile?.avatar_url;
  const initials    = displayName.charAt(0).toUpperCase();

  return (
    <>
      <div className={`dt-shell ${theme}`}>

        {/* ══ SIDEBAR ══ */}
        <nav className="dt-sidebar">

          {/* Logo + compose */}
          <div className="dt-logo">
            <img src="/logo.png" alt="AfuChat" className="dt-logo-img" />
            <span className="dt-logo-name">Afu<em>Chat</em></span>
            <button
              ref={composeRef}
              className="dt-icon-btn"
              title="Create…"
              onClick={(e) => {
                e.stopPropagation();
                if (composeDrop) { setComposeDrop(null); return; }
                const rect = composeRef.current!.getBoundingClientRect();
                setComposeDrop({ top: rect.bottom + 6, left: Math.max(8, rect.right - 208) });
              }}
            >
              <Edit3 size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Search */}
          <div className="dt-search">
            <div className="dt-search-inner">
              <Search size={13} className="dt-search-ico" />
              <input
                className="dt-search-inp"
                placeholder="Search people, chats, posts…"
                readOnly
                onClick={() => router.push("/(tabs)/search")}
              />
            </div>
          </div>

          {/* Nav groups */}
          <div className="dt-nav">
            {NAV.map((section) => (
              <div key={section.label} className="dt-nav-section">
                <span className="dt-nav-lbl">{section.label}</span>
                {section.items.map((item) => {
                  const active = isActiveRoute(pathname, item.matchPaths);
                  return (
                    <a
                      key={item.route}
                      className={`dt-nav-item${active ? " act" : ""}`}
                      href={item.route}
                      onClick={(e) => { e.preventDefault(); router.push(item.route as any); }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setNavCtx({ x: e.clientX, y: e.clientY, route: item.route, label: item.label });
                      }}
                    >
                      <item.Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.label === "Chats" && unread > 0 && (
                        <span className="dt-badge">{unread > 99 ? "99+" : unread}</span>
                      )}
                    </a>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User card */}
          <div
            className="dt-user"
            onClick={() => router.push("/(tabs)/me")}
            onContextMenu={(e) => {
              e.preventDefault();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setUserDrop({ bottom: window.innerHeight - r.top + 4, left: r.left + 4 });
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && router.push("/(tabs)/me")}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="dt-user-av" />
            ) : (
              <div className="dt-user-av-ph">{initials}</div>
            )}
            <div className="dt-user-info">
              <div className="dt-user-name">{displayName}</div>
              <div className="dt-user-handle">@{profile?.handle || "…"}</div>
            </div>
            <button
              className="dt-icon-btn"
              title="More options"
              onClick={(e) => {
                e.stopPropagation();
                if (userDrop) { setUserDrop(null); return; }
                const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setUserDrop({ bottom: window.innerHeight - r.top + 4, left: r.left - 170 });
              }}
            >
              <MoreHorizontal size={14} strokeWidth={1.8} />
            </button>
          </div>
        </nav>

        {/* ══ MAIN CONTENT ══ */}
        <main className="dt-content">
          <Slot />
        </main>

      </div>

      {/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className={`dt-bnav ${theme}`} aria-label="Mobile navigation">
        <div className="dt-bnav-inner">
          {BNAV.map((item) => {
            const active    = isActiveRoute(pathname, item.matchPaths as unknown as string[]);
            const isChats   = item.label === "Chats";
            const isProfile = item.label === "Profile";
            const iconColor = active ? "#00BCD4" : undefined;
            return (
              <a
                key={item.route}
                className={`dt-bnav-item${active ? " act" : ""}`}
                href={item.route}
                onClick={(e) => { e.preventDefault(); router.push(item.route as any); }}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <div className="dt-bnav-icon">
                  {isProfile && avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: active ? "2.5px solid #00BCD4" : "2px solid rgba(128,128,128,0.22)", transition: "border-color .16s" }} />
                  ) : item.useAfuSymbol ? (
                    <img src="/afu-symbol-icon.png" alt="Chats" style={{ width: 44, height: 44, objectFit: "contain", filter: active ? "invert(68%) sepia(97%) saturate(450%) hue-rotate(148deg) brightness(98%) contrast(102%)" : isDark ? "invert(40%) sepia(0%) saturate(0%) brightness(70%)" : "invert(30%) sepia(0%) saturate(0%) brightness(60%)", transition: "filter .16s" }} />
                  ) : (
                    <item.Icon size={24} strokeWidth={active ? 2.3 : 1.7} color={iconColor} />
                  )}
                  {isChats && unread > 0 && (
                    <span className="dt-bnav-badge">{unread > 99 ? "99+" : unread}</span>
                  )}
                </div>
                <span className="dt-bnav-label">{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* ══ COMPOSE DROPDOWN ══ */}
      {composeDrop && (
        <div className={`dt-drop ${theme}`} style={{ top: composeDrop.top, left: composeDrop.left }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="dt-drop-lbl">Create</div>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/(tabs)" as any); }}>
            <MessageCircle size={14} strokeWidth={1.8} /><span>New Chat</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/create-post" as any); }}>
            <FileText size={14} strokeWidth={1.8} /><span>New Post</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/story/create" as any); }}>
            <Film size={14} strokeWidth={1.8} /><span>New Story</span>
          </button>
          <hr className="dt-drop-hr" />
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/group/create" as any); }}>
            <Users size={14} strokeWidth={1.8} /><span>New Group</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/channel/intro" as any); }}>
            <Hash size={14} strokeWidth={1.8} /><span>New Channel</span>
          </button>
        </div>
      )}

      {/* ══ USER DROPDOWN ══ */}
      {userDrop && (
        <div className={`dt-drop ${theme}`} style={{ bottom: userDrop.bottom, left: userDrop.left }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="dt-drop-lbl">{profile?.handle ? `@${profile.handle}` : "Account"}</div>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/(tabs)/me" as any); }}>
            <User size={14} strokeWidth={1.8} /><span>View Profile</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/profile/edit" as any); }}>
            <Edit3 size={14} strokeWidth={1.8} /><span>Edit Profile</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push("/settings" as any); }}>
            <Settings size={14} strokeWidth={1.8} /><span>Settings</span>
          </button>
          {profile?.handle && (
            <>
              <hr className="dt-drop-hr" />
              <button className="dt-drop-item" onClick={() => { closeAll(); navigator.clipboard?.writeText(`@${profile!.handle}`); }}>
                <Copy size={14} strokeWidth={1.8} /><span>Copy @handle</span>
              </button>
            </>
          )}
          <hr className="dt-drop-hr" />
          <button className="dt-drop-item dt-danger" onClick={() => { closeAll(); supabase.auth.signOut(); }}>
            <LogOut size={14} strokeWidth={1.8} /><span>Sign out</span>
          </button>
        </div>
      )}

      {/* ══ NAV ITEM RIGHT-CLICK MENU ══ */}
      {navCtx && (
        <div className={`dt-drop ${theme}`} style={{ top: Math.min(navCtx.y, window.innerHeight - 160), left: Math.min(navCtx.x + 4, window.innerWidth - 220) }} onMouseDown={(e) => e.stopPropagation()}>
          <div className="dt-drop-lbl">{navCtx.label}</div>
          <button className="dt-drop-item" onClick={() => { closeAll(); router.push(navCtx.route as any); }}>
            <ExternalLink size={14} strokeWidth={1.8} /><span>Open</span>
          </button>
          <button className="dt-drop-item" onClick={() => { closeAll(); window.open(window.location.origin + navCtx.route, "_blank"); }}>
            <ExternalLink size={14} strokeWidth={1.8} /><span>Open in new tab</span>
          </button>
          <hr className="dt-drop-hr" />
          <button className="dt-drop-item" onClick={() => { closeAll(); navigator.clipboard?.writeText(window.location.origin + navCtx.route); }}>
            <Copy size={14} strokeWidth={1.8} /><span>Copy link</span>
          </button>
        </div>
      )}
    </>
  );
}
