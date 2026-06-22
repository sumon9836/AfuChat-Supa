import React, { useRef, useState } from "react";
import {
  Animated, Easing, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "@/lib/haptics";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatKey = "health" | "education" | "happiness" | "wealth" | "reputation";

type Stats = {
  health: number;
  education: number;
  happiness: number;
  wealth: number;
  reputation: number;
};

type Choice = {
  icon: string;
  label: string;
  sub: string;
  effect: Partial<Record<StatKey, number>>;
  tag?: string;
};

type Scene = {
  id: string;
  phase: Phase;
  age: number;
  title: string;
  narrative: string;
  choices: Choice[];
};

type LogEntry = { age: number; text: string; icon: string };
type Phase = "infant" | "child" | "teen" | "youngAdult" | "adult" | "midLife" | "elderly";
type GamePhase = "intro" | "birth" | "playing" | "event" | "death";

// ─── Data ─────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { name: "Nigeria", flag: "🇳🇬", region: "Africa", wealthMod: 0.6 },
  { name: "USA", flag: "🇺🇸", region: "North America", wealthMod: 1.5 },
  { name: "India", flag: "🇮🇳", region: "Asia", wealthMod: 0.75 },
  { name: "Brazil", flag: "🇧🇷", region: "South America", wealthMod: 0.85 },
  { name: "Germany", flag: "🇩🇪", region: "Europe", wealthMod: 1.4 },
  { name: "Japan", flag: "🇯🇵", region: "Asia", wealthMod: 1.3 },
  { name: "Kenya", flag: "🇰🇪", region: "Africa", wealthMod: 0.55 },
  { name: "Australia", flag: "🇦🇺", region: "Oceania", wealthMod: 1.4 },
  { name: "Mexico", flag: "🇲🇽", region: "North America", wealthMod: 0.8 },
  { name: "UK", flag: "🇬🇧", region: "Europe", wealthMod: 1.35 },
  { name: "South Africa", flag: "🇿🇦", region: "Africa", wealthMod: 0.7 },
  { name: "Canada", flag: "🇨🇦", region: "North America", wealthMod: 1.4 },
  { name: "China", flag: "🇨🇳", region: "Asia", wealthMod: 1.0 },
  { name: "France", flag: "🇫🇷", region: "Europe", wealthMod: 1.3 },
  { name: "Ghana", flag: "🇬🇭", region: "Africa", wealthMod: 0.6 },
];

const FAMILY_TYPES = [
  { label: "Poor", wealth: 500,    desc: "Your family struggles to make ends meet.", color: "#FF3B30", icon: "🏚️" },
  { label: "Working Class", wealth: 8000,  desc: "Your parents work hard jobs for modest income.", color: "#FF9500", icon: "🏠" },
  { label: "Middle Class", wealth: 30000, desc: "Comfortable home, stable income, good education.", color: "#007AFF", icon: "🏡" },
  { label: "Upper Class", wealth: 150000, desc: "Private schools, connections, and privilege.", color: "#AF52DE", icon: "🏘️" },
  { label: "Rich", wealth: 500000, desc: "Old money, elite networks, the world is open.", color: "#FFD700", icon: "🏰" },
];

const PARENT_JOBS = ["Teacher", "Doctor", "Farmer", "Engineer", "Trader", "Civil Servant", "Nurse", "Entrepreneur", "Police Officer", "Driver", "Lawyer", "Accountant"];

const PHASE_GRADIENTS: Record<Phase, [string, string]> = {
  infant:     ["#667eea", "#764ba2"],
  child:      ["#11998e", "#38ef7d"],
  teen:       ["#f7971e", "#ffd200"],
  youngAdult: ["#e94560", "#c23152"],
  adult:      ["#0f3460", "#533483"],
  midLife:    ["#373b44", "#4286f4"],
  elderly:    ["#485563", "#29323c"],
};

const PHASE_LABELS: Record<Phase, string> = {
  infant:     "Infancy (0–2)",
  child:      "Childhood (3–12)",
  teen:       "Teenage (13–17)",
  youngAdult: "Young Adult (18–25)",
  adult:      "Adult (26–45)",
  midLife:    "Mid-Life (46–60)",
  elderly:    "Elderly (60+)",
};

