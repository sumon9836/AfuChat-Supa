import React, { useCallback, useEffect, useState } from "react";
import { Slot, router, usePathname } from "expo-router";
import {
  MessageCircle, Compass, Search, Bot, Wallet, Grid3X3,
  User, Settings, Edit3, Users, Bell, Bookmark, Star,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { getLocalConversations } from "@/lib/storage/localConversations";
import { TabSwipeProvider } from "@/context/TabSwipeContext";

/* ─────────────────────────────────────────────────────────────
   CSS — injected once as a <style> tag. Uses CSS custom props
   (--dt-*) set per theme class on .dt-shell.
───────────────────────────────────────────────────────────── */
const DT_CSS = `
*,*::before,*::after{box-sizing:border-box}

.dt-shell{
  display:flex;height:100vh;overflow:hidden;
  font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
}

/* ── Light theme ── */
.dt-lt{
  --dt-bg:#F5F0E8;--dt-sb:#FFFFFF;--dt-bdr:#DDD7C9;
  --dt-txt:#1A1208;--dt-txt2:#5A5040;--dt-txt3:#8C7F6A;
  --dt-hover:rgba(0,0,0,0.046);--dt-active:rgba(0,188,212,0.10);
  --dt-inp:#EDE8DC;--dt-cl:#00BCD4;
}
/* ── Dark theme ── */
.dt-dk{
  --dt-bg:#0F0F0F;--dt-sb:#1C1C1E;--dt-bdr:#2C2C2E;
  --dt-txt:#F1F1F1;--dt-txt2:#AAAAAA;--dt-txt3:#717171;
  --dt-hover:rgba(255,255,255,0.055);--dt-active:rgba(0,188,212,0.14);
  --dt-inp:#2C2C2E;--dt-cl:#00BCD4;
}

/* ── Sidebar ── */
.dt-sidebar{
  width:248px;flex-shrink:0;
  display:flex;flex-direction:column;
  height:100vh;background:var(--dt-sb);
  border-right:1.5px solid var(--dt-bdr);
  overflow:hidden;
}

/* ── Logo strip ── */
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

/* ── Icon buttons (reused) ── */
.dt-icon-btn{
  background:none;border:none;cursor:pointer;
  padding:6px;border-radius:7px;color:var(--dt-txt3);
  display:flex;align-items:center;justify-content:center;
  transition:background .13s,color .13s;flex-shrink:0;
}
.dt-icon-btn:hover{background:var(--dt-hover);color:var(--dt-txt)}

/* ── Search shortcut ── */
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

/* ── Nav area ── */
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

/* ── Notifications row ── */
.dt-notif{
  display:flex;align-items:center;gap:11px;
  padding:8px 14px;margin:1px 8px;border-radius:9px;
  cursor:pointer;text-decoration:none;color:var(--dt-txt2);
  font-size:13.5px;font-weight:500;
  transition:background .12s,color .12s;
  user-select:none;
}
.dt-notif:hover{background:var(--dt-hover);color:var(--dt-txt)}

/* ── User card ── */
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

/* ── Content pane ── */
.dt-content{
  flex:1;display:flex;flex-direction:column;
  overflow:hidden;min-width:0;
  background:var(--dt-bg);
  height:100vh;
}
/* Ensure RN web root View fills full height */
.dt-content > div{flex:1;min-height:0;display:flex;flex-direction:column}

/* ── Loading ── */
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

/* ── Responsive: collapse sidebar on narrow viewports ── */
@media(max-width:820px){.dt-sidebar{display:none}}

/* ── Mobile bottom nav — centered floating pill, follows theme ── */
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
  background:none;
  border:none;
}
@media(max-width:820px){.dt-bnav{display:flex}}

.dt-bnav-inner{
  display:flex;align-items:center;
  padding:6px 8px;
  gap:0;
}

/* ── Nav item ── */
.dt-bnav-item{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;
  width:62px;
  padding:2px 0;
  text-decoration:none;
  color:rgba(110,108,118,1);
  font-size:10px;font-weight:500;letter-spacing:.08px;
  transition:color .16s;cursor:pointer;
  background:none;border:none;font-family:inherit;
  border-radius:32px;
  -webkit-tap-highlight-color:transparent;
  user-select:none;flex-shrink:0;
}
.dt-dk .dt-bnav-item{color:rgba(95,93,105,1)}
.dt-bnav-item:active{opacity:.68}

/* Active item */
.dt-bnav-item.act{color:#00BCD4;font-weight:700}

/* ── Icon chip (lights up on active) ── */
.dt-bnav-icon{
  position:relative;
  width:54px;height:36px;border-radius:18px;
  display:flex;align-items:center;justify-content:center;
  transition:background .2s;
}
.dt-bnav-item.act .dt-bnav-icon{background:rgba(0,188,212,0.16)}
.dt-lt .dt-bnav-item.act .dt-bnav-icon{background:rgba(0,188,212,0.12)}

/* ── Badge ── */
.dt-bnav-badge{
  position:absolute;top:-3px;right:-1px;
  background:#00BCD4;color:#000;
  font-size:9px;font-weight:800;min-width:16px;height:16px;
  border-radius:8px;display:flex;align-items:center;
  justify-content:center;padding:0 4px;line-height:1;
  pointer-events:none;
}

/* ── Item label ── */
.dt-bnav-label{font-size:10.5px;font-weight:inherit;letter-spacing:.04px;line-height:1}

/* Push content above nav */
@media(max-width:820px){.dt-content{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))}}
`;

/* ─────────────────────────────────────────────────────────────
   Navigation structure
───────────────────────────────────────────────────────────── */
const NAV = [
  {
    label: "Workspace",
    items: [
      {
        label: "Chats",
        Icon: MessageCircle,
        route: "/(tabs)" as const,
        matchPaths: ["/", "/(tabs)", "/index", "/chat"],
      },
      {
        label: "Discover",
        Icon: Compass,
        route: "/(tabs)/discover" as const,
        matchPaths: ["/discover", "/(tabs)/discover"],
      },
      {
        label: "Search",
        Icon: Search,
        route: "/(tabs)/search" as const,
        matchPaths: ["/search", "/(tabs)/search"],
      },
    ],
  },
  {
    label: "Features",
    items: [
      {
        label: "AfuAI",
        Icon: Bot,
        route: "/ai" as const,
        matchPaths: ["/ai"],
      },
      {
        label: "Wallet",
        Icon: Wallet,
        route: "/wallet" as const,
        matchPaths: ["/wallet"],
      },
      {
        label: "Apps",
        Icon: Grid3X3,
        route: "/(tabs)/apps" as const,
        matchPaths: ["/apps", "/(tabs)/apps"],
      },
    ],
  },
  {
    label: "Social",
    items: [
      {
        label: "Communities",
        Icon: Users,
        route: "/(tabs)/communities" as const,
        matchPaths: ["/communities", "/(tabs)/communities"],
      },
      {
        label: "Saved",
        Icon: Bookmark,
        route: "/saved-posts" as const,
        matchPaths: ["/saved-posts", "/saved"],
      },
    ],
  },
  {
    label: "You",
    items: [
      {
        label: "Profile",
        Icon: User,
        route: "/(tabs)/me" as const,
        matchPaths: ["/me", "/(tabs)/me"],
      },
      {
        label: "Achievements",
        Icon: Star,
        route: "/achievements" as const,
        matchPaths: ["/achievements"],
      },
    ],
  },
];

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

/* ─────────────────────────────────────────────────────────────
   Desktop layout component
───────────────────────────────────────────────────────────── */
export default function DesktopTabLayout() {
  const { session, profile, loading, user } = useAuth();
  const { isDark } = useTheme();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

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
    if (!session) {
      // Before redirecting, check if there's a stored Supabase session in
      // localStorage. If one exists the auth listener will restore it shortly —
      // redirecting now would kick the user out on every hard-refresh.
      if (typeof window !== "undefined") {
        const hasStored = Object.keys(window.localStorage || {}).some(
          (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
        );
        if (hasStored) return;
      }
      router.replace("/(auth)/login");
      return;
    }
    if (profile && !profile.onboarding_completed) {
      router.replace({
        pathname: "/onboarding",
        params: { userId: session.user.id },
      } as any);
    }
  }, [session, profile, loading]);

  const theme = isDark ? "dt-dk" : "dt-lt";

  /* ── loading / unauthenticated ── */
  if (loading || !session) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: DT_CSS }} />
        <div
          className={`dt-shell ${theme}`}
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <div className="dt-loading">
            <div className="dt-spin" />
          </div>
        </div>
      </>
    );
  }

  const displayName = profile?.display_name || profile?.handle || "User";
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DT_CSS }} />
      <TabSwipeProvider>
        <div className={`dt-shell ${theme}`}>

          {/* ══ SIDEBAR ══ */}
          <nav className="dt-sidebar">

            {/* Logo + compose button */}
            <div className="dt-logo">
              <img src="/logo.png" alt="AfuChat" className="dt-logo-img" />
              <span className="dt-logo-name">
                Afu<em>Chat</em>
              </span>
              <button
                className="dt-icon-btn"
                title="New Conversation"
                onClick={() => router.push("/(tabs)" as any)}
              >
                <Edit3 size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Search — click navigates to full search screen */}
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

            {/* Navigation groups */}
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
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(item.route as any);
                        }}
                      >
                        <item.Icon
                          size={17}
                          strokeWidth={active ? 2.2 : 1.8}
                        />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.label === "Chats" && unread > 0 && (
                          <span className="dt-badge">
                            {unread > 99 ? "99+" : unread}
                          </span>
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
                title="Settings"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/settings" as any);
                }}
              >
                <Settings size={14} strokeWidth={1.8} />
              </button>
            </div>
          </nav>

          {/* ══ MAIN CONTENT ══ */}
          <main className="dt-content">
            <Slot />
          </main>

        </div>

        {/* ══ MOBILE BOTTOM NAV (visible only when sidebar is hidden) ══ */}
        {(() => {
          const BNAV = [
            { label: "Chats",    Icon: MessageCircle, route: "/(tabs)"           as const, matchPaths: ["/", "/(tabs)", "/index", "/chat"], useAfuSymbol: true },
            { label: "Discover", Icon: Compass,       route: "/(tabs)/discover"  as const, matchPaths: ["/discover", "/(tabs)/discover"],   useAfuSymbol: false },
            { label: "Search",   Icon: Search,        route: "/(tabs)/search"    as const, matchPaths: ["/search", "/(tabs)/search"],        useAfuSymbol: false },
            { label: "Apps",     Icon: Grid3X3,       route: "/(tabs)/apps"      as const, matchPaths: ["/apps", "/(tabs)/apps"],            useAfuSymbol: false },
            { label: "Profile",  Icon: User,          route: "/(tabs)/me"        as const, matchPaths: ["/me", "/(tabs)/me"],                useAfuSymbol: false },
          ] as const;
          return (
            <nav className="dt-bnav" aria-label="Mobile navigation">
              <div className="dt-bnav-inner">
                {BNAV.map((item) => {
                  const active = isActiveRoute(pathname, item.matchPaths as unknown as string[]);
                  const isChats = item.label === "Chats";
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
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            style={{
                              width: 28, height: 28, borderRadius: "50%",
                              objectFit: "cover",
                              border: active ? "2.5px solid #00BCD4" : "2px solid rgba(128,128,128,0.22)",
                              transition: "border-color .16s",
                            }}
                          />
                        ) : item.useAfuSymbol ? (
                          <img
                            src="/afu-symbol-icon.png"
                            alt="Chats"
                            style={{
                              width: 44, height: 44,
                              objectFit: "contain",
                              filter: active
                                ? "invert(68%) sepia(97%) saturate(450%) hue-rotate(148deg) brightness(98%) contrast(102%)"
                                : isDark
                                  ? "invert(40%) sepia(0%) saturate(0%) brightness(70%)"
                                  : "invert(30%) sepia(0%) saturate(0%) brightness(60%)",
                              transition: "filter .16s",
                            }}
                          />
                        ) : (
                          <item.Icon
                            size={24}
                            strokeWidth={active ? 2.3 : 1.7}
                            color={iconColor}
                          />
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
          );
        })()}

      </TabSwipeProvider>
    </>
  );
}