const RANDOM_EVENTS = [
  { title: "Medical Scare", text: "You fell seriously ill and needed hospitalisation.", icon: "🏥", effect: { health: -15, wealth: -3000 } },
  { title: "Lucky Break", text: "A distant relative left you an unexpected inheritance.", icon: "💰", effect: { wealth: 12000, happiness: 10 } },
  { title: "Scholarship Won", text: "You were awarded an academic scholarship!", icon: "🎓", effect: { education: 10, reputation: 8, happiness: 8 } },
  { title: "Business Setback", text: "An investment you made went badly wrong.", icon: "📉", effect: { wealth: -8000, happiness: -10 } },
  { title: "Community Recognition", text: "You were recognised for your work in the community.", icon: "🏅", effect: { reputation: 15, happiness: 12 } },
  { title: "Accident", text: "A road accident left you injured and off work.", icon: "🚑", effect: { health: -20, wealth: -5000 } },
  { title: "Viral Moment", text: "Something you did went viral and made you famous locally.", icon: "📱", effect: { reputation: 20, happiness: 10 } },
  { title: "Family Crisis", text: "A serious family situation drained your energy and savings.", icon: "😞", effect: { happiness: -15, wealth: -4000 } },
  { title: "Side Business Wins", text: "A small side project you started took off.", icon: "🚀", effect: { wealth: 20000, reputation: 10 } },
  { title: "Health Milestone", text: "You committed to fitness and feel stronger than ever.", icon: "💪", effect: { health: 15, happiness: 10 } },
];

const SCENES: Scene[] = [
  // ── CHILDHOOD ──
  {
    id: "child_school", phase: "child", age: 7,
    title: "First Day of School",
    narrative: "You are 7 years old and it is your first week at primary school. The teacher asks what kind of student you want to be. How do you spend your school years?",
    choices: [
      { icon: "📚", label: "Study hard", sub: "Top of the class, few friends.", effect: { education: 18, happiness: -5 } },
      { icon: "⚽", label: "Play sports", sub: "Popular, active, decent grades.", effect: { health: 15, happiness: 10, education: 5, reputation: 5 } },
      { icon: "🎨", label: "Arts & creativity", sub: "Unique skills, small circle.", effect: { happiness: 12, reputation: 8, education: 8 } },
    ],
  },
  {
    id: "child_family", phase: "child", age: 11,
    title: "A Family Decision",
    narrative: "Your parents face a tough choice. Your father is offered a job in another city. You have a say. What do you think your family should do?",
    choices: [
      { icon: "🚚", label: "Move to the new city", sub: "Better opportunity, fresh start.", effect: { wealth: 5000, happiness: -8, reputation: 5 } },
      { icon: "🏠", label: "Stay in your hometown", sub: "Comfort, but limited growth.", effect: { happiness: 10, education: -5 } },
      { icon: "🤷", label: "You don't have a say", sub: "Your parents decide alone.", effect: { happiness: -5 } },
    ],
  },
  // ── TEEN ──
  {
    id: "teen_path", phase: "teen", age: 14,
    title: "Teenage Crossroads",
    narrative: "You are 14. Life is getting more complicated — exams matter, peer pressure is real, and opportunities are appearing. What defines your teenage years?",
    choices: [
      { icon: "📖", label: "Academics first", sub: "Top grades, university in sight.", effect: { education: 20, happiness: -8 }, tag: "Scholar" },
      { icon: "💼", label: "Part-time work", sub: "Money in your pocket, real skills.", effect: { wealth: 3000, education: -5, reputation: 5 } },
      { icon: "🎸", label: "Music & social life", sub: "Friends, fun, followers.", effect: { happiness: 18, reputation: 12, education: -8 } },
      { icon: "🏋️", label: "Sports training", sub: "Discipline, fitness, recognition.", effect: { health: 20, reputation: 10, education: -5 }, tag: "Athlete" },
    ],
  },
  {
    id: "teen_crisis", phase: "teen", age: 16,
    title: "A Difficult Situation",
    narrative: "A close friend is in serious trouble and asks for your help. It could cost you — time, money, or your reputation. What do you do?",
    choices: [
      { icon: "🤝", label: "Help them fully", sub: "Loyal, but it costs you.", effect: { happiness: 15, wealth: -1000, reputation: 10 } },
      { icon: "💡", label: "Give advice only", sub: "Balanced approach.", effect: { happiness: 5, reputation: 5 } },
      { icon: "🚶", label: "Walk away", sub: "Self-preservation. Regret later.", effect: { happiness: -10, reputation: -5 } },
    ],
  },
  // ── YOUNG ADULT ──
  {
    id: "ya_education", phase: "youngAdult", age: 18,
    title: "After School: What Next?",
    narrative: "You have finished secondary school. The path ahead is yours to choose. This decision will shape the next decade of your life.",
    choices: [
      { icon: "🎓", label: "University", sub: "4 years, big investment, big returns.", effect: { education: 25, wealth: -25000 }, tag: "Graduate" },
      { icon: "🔧", label: "Trade / Vocational", sub: "2 years, skilled profession, good pay.", effect: { education: 12, wealth: -5000 }, tag: "Skilled" },
      { icon: "🏢", label: "Enter the workforce", sub: "Start earning now, grow later.", effect: { wealth: 15000, education: -5 } },
      { icon: "🌍", label: "Travel & explore", sub: "Life experience, limited income.", effect: { happiness: 20, reputation: 8, wealth: -8000 } },
    ],
  },
  {
    id: "ya_career", phase: "youngAdult", age: 23,
    title: "Choosing a Career Path",
    narrative: "You are 23. The job market is competitive. Based on your background and skills, several doors are open. Which path do you take?",
    choices: [
      { icon: "💊", label: "Healthcare / Medicine", sub: "Long training, great income and impact.", effect: { education: 15, wealth: -10000, reputation: 20 }, tag: "Doctor" },
      { icon: "💻", label: "Technology", sub: "Fast-growing field, remote-friendly.", effect: { wealth: 20000, education: 10, reputation: 8 }, tag: "Engineer" },
      { icon: "🎨", label: "Creative industry", sub: "Passion-led, variable income.", effect: { happiness: 20, wealth: 5000, reputation: 10 }, tag: "Creative" },
      { icon: "🏛️", label: "Government / Public service", sub: "Stable, respected, slower growth.", effect: { reputation: 18, wealth: 10000, happiness: 8 }, tag: "Official" },
      { icon: "🚀", label: "Start a business", sub: "High risk, high reward.", effect: { wealth: -5000, reputation: 5, happiness: 15 }, tag: "Founder" },
    ],
  },
  // ── ADULT ──
  {
    id: "adult_relationship", phase: "adult", age: 28,
    title: "Love & Relationships",
    narrative: "You are 28. You have been dating someone you care about deeply. The question of commitment has come up. Where do you stand?",
    choices: [
      { icon: "💍", label: "Get married", sub: "Partnership, family, stability.", effect: { happiness: 20, wealth: -8000, reputation: 10 } },
      { icon: "🤗", label: "Stay together, not married", sub: "Modern approach.", effect: { happiness: 12, wealth: -2000 } },
      { icon: "🧘", label: "Focus on yourself first", sub: "Independence, career priority.", effect: { wealth: 10000, happiness: 5, education: 5 } },
    ],
  },
  {
    id: "adult_finance", phase: "adult", age: 32,
    title: "Financial Decisions",
    narrative: "You have saved some money. The financial decisions you make in your 30s will determine your wealth in your 50s. What is your strategy?",
    choices: [
      { icon: "📈", label: "Invest in stocks & assets", sub: "Higher risk, higher potential.", effect: { wealth: 35000, happiness: -5 }, tag: "Investor" },
      { icon: "🏗️", label: "Start a side business", sub: "Extra income stream.", effect: { wealth: 20000, health: -5, happiness: 5 } },
      { icon: "🏠", label: "Buy property", sub: "Stable, tangible investment.", effect: { wealth: 50000, reputation: 8 } },
      { icon: "💳", label: "Spend and enjoy life", sub: "Live now, save later.", effect: { happiness: 20, wealth: -10000 } },
    ],
  },
  {
    id: "adult_health", phase: "adult", age: 38,
    title: "Your Health",
    narrative: "A routine check-up reveals warning signs. Your doctor says your lifestyle is affecting your long-term health. What do you change?",
    choices: [
      { icon: "🏃", label: "Full lifestyle change", sub: "Exercise, diet, less stress.", effect: { health: 25, happiness: 8, wealth: -2000 } },
      { icon: "💊", label: "Take medication only", sub: "Managed but not fixed.", effect: { health: 8, wealth: -3000 } },
      { icon: "😤", label: "Ignore it for now", sub: "Too busy to deal with it.", effect: { health: -20, happiness: 5 } },
    ],
  },
  // ── MID LIFE ──
  {
    id: "midlife_career", phase: "midLife", age: 48,
    title: "Career Peak or Crisis?",
    narrative: "You are approaching 50. Some people hit their peak, others face a crisis. A major opportunity appears — a senior role or your own venture. What do you do?",
    choices: [
      { icon: "📊", label: "Take the senior role", sub: "Prestige, pressure, peak income.", effect: { wealth: 60000, reputation: 20, health: -10 } },
      { icon: "🏡", label: "Scale back, prioritise family", sub: "Less money, more presence.", effect: { happiness: 20, wealth: -10000 } },
      { icon: "💼", label: "Launch your own venture", sub: "Risky late-career bet.", effect: { wealth: 40000, health: -8, happiness: 15, reputation: 15 } },
    ],
  },
  {
    id: "midlife_legacy", phase: "midLife", age: 55,
    title: "Leaving a Mark",
    narrative: "At 55, you think about legacy. How do you want to be remembered? What do you invest in now?",
    choices: [
      { icon: "🏫", label: "Fund education / charity", sub: "Community impact, lasting name.", effect: { reputation: 25, happiness: 15, wealth: -20000 } },
      { icon: "🌳", label: "Environmental causes", sub: "Planet legacy, personal fulfilment.", effect: { happiness: 18, reputation: 15, wealth: -8000 } },
      { icon: "👨‍👩‍👧‍👦", label: "Build for your children", sub: "Pass on wealth and wisdom.", effect: { happiness: 20, wealth: 30000, reputation: 10 } },
    ],
  },
  // ── ELDERLY ──
  {
    id: "elderly_retire", phase: "elderly", age: 62,
    title: "Retirement",
    narrative: "You have worked your whole life. Now it is time to rest — but how do you spend your golden years?",
    choices: [
      { icon: "✈️", label: "Travel the world", sub: "Bucket list, unforgettable memories.", effect: { happiness: 25, wealth: -30000, health: 5 } },
      { icon: "📖", label: "Write, teach, mentor", sub: "Share your knowledge.", effect: { happiness: 18, reputation: 15, education: 5 } },
      { icon: "🌾", label: "Quiet rural life", sub: "Peace, nature, simple living.", effect: { happiness: 20, health: 10, wealth: -5000 } },
    ],
  },
  {
    id: "elderly_final", phase: "elderly", age: 72,
    title: "Final Chapter",
    narrative: "In your 70s, you reflect on everything. You have one last major gift to leave. What is it?",
    choices: [
      { icon: "🎓", label: "Establish a scholarship", sub: "Your name lives on in young minds.", effect: { reputation: 30, happiness: 20, wealth: -40000 } },
      { icon: "📜", label: "Write your autobiography", sub: "Your story preserved forever.", effect: { reputation: 20, happiness: 25 } },
      { icon: "❤️", label: "Give everything to family", sub: "Family wealth secured for generations.", effect: { happiness: 30, wealth: -50000, reputation: 10 } },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }
function fmtWealth(w: number) {
  if (w >= 1_000_000) return `$${(w / 1_000_000).toFixed(1)}M`;
  if (w >= 1_000) return `$${(w / 1_000).toFixed(0)}K`;
  return `$${w}`;
}
function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, n); }

// ─── Stat bar component ────────────────────────────────────────────────────────

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const { colors } = useTheme();
  return (
    <View style={sb.wrap}>
      <View style={sb.labelRow}>
        <Text style={sb.icon}>{icon}</Text>
        <Text style={[sb.label, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[sb.val, { color }]}>{Math.round(value)}</Text>
      </View>
      <View style={[sb.track, { backgroundColor: colors.border }]}>
        <View style={[sb.fill, { width: `${clamp(value)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap: { gap: 4 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  icon: { fontSize: 12 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  val: { fontSize: 12, fontFamily: "Inter_700Bold" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});

// ─── Main game ────────────────────────────────────────────────────────────────

export default function LifeSimGame() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [gamePhase, setGamePhase]     = useState<GamePhase>("intro");
  const [sceneIndex, setSceneIndex]   = useState(0);
  const [stats, setStats]             = useState<Stats>({ health: 80, education: 10, happiness: 60, wealth: 0, reputation: 10 });
  const [age, setAge]                 = useState(0);
  const [log, setLog]                 = useState<LogEntry[]>([]);
  const [country, setCountry]         = useState(COUNTRIES[0]);
  const [family, setFamily]           = useState(FAMILY_TYPES[2]);
  const [parentJobA, setParentJobA]   = useState("Teacher");
  const [parentJobB, setParentJobB]   = useState("Nurse");
  const [tags, setTags]               = useState<string[]>([]);
  const [currentEvent, setCurrentEvent] = useState<typeof RANDOM_EVENTS[0] | null>(null);
  const [xpEarned, setXpEarned]       = useState(0);

  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const scene = SCENES[sceneIndex];
  const gradient = scene ? PHASE_GRADIENTS[scene.phase] : ["#1a1a2e", "#16213e"];
  const isDone = sceneIndex >= SCENES.length;

  // ── Animate scene transition ─────────────────────────────────────────────

  function animateNext(fn: () => void) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: Platform.OS !== "web" }),
    ]).start(() => {
      fn();
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
      ]).start();
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
    });
  }

  // ── Apply stat effect ────────────────────────────────────────────────────

  function applyEffect(effect: Partial<Record<StatKey, number>>, baseStats: Stats): Stats {
    return {
      health:     clamp(baseStats.health     + (effect.health     || 0)),
      education:  clamp(baseStats.education  + (effect.education  || 0)),
      happiness:  clamp(baseStats.happiness  + (effect.happiness  || 0)),
      wealth:     Math.max(0, baseStats.wealth     + (effect.wealth     || 0)),
      reputation: clamp(baseStats.reputation + (effect.reputation || 0)),
    };
  }

  // ── Start game ───────────────────────────────────────────────────────────

  function startGame() {
    const c = rand(COUNTRIES);
    const familyRoll = Math.random();
    const f = familyRoll < 0.15 ? FAMILY_TYPES[0] : familyRoll < 0.35 ? FAMILY_TYPES[1] : familyRoll < 0.70 ? FAMILY_TYPES[2] : familyRoll < 0.88 ? FAMILY_TYPES[3] : FAMILY_TYPES[4];
    const startWealth = Math.round(f.wealth * (0.8 + Math.random() * 0.4) * c.wealthMod);
    setCountry(c);
    setFamily(f);
    setParentJobA(rand(PARENT_JOBS));
    setParentJobB(rand(PARENT_JOBS));
    setStats({ health: 80, education: 5, happiness: 65, wealth: startWealth, reputation: 5 });
    setAge(0);
    setLog([{ age: 0, icon: "👶", text: `Born in ${c.name} into a ${f.label} family` }]);
    setTags([]);
    setXpEarned(0);
    setSceneIndex(0);
    setGamePhase("birth");
  }

  function beginPlaying() {
    animateNext(() => {
      setAge(SCENES[0].age);
      setGamePhase("playing");
    });
  }

  // ── Make a choice ────────────────────────────────────────────────────────

  function makeChoice(choice: Choice) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newStats = applyEffect(choice.effect, stats);
    const newAge = scene.age;
    const xpGain = Math.floor(Math.random() * 15) + 5;
    const newXp = xpEarned + xpGain;

    const newLog: LogEntry = {
      age: newAge,
      icon: choice.icon,
      text: `${choice.label} — ${choice.sub}`,
    };

    const newTags = choice.tag ? [...tags, choice.tag] : tags;

    // Maybe fire a random event
    const fireEvent = Math.random() < 0.4;
    const event = fireEvent ? rand(RANDOM_EVENTS) : null;

    animateNext(() => {
      setStats(newStats);
      setAge(newAge);
      setXpEarned(newXp);
      setLog((l) => [...l, newLog]);
      setTags(newTags);

      if (event) {
        setCurrentEvent(event);
        setGamePhase("event");
      } else {
        const nextIdx = sceneIndex + 1;
        if (nextIdx >= SCENES.length) {
          setGamePhase("death");
        } else {
          setSceneIndex(nextIdx);
        }
      }
    });
  }

  // ── Dismiss event ────────────────────────────────────────────────────────

  function dismissEvent() {
    if (!currentEvent) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newStats = applyEffect(currentEvent.effect as any, stats);
    const evLog: LogEntry = { age, icon: currentEvent.icon, text: currentEvent.title };

    animateNext(() => {
      setStats(newStats);
      setLog((l) => [...l, evLog]);
      setCurrentEvent(null);

      const nextIdx = sceneIndex + 1;
      if (nextIdx >= SCENES.length) {
        setGamePhase("death");
      } else {
        setSceneIndex(nextIdx);
        setGamePhase("playing");
      }
    });
  }

  // ── Compute final grade ──────────────────────────────────────────────────

  function lifeGrade() {
    const total = stats.health + stats.education + stats.happiness + stats.reputation + Math.min(100, stats.wealth / 10000);
    const avg = total / 5;
    if (avg >= 75) return { grade: "S", label: "Legendary", emoji: "🏆" };
    if (avg >= 60) return { grade: "A", label: "Outstanding", emoji: "🌟" };
    if (avg >= 45) return { grade: "B", label: "Good Life", emoji: "👍" };
    if (avg >= 30) return { grade: "C", label: "Average", emoji: "😊" };
    return { grade: "D", label: "Difficult Life", emoji: "💪" };
  }

  // ─── INTRO SCREEN ──────────────────────────────────────────────────────────

  if (gamePhase === "intro") {
    return (
      <View style={[s.root, { backgroundColor: "#0a0a0f" }]}>
        <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={[s.introFull, { paddingTop: insets.top }]}>
          <View style={s.introOrb1} />
          <View style={s.introOrb2} />
          <TouchableOpacity style={[s.closeBtn, { top: insets.top + 8 }]} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <View style={s.introContent}>
            <Text style={s.introGlobe}>🌍</Text>
            <Text style={s.introTitle}>LIFE EARTH</Text>
            <Text style={s.introTagline}>The Ultimate Human Life Simulation</Text>
            <Text style={s.introDesc}>
              You will be born as a newborn into a randomly generated family anywhere on Earth. Every decision you make shapes your destiny. Live. Learn. Work. Love. Leave a legacy.
            </Text>
            <View style={s.introFeatures}>
              {[
                { icon: "🌎", text: "15 countries across every continent" },
                { icon: "👶", text: "Born into random family & wealth" },
                { icon: "🎲", text: "Dynamic random life events" },
                { icon: "🏆", text: "Legacy system — your life rated S to D" },
              ].map((f) => (
                <View key={f.icon} style={s.introFeatureRow}>
                  <Text style={s.introFeatureIcon}>{f.icon}</Text>
                  <Text style={s.introFeatureText}>{f.text}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.beginBtn} onPress={startGame}>
              <LinearGradient colors={["#e94560", "#c23152"]} style={s.beginBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={s.beginBtnText}>Begin My Life</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ─── BIRTH SCREEN ──────────────────────────────────────────────────────────

  if (gamePhase === "birth") {
    return (
      <View style={[s.root, { backgroundColor: "#0a0a0f" }]}>
        <LinearGradient colors={["#667eea", "#764ba2"]} style={[s.birthBanner, { paddingTop: insets.top + 16 }]}>
          <Text style={s.birthEmoji}>👶</Text>
          <Text style={s.birthTitle}>You Have Been Born</Text>
          <Text style={s.birthSub}>{country.flag} {country.name}</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 30 }}>
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>YOUR FAMILY</Text>
          <View style={[s.birthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.birthCardTop}>
              <Text style={{ fontSize: 32 }}>{family.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.birthCardTitle, { color: colors.text }]}>{family.label} Family</Text>
                <Text style={[s.birthCardSub, { color: colors.textMuted }]}>{family.desc}</Text>
              </View>
              <View style={[s.birthChip, { backgroundColor: family.color + "22" }]}>
                <Text style={[s.birthChipText, { color: family.color }]}>{fmtWealth(stats.wealth)}</Text>
              </View>
            </View>
          </View>

          <View style={[s.birthCard, { backgroundColor: colors.surface, borderColor: colors.border, gap: 10 }]}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>PARENTS</Text>
            {[{ icon: "👨", job: parentJobA }, { icon: "👩", job: parentJobB }].map((p) => (
              <View key={p.icon} style={s.parentRow}>
                <Text style={{ fontSize: 22 }}>{p.icon}</Text>
                <Text style={[s.parentJob, { color: colors.text }]}>{p.job}</Text>
              </View>
            ))}
          </View>

          <View style={[s.birthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>YOUR STARTING STATS</Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              <StatBar label="Health" value={stats.health} color="#34C759" icon="❤️" />
              <StatBar label="Education" value={stats.education} color="#007AFF" icon="📚" />
              <StatBar label="Happiness" value={stats.happiness} color="#FF9500" icon="😊" />
              <StatBar label="Reputation" value={stats.reputation} color="#AF52DE" icon="⭐" />
            </View>
          </View>

          <View style={[s.birthCard, { backgroundColor: "#16213e", borderColor: "#0f3460", gap: 8 }]}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", lineHeight: 18 }}>
              🌍 Born in <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{country.name}</Text>, {country.region}. Your family's wealth, your parents' jobs, and the country you're born in will all shape the opportunities available to you. The rest is up to you.
            </Text>
          </View>

          <TouchableOpacity style={[s.beginBtn, { marginTop: 4 }]} onPress={beginPlaying}>
            <LinearGradient colors={["#667eea", "#764ba2"]} style={s.beginBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.beginBtnText}>Start My Life Journey</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── RANDOM EVENT SCREEN ───────────────────────────────────────────────────

  if (gamePhase === "event" && currentEvent) {
    const isPositive = Object.values(currentEvent.effect).some((v) => (v as number) > 0);
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={isPositive ? ["#11998e", "#38ef7d"] : ["#eb3349", "#f45c43"]} style={[s.eventBanner, { paddingTop: insets.top + 20 }]}>
          <Text style={s.eventIcon}>{currentEvent.icon}</Text>
          <View style={[s.eventTypeBadge, { backgroundColor: isPositive ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)" }]}>
            <Text style={s.eventTypeText}>{isPositive ? "GOOD EVENT" : "LIFE EVENT"}</Text>
          </View>
          <Text style={s.eventTitle}>{currentEvent.title}</Text>
        </LinearGradient>
        <View style={{ flex: 1, padding: 20, gap: 16 }}>
          <View style={[s.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.eventNarrative, { color: colors.text }]}>{currentEvent.text}</Text>
            <Text style={[s.eventAge, { color: colors.textMuted }]}>Age {age}</Text>
          </View>

          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>IMPACT ON YOUR LIFE</Text>
          <View style={{ gap: 8 }}>
            {Object.entries(currentEvent.effect).map(([key, val]) => {
              const v = val as number;
              const pos = v > 0;
              const labels: Record<string, string> = { health: "❤️ Health", education: "📚 Education", happiness: "😊 Happiness", wealth: "💰 Wealth", reputation: "⭐ Reputation" };
              return (
                <View key={key} style={[s.impactRow, { backgroundColor: pos ? "#34C75912" : "#FF3B3012", borderColor: pos ? "#34C75940" : "#FF3B3040" }]}>
                  <Text style={[s.impactLabel, { color: colors.text }]}>{labels[key] || key}</Text>
                  <Text style={[s.impactVal, { color: pos ? "#34C759" : "#FF3B30" }]}>
                    {pos ? "+" : ""}{key === "wealth" ? fmtWealth(Math.abs(v)) : v} {v > 0 ? "▲" : "▼"}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={dismissEvent}>
            <LinearGradient colors={isPositive ? ["#11998e", "#38ef7d"] : ["#555", "#333"]} style={s.dismissBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.dismissBtnText}>{isPositive ? "Great!" : "Accept & Continue"}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── DEATH / LEGACY SCREEN ────────────────────────────────────────────────

  if (gamePhase === "death" || isDone) {
    const deathAge = 65 + Math.floor(stats.health / 5);
    const { grade, label, emoji } = lifeGrade();
    const finalXp = xpEarned + Math.floor(stats.reputation / 2) + Math.floor(stats.happiness / 3);
    return (
      <View style={[s.root, { backgroundColor: "#0a0a0f" }]}>
        <LinearGradient colors={["#485563", "#29323c"]} style={[s.deathBanner, { paddingTop: insets.top + 20 }]}>
          <Text style={s.deathEmoji}>{emoji}</Text>
          <Text style={s.deathTitle}>Your Life Is Complete</Text>
          <Text style={s.deathAge}>You lived to age {deathAge}</Text>
          <View style={[s.gradeCircle, { borderColor: grade === "S" ? "#FFD700" : grade === "A" ? "#34C759" : grade === "B" ? "#007AFF" : "#FF9500" }]}>
            <Text style={[s.gradeText, { color: grade === "S" ? "#FFD700" : grade === "A" ? "#34C759" : grade === "B" ? "#007AFF" : "#FF9500" }]}>{grade}</Text>
          </View>
          <Text style={s.gradeLabel}>{label}</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 30 }}>
          {/* Final stats */}
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>FINAL STATS</Text>
          <View style={[s.birthCard, { backgroundColor: colors.surface, borderColor: colors.border, gap: 10 }]}>
            <StatBar label="Health" value={stats.health} color="#34C759" icon="❤️" />
            <StatBar label="Education" value={stats.education} color="#007AFF" icon="📚" />
            <StatBar label="Happiness" value={stats.happiness} color="#FF9500" icon="😊" />
            <StatBar label="Reputation" value={stats.reputation} color="#AF52DE" icon="⭐" />
            <View style={[s.wealthRow, { borderTopColor: colors.border }]}>
              <Text style={[s.wealthLabel, { color: colors.textMuted }]}>💰 Final Wealth</Text>
              <Text style={[s.wealthVal, { color: "#34C759" }]}>{fmtWealth(stats.wealth)}</Text>
            </View>
          </View>

          {/* Tags / achievements */}
          {tags.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>LIFE ACHIEVEMENTS</Text>
              <View style={s.tagsWrap}>
                {tags.map((t) => (
                  <View key={t} style={[s.tagBadge, { backgroundColor: "#e9456022", borderColor: "#e9456055" }]}>
                    <Text style={[s.tagText, { color: "#e94560" }]}>🏅 {t}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* XP earned */}
          <View style={[s.xpCard, { backgroundColor: "#FF950018", borderColor: "#FF950044" }]}>
            <Ionicons name="flash" size={20} color="#FF9500" />
            <Text style={[s.xpText, { color: "#FF9500" }]}>+{finalXp} XP Earned</Text>
          </View>

          {/* Life log */}
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>YOUR LIFE STORY</Text>
          <View style={[s.birthCard, { backgroundColor: colors.surface, borderColor: colors.border, gap: 0 }]}>
            {log.map((entry, i) => (
              <View key={i}>
                <View style={s.logRow}>
                  <View style={[s.logAgeCircle, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[s.logAgeText, { color: colors.textMuted }]}>~{entry.age}</Text>
                  </View>
                  <Text style={{ fontSize: 16 }}>{entry.icon}</Text>
                  <Text style={[s.logText, { color: colors.text, flex: 1 }]}>{entry.text}</Text>
                </View>
                {i < log.length - 1 && <View style={[{ height: 0.5, marginLeft: 58, backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={startGame}>
            <LinearGradient colors={["#e94560", "#c23152"]} style={s.beginBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={s.beginBtnText}>Live Another Life</Text>
              <Ionicons name="refresh" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={[s.backCard, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
            <Text style={[s.backCardText, { color: colors.textMuted }]}>Back to Games</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── PLAYING SCREEN ────────────────────────────────────────────────────────

  const progress = sceneIndex / SCENES.length;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Stage header */}
      <LinearGradient colors={gradient as [string,string]} style={[s.stageHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
          <Text style={s.stageLabel}>{scene ? PHASE_LABELS[scene.phase] : ""}</Text>
          {/* Life progress bar */}
          <View style={s.lifeProgress}>
            <View style={[s.lifeProgressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
        <View style={[s.agePill]}>
          <Text style={s.ageText}>Age {age}</Text>
        </View>
      </LinearGradient>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>

        {/* Stats panel */}
        <View style={[s.statsPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ gap: 8 }}>
            <StatBar label="Health" value={stats.health} color="#34C759" icon="❤️" />
            <StatBar label="Education" value={stats.education} color="#007AFF" icon="📚" />
            <StatBar label="Happiness" value={stats.happiness} color="#FF9500" icon="😊" />
            <StatBar label="Reputation" value={stats.reputation} color="#AF52DE" icon="⭐" />
          </View>
          <View style={[s.wealthChip, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[s.wealthChipLabel, { color: colors.textMuted }]}>Wealth</Text>
            <Text style={[s.wealthChipVal, { color: "#34C759" }]}>{fmtWealth(stats.wealth)}</Text>
          </View>
        </View>

        {/* Scene narrative */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <LinearGradient colors={[gradient[0] + "33", gradient[1] + "11"]} style={[s.narrativeCard, { borderColor: gradient[0] + "44" }]}>
            <Text style={[s.narrativeTitle, { color: colors.text }]}>{scene?.title}</Text>
            <Text style={[s.narrativeText, { color: colors.textSecondary }]}>{scene?.narrative}</Text>
          </LinearGradient>

          {/* Choices */}
          <Text style={[s.choiceLabel, { color: colors.textMuted }]}>YOUR CHOICE</Text>
          <View style={{ gap: 10 }}>
            {scene?.choices.map((choice, idx) => (
              <TouchableOpacity key={idx} onPress={() => makeChoice(choice)} activeOpacity={0.8}>
                <View style={[s.choiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={s.choiceIcon}>{choice.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.choiceTitle, { color: colors.text }]}>{choice.label}</Text>
                    <Text style={[s.choiceSub, { color: colors.textMuted }]}>{choice.sub}</Text>
                  </View>
                  {choice.tag && (
                    <View style={[s.choiceTag, { backgroundColor: gradient[0] + "33" }]}>
                      <Text style={[s.choiceTagText, { color: gradient[0] }]}>{choice.tag}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Life log preview */}
        {log.length > 0 && (
          <View style={[s.miniLog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.miniLogLabel, { color: colors.textMuted }]}>📖 LIFE LOG</Text>
            {log.slice(-3).map((entry, i) => (
              <View key={i} style={s.miniLogRow}>
                <Text style={{ fontSize: 13 }}>{entry.icon}</Text>
                <Text style={[s.miniLogText, { color: colors.textSecondary }]} numberOfLines={1}>Age {entry.age}: {entry.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // Intro
  introFull: { flex: 1, position: "relative" },
  introOrb1: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "#e9456015", top: -100, right: -80 },
  introOrb2: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "#53348315", bottom: 100, left: -60 },
  closeBtn: { position: "absolute", right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  introContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 16 },
  introGlobe: { fontSize: 72 },
  introTitle: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 3 },
  introTagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", textAlign: "center" },
  introDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 22 },
  introFeatures: { gap: 10, alignSelf: "stretch" },
  introFeatureRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.08)", padding: 12, borderRadius: 12 },
  introFeatureIcon: { fontSize: 18 },
  introFeatureText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", flex: 1 },
  beginBtn: { alignSelf: "stretch" },
  beginBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 18, borderRadius: 18 },
  beginBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  // Birth
  birthBanner: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 32, paddingTop: 20, gap: 8 },
  birthEmoji: { fontSize: 60 },
  birthTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  birthSub: { fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)" },
  birthCard: { borderRadius: 16, borderWidth: 0.5, padding: 16, gap: 6 },
  birthCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  birthCardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  birthCardSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  birthChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  birthChipText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  parentRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  parentJob: { fontSize: 14, fontFamily: "Inter_500Medium" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },

  // Event
  eventBanner: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 32, gap: 8 },
  eventIcon: { fontSize: 56, marginTop: 10 },
  eventTypeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  eventTypeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 1 },
  eventTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  eventCard: { borderRadius: 16, borderWidth: 0.5, padding: 16, gap: 8 },
  eventNarrative: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },
  eventAge: { fontSize: 12, fontFamily: "Inter_400Regular" },
  impactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 12, borderWidth: 0.5 },
  impactLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  impactVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dismissBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16 },
  dismissBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },

  // Playing
  stageHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  stageLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)" },
  lifeProgress: { height: 3, width: 120, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  lifeProgressFill: { height: "100%", borderRadius: 2, backgroundColor: "#fff" },
  agePill: { backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  ageText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },

  statsPanel: { borderRadius: 16, borderWidth: 0.5, padding: 14, gap: 12 },
  wealthChip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 4 },
  wealthChipLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  wealthChipVal: { fontSize: 14, fontFamily: "Inter_700Bold" },

  narrativeCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 10, marginBottom: 14 },
  narrativeTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  narrativeText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  choiceLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 4 },
  choiceCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 0.5 },
  choiceIcon: { fontSize: 26 },
  choiceTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  choiceSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  choiceTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  choiceTagText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  miniLog: { borderRadius: 14, borderWidth: 0.5, padding: 12, gap: 8 },
  miniLogLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.7 },
  miniLogRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniLogText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Death
  deathBanner: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 32, paddingTop: 20, gap: 6 },
  deathEmoji: { fontSize: 56 },
  deathTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  deathAge: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  gradeCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, alignItems: "center", justifyContent: "center", marginTop: 8, backgroundColor: "rgba(0,0,0,0.3)" },
  gradeText: { fontSize: 32, fontFamily: "Inter_700Bold" },
  gradeLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
  wealthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 0.5, marginTop: 4 },
  wealthLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  wealthVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5 },
  tagText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  xpCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  xpText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  logRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  logAgeCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  logAgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  logText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  backCard: { padding: 14, borderRadius: 14, alignItems: "center", marginTop: 4 },
  backCardText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
