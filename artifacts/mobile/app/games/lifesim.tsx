import React, { useRef, useState } from "react";
import {
  Animated, Dimensions, Easing, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "@/lib/haptics";

const { width: W } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type StatKey = "health" | "education" | "happiness" | "wealth" | "reputation" | "fitness";

type Stats = {
  health: number;
  education: number;
  happiness: number;
  wealth: number;
  reputation: number;
  fitness: number;
};

type Choice = {
  icon: string;
  label: string;
  sub: string;
  effect: Partial<Record<StatKey, number>>;
  tag?: string;
  risky?: boolean;
  career?: string;
};

type Scene = {
  id: string;
  phase: Phase;
  age: number;
  title: string;
  narrative: string;
  choices: Choice[];
};

type LogEntry = { age: number; text: string; icon: string; type?: "good" | "bad" | "neutral" };
type Phase = "infant" | "child" | "teen" | "youngAdult" | "adult" | "midLife" | "elderly";
type GamePhase = "intro" | "birth" | "playing" | "event" | "death";

// ─── World Data ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  { name: "Nigeria",      flag: "🇳🇬", region: "West Africa",     wealthMod: 0.55, desc: "Vibrant culture, entrepreneurial spirit" },
  { name: "USA",          flag: "🇺🇸", region: "North America",   wealthMod: 1.6,  desc: "Land of opportunity and inequality" },
  { name: "India",        flag: "🇮🇳", region: "South Asia",      wealthMod: 0.75, desc: "Ancient civilisation, fast-growing economy" },
  { name: "Brazil",       flag: "🇧🇷", region: "South America",   wealthMod: 0.85, desc: "Vibrant, diverse, football-mad" },
  { name: "Germany",      flag: "🇩🇪", region: "Europe",          wealthMod: 1.45, desc: "Engineering excellence and social welfare" },
  { name: "Japan",        flag: "🇯🇵", region: "East Asia",       wealthMod: 1.35, desc: "Tradition meets technology" },
  { name: "Kenya",        flag: "🇰🇪", region: "East Africa",     wealthMod: 0.55, desc: "Natural beauty, growing tech hub" },
  { name: "Australia",   flag: "🇦🇺", region: "Oceania",         wealthMod: 1.45, desc: "High standard of living, outdoor culture" },
  { name: "Mexico",       flag: "🇲🇽", region: "Latin America",   wealthMod: 0.8,  desc: "Rich culture, complex economy" },
  { name: "UK",           flag: "🇬🇧", region: "Europe",          wealthMod: 1.4,  desc: "History, class, and opportunity" },
  { name: "South Africa", flag: "🇿🇦", region: "Southern Africa", wealthMod: 0.7,  desc: "Diverse, beautiful, and unequal" },
  { name: "Canada",       flag: "🇨🇦", region: "North America",   wealthMod: 1.4,  desc: "Multicultural, cold, and welcoming" },
  { name: "China",        flag: "🇨🇳", region: "East Asia",       wealthMod: 1.05, desc: "World's fastest-growing superpower" },
  { name: "France",       flag: "🇫🇷", region: "Europe",          wealthMod: 1.35, desc: "Art, fashion, and fine living" },
  { name: "Ghana",        flag: "🇬🇭", region: "West Africa",     wealthMod: 0.62, desc: "Stable democracy, welcoming culture" },
  { name: "Indonesia",    flag: "🇮🇩", region: "Southeast Asia",  wealthMod: 0.78, desc: "Island nation with enormous potential" },
  { name: "Pakistan",     flag: "🇵🇰", region: "South Asia",      wealthMod: 0.65, desc: "Young population, complex challenges" },
  { name: "Argentina",    flag: "🇦🇷", region: "South America",   wealthMod: 0.82, desc: "Passionate, talented, volatile economy" },
  { name: "Ethiopia",     flag: "🇪🇹", region: "East Africa",     wealthMod: 0.45, desc: "Ancient civilisation, rising fast" },
  { name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East",     wealthMod: 1.3,  desc: "Oil wealth meets modernisation" },
  { name: "UAE",          flag: "🇦🇪", region: "Middle East",     wealthMod: 1.55, desc: "Ambition built in the desert" },
  { name: "South Korea",  flag: "🇰🇷", region: "East Asia",       wealthMod: 1.3,  desc: "K-culture, tech innovation, pressure" },
  { name: "Turkey",       flag: "🇹🇷", region: "Eurasia",         wealthMod: 0.88, desc: "Bridge between East and West" },
  { name: "Egypt",        flag: "🇪🇬", region: "North Africa",    wealthMod: 0.65, desc: "Millennia of history, modern struggles" },
  { name: "Sweden",       flag: "🇸🇪", region: "Scandinavia",     wealthMod: 1.5,  desc: "Equality, innovation, long winters" },
  { name: "Singapore",    flag: "🇸🇬", region: "Southeast Asia",  wealthMod: 1.6,  desc: "City-state, ultra-efficient, expensive" },
  { name: "Colombia",     flag: "🇨🇴", region: "South America",   wealthMod: 0.78, desc: "Warmth, coffee, and resilience" },
  { name: "Philippines",  flag: "🇵🇭", region: "Southeast Asia",  wealthMod: 0.7,  desc: "Island people, strong family values" },
  { name: "Morocco",      flag: "🇲🇦", region: "North Africa",    wealthMod: 0.68, desc: "Crossroads of Africa and Europe" },
  { name: "New Zealand",  flag: "🇳🇿", region: "Oceania",         wealthMod: 1.38, desc: "Stunning nature, relaxed lifestyle" },
];

const FAMILY_TYPES = [
  { label: "Destitute",    wealth: 200,    desc: "No running water. Survival is the priority.", color: "#8B0000", icon: "🏚️", edu: -10, health: -10 },
  { label: "Poor",         wealth: 1200,   desc: "Your family struggles every month to pay bills.", color: "#FF3B30", icon: "🛖",  edu: -5,  health: -5  },
  { label: "Working Class",wealth: 8000,   desc: "Hard-working parents, modest but honest home.", color: "#FF6B35", icon: "🏠",  edu: 0,   health: 0   },
  { label: "Middle Class", wealth: 35000,  desc: "Comfortable life, good schools, family holidays.", color: "#007AFF", icon: "🏡",  edu: 10,  health: 5   },
  { label: "Upper Middle", wealth: 120000, desc: "Private school, strong network, ambitious parents.", color: "#5856D6", icon: "🏘️",  edu: 18,  health: 8   },
  { label: "Wealthy",      wealth: 400000, desc: "Old money, elite schools, connections everywhere.", color: "#AF52DE", icon: "🏰",  edu: 25,  health: 10  },
  { label: "Ultra-Rich",   wealth: 2000000,desc: "Born into the 1%. The world already knows your family.", color: "#FFD700", icon: "🏯",  edu: 30,  health: 12  },
];

const PARENT_JOBS = [
  "Doctor", "Teacher", "Farmer", "Software Engineer", "Trader", "Civil Servant",
  "Nurse", "Entrepreneur", "Police Officer", "Truck Driver", "Lawyer", "Accountant",
  "Mechanic", "Chef", "Journalist", "Architect", "Military Officer", "Banker",
  "Artist", "Pastor", "Politician", "Security Guard", "Factory Worker", "Pilot",
];

const CAREERS = [
  { name: "Doctor", icon: "💊", income: 180000, rep: 25 },
  { name: "Engineer", icon: "💻", income: 120000, rep: 15 },
  { name: "Lawyer", icon: "⚖️", income: 150000, rep: 20 },
  { name: "Teacher", icon: "🎓", income: 45000, rep: 20 },
  { name: "Artist", icon: "🎨", income: 35000, rep: 15 },
  { name: "Entrepreneur", icon: "🚀", income: 80000, rep: 18 },
  { name: "Politician", icon: "🏛️", income: 70000, rep: 30 },
  { name: "Athlete", icon: "⚽", income: 60000, rep: 25 },
  { name: "Musician", icon: "🎵", income: 40000, rep: 20 },
  { name: "Scientist", icon: "🔬", income: 95000, rep: 22 },
  { name: "Banker", icon: "🏦", income: 160000, rep: 12 },
  { name: "Journalist", icon: "📰", income: 55000, rep: 18 },
  { name: "Skilled Tradesperson", icon: "🔧", income: 65000, rep: 12 },
  { name: "Civil Servant", icon: "🏢", income: 50000, rep: 15 },
  { name: "Pilot", icon: "✈️", income: 130000, rep: 20 },
  { name: "Chef", icon: "👨‍🍳", income: 45000, rep: 12 },
  { name: "Farmer", icon: "🌾", income: 30000, rep: 8 },
];

const PHASE_GRADIENTS: Record<Phase, [string, string]> = {
  infant:     ["#667eea", "#764ba2"],
  child:      ["#0b8a6e", "#22c580"],
  teen:       ["#d4830a", "#f5b942"],
  youngAdult: ["#c23152", "#e94560"],
  adult:      ["#0f3460", "#1a5276"],
  midLife:    ["#2c3e50", "#3b7dd8"],
  elderly:    ["#3d4349", "#5a6672"],
};

const PHASE_LABELS: Record<Phase, string> = {
  infant:     "Infancy  •  Age 0–2",
  child:      "Childhood  •  Age 3–12",
  teen:       "Teenage Years  •  Age 13–17",
  youngAdult: "Young Adult  •  Age 18–27",
  adult:      "Adulthood  •  Age 28–47",
  midLife:    "Mid-Life  •  Age 48–62",
  elderly:    "Golden Years  •  Age 63+",
};

// ─── Random Events Pool ───────────────────────────────────────────────────────

const RANDOM_EVENTS = [
  // Health
  { title: "Serious Illness",        text: "You were hospitalised for weeks. Recovery was slow and costly.",              icon: "🏥", effect: { health: -18, wealth: -6000,  happiness: -10 }, type: "bad"     },
  { title: "Health Breakthrough",    text: "You completed a 90-day fitness challenge and feel incredible.",               icon: "💪", effect: { health: 20,  fitness: 15,    happiness: 12  }, type: "good"    },
  { title: "Road Accident",          text: "A collision left you injured and off work for two months.",                   icon: "🚑", effect: { health: -22, wealth: -8000                 }, type: "bad"     },
  { title: "Mental Health Reset",    text: "Therapy and mindfulness transformed your outlook on life.",                   icon: "🧘", effect: { happiness: 22, health: 10                 }, type: "good"    },
  // Wealth
  { title: "Inheritance Arrived",    text: "A distant relative passed and left you money you didn't expect.",            icon: "💰", effect: { wealth: 18000, happiness: 10               }, type: "good"    },
  { title: "Investment Explodes",    text: "A stock you forgot about 5x'd overnight.",                                   icon: "📈", effect: { wealth: 45000, happiness: 15               }, type: "good"    },
  { title: "Scammed",                text: "You fell victim to an elaborate financial fraud and lost savings.",           icon: "😱", effect: { wealth: -12000, happiness: -15             }, type: "bad"     },
  { title: "Market Crash",           text: "A global recession wiped out a significant chunk of your portfolio.",        icon: "📉", effect: { wealth: -20000, happiness: -12             }, type: "bad"     },
  { title: "Side Hustle Wins",       text: "A small project you started for fun is now generating serious income.",      icon: "🚀", effect: { wealth: 25000, reputation: 8               }, type: "good"    },
  { title: "Tax Audit",              text: "The government flagged your returns. You paid penalties after months of stress.", icon: "📋", effect: { wealth: -9000, happiness: -10         }, type: "bad"     },
  // Reputation
  { title: "Viral Moment",           text: "Something you said or did spread globally. You became famous overnight.",    icon: "📱", effect: { reputation: 22, happiness: 12              }, type: "good"    },
  { title: "Public Scandal",         text: "A private matter became very public. Your name took a serious hit.",         icon: "😤", effect: { reputation: -20, happiness: -15            }, type: "bad"     },
  { title: "Community Hero",         text: "You helped during a local crisis. The community won't forget it.",           icon: "🦸", effect: { reputation: 18, happiness: 15              }, type: "good"    },
  { title: "Workplace Conflict",     text: "A dispute at work escalated and damaged your professional relationships.",   icon: "😠", effect: { reputation: -12, happiness: -10            }, type: "bad"     },
  // Social
  { title: "Reconnected with Family",text: "You repaired a broken relationship. The weight lifted from your shoulders.", icon: "👨‍👩‍👧", effect: { happiness: 18, health: 8                  }, type: "good"    },
  { title: "Close Friend Passes",    text: "You lost someone very dear. Grief reshaped your perspective on life.",       icon: "💔", effect: { happiness: -18, health: -8, reputation: 5 }, type: "bad"     },
  { title: "New Circle Found",       text: "You met a group of driven, inspiring people who push you to be better.",    icon: "🤝", effect: { happiness: 14, reputation: 10, education: 5 }, type: "good"   },
  { title: "Betrayed by a Friend",   text: "Someone you trusted deeply let you down in the worst way.",                 icon: "🗡️", effect: { happiness: -15, reputation: -8             }, type: "bad"     },
  // Career
  { title: "Unexpected Promotion",   text: "Your boss recognised your efforts and fast-tracked your promotion.",        icon: "🏆", effect: { wealth: 15000, reputation: 15, happiness: 12 }, type: "good"  },
  { title: "Laid Off",               text: "Company restructuring. You weren't safe despite years of loyalty.",         icon: "📦", effect: { wealth: -8000, happiness: -18, health: -8 }, type: "bad"     },
  { title: "Dream Project Offered",  text: "You were hand-picked to lead a game-changing initiative.",                  icon: "⭐", effect: { reputation: 18, happiness: 15, education: 8 }, type: "good"  },
  { title: "Business Partnership",   text: "A trusted contact brought you into a deal that paid off handsomely.",      icon: "🤝", effect: { wealth: 30000, reputation: 10              }, type: "good"    },
  // Life events
  { title: "Natural Disaster",       text: "Your region was hit by a devastating event. Recovery took years.",          icon: "🌪️", effect: { wealth: -15000, health: -10, happiness: -12 }, type: "bad"   },
  { title: "Award or Honour",        text: "A national body recognised your contribution to society.",                  icon: "🎖️", effect: { reputation: 25, happiness: 18              }, type: "good"    },
  { title: "Spiritual Awakening",    text: "A profound experience reset your values and brought deep peace.",           icon: "✨", effect: { happiness: 20, health: 8, reputation: 5   }, type: "good"    },
  { title: "Robbery",                text: "Your home or car was broken into. Possessions and peace of mind stolen.",  icon: "🔓", effect: { wealth: -5000, happiness: -14, health: -5  }, type: "bad"     },
  { title: "Emigrated Successfully", text: "You moved abroad and found the life upgrade you were hoping for.",          icon: "🌍", effect: { wealth: 20000, happiness: 15, reputation: 8 }, type: "good"  },
];

// ─── Full Scene List (22 decisions) ───────────────────────────────────────────

const SCENES: Scene[] = [

  // ── INFANCY ─────────────────────────────────────────────────────────────────
  {
    id: "infant_nurture", phase: "infant", age: 2,
    title: "Your First Two Years",
    narrative: "You are a baby. You cannot talk yet, but you feel and absorb everything. Your parents shower you with attention. Already, tiny patterns are forming that will define you.",
    choices: [
      { icon: "👁️", label: "Curious & alert",      sub: "Always watching, always absorbing.", effect: { education: 8, happiness: 5 } },
      { icon: "😂", label: "Happy & playful",       sub: "Joyful energy from day one.",        effect: { happiness: 12, health: 8 } },
      { icon: "💪", label: "Strong & determined",   sub: "Stubborn. Already have opinions.",   effect: { fitness: 10, health: 6 } },
    ],
  },

  // ── CHILDHOOD ───────────────────────────────────────────────────────────────
  {
    id: "child_nursery", phase: "child", age: 4,
    title: "Nursery School",
    narrative: "You are 4 and attending nursery. The teacher watches how you interact. Some children fight over toys. Some share. Some sit alone and build. Which one are you?",
    choices: [
      { icon: "🧱", label: "Build alone, quietly",  sub: "Creative, independent thinker.",    effect: { education: 6, happiness: 5 } },
      { icon: "🤝", label: "Share and collaborate", sub: "Natural leader, good social skills.", effect: { reputation: 8, happiness: 10 } },
      { icon: "👊", label: "Fight for what's yours", sub: "Competitive. Wins but rubs people wrong.", effect: { fitness: 5, happiness: 3, reputation: -3 } },
    ],
  },
  {
    id: "child_school", phase: "child", age: 8,
    title: "Primary School",
    narrative: "You are 8. School is in full swing — reading, maths, and the first real tests. Some days you love it. Some days are hard. How do you approach school?",
    choices: [
      { icon: "📚", label: "Work hard, get top marks", sub: "Discipline now, rewards later.",      effect: { education: 20, happiness: -5 }, tag: "Scholar" },
      { icon: "⚽", label: "Sports star of the class",  sub: "Active, popular, decent grades.",    effect: { fitness: 18, health: 12, happiness: 10, education: 4, reputation: 6 }, tag: "Athlete" },
      { icon: "🎨", label: "Art, music & creativity",   sub: "Expressive, unique, passionate.",    effect: { happiness: 14, reputation: 6, education: 8 } },
      { icon: "🤹", label: "Class clown & social hub",  sub: "Popular but distracted.",            effect: { happiness: 18, reputation: 10, education: -5 } },
    ],
  },
  {
    id: "child_home", phase: "child", age: 11,
    title: "Home Life",
    narrative: "Something is off at home. Money is tighter than usual. Your parents argue quietly after bedtime. You notice. At 11, you face a choice about how to respond.",
    choices: [
      { icon: "🛡️", label: "Protect your siblings", sub: "Step up. Mature beyond your years.",   effect: { reputation: 10, happiness: -5, health: -3 }, tag: "Protector" },
      { icon: "📖", label: "Escape into books",     sub: "Knowledge as refuge.",                  effect: { education: 12, happiness: 5 } },
      { icon: "💰", label: "Start earning small",   sub: "Chores, errands, first income.",        effect: { wealth: 800, education: -4, happiness: 5 } },
      { icon: "😞", label: "Struggle quietly alone",sub: "Bottled up. Shapes who you become.",    effect: { happiness: -10, health: -5, education: -3 } },
    ],
  },

  // ── TEEN ────────────────────────────────────────────────────────────────────
  {
    id: "teen_identity", phase: "teen", age: 13,
    title: "Finding Your Identity",
    narrative: "You are 13 and everything is changing — body, mind, how others see you. Secondary school is a different world. Who do you want to be here?",
    choices: [
      { icon: "📖", label: "The academic one",     sub: "Grades first. Peers respect but don't always like.", effect: { education: 18, happiness: -5 } },
      { icon: "🎸", label: "The creative one",     sub: "Music, art, drama — a small tribe who gets it.",     effect: { happiness: 16, reputation: 10, education: 5 } },
      { icon: "🏃", label: "The sports one",       sub: "Team, medals, recognition.",                         effect: { fitness: 20, health: 15, reputation: 12 }, tag: "Athlete" },
      { icon: "💼", label: "The hustler",           sub: "Already thinking about money.",                     effect: { wealth: 2500, education: -5, reputation: 6 } },
    ],
  },
  {
    id: "teen_exams", phase: "teen", age: 15,
    title: "Critical Exams",
    narrative: "Your most important school exams are in three months. The results will open or close many doors. How do you prepare?",
    choices: [
      { icon: "🔥", label: "Lock in — full revision",       sub: "Sacrifice social life for results.",   effect: { education: 22, happiness: -10 } },
      { icon: "⚖️", label: "Balance study and social life", sub: "Decent results, maintained friendships.", effect: { education: 12, happiness: 8 } },
      { icon: "🎮", label: "Barely prepare",                sub: "Regret it later. Doors close.",        effect: { education: -8, happiness: 10, wealth: -2000 } },
    ],
  },
  {
    id: "teen_trouble", phase: "teen", age: 16,
    title: "A Crossroads Moment",
    narrative: "Older boys in your area offer you a way to make easy money. It is clearly illegal. You also have a friend in deep trouble who desperately needs your help.",
    choices: [
      { icon: "🚫", label: "Refuse. Walk away clean",         sub: "Hard, but right.",                      effect: { reputation: 8, happiness: 5 } },
      { icon: "🤝", label: "Help your friend, not the crime", sub: "Loyal. Costs you time and energy.",     effect: { happiness: 12, wealth: -500, reputation: 10 } },
      { icon: "😈", label: "Take the illegal money",          sub: "Easy cash. Serious risk.", risky: true,  effect: { wealth: 6000, reputation: -18, health: -8 }, tag: "Criminal Record" },
      { icon: "📵", label: "Mind your own business",          sub: "Safe, but you'll wonder later.",        effect: { happiness: -5 } },
    ],
  },
  {
    id: "teen_romance", phase: "teen", age: 17,
    title: "First Relationship",
    narrative: "You meet someone who makes your heart race. It is your first serious relationship. How do you handle it?",
    choices: [
      { icon: "❤️", label: "Dive in fully",           sub: "Intense, beautiful, consuming.",          effect: { happiness: 20, education: -8 } },
      { icon: "🤝", label: "Balanced — love & study", sub: "You find a way to do both.",              effect: { happiness: 12, education: 5 } },
      { icon: "📚", label: "Not now — focus on school",sub: "Discipline wins. Loneliness stings.",    effect: { education: 10, happiness: -8 } },
    ],
  },

  // ── YOUNG ADULT ─────────────────────────────────────────────────────────────
  {
    id: "ya_path", phase: "youngAdult", age: 18,
    title: "After School: What Next?",
    narrative: "You have just finished secondary school. The path ahead is wide open. This single decision will reshape the next decade of your life. Choose wisely.",
    choices: [
      { icon: "🎓", label: "University",              sub: "4 years. Large investment. Large returns.",    effect: { education: 28, wealth: -30000 }, tag: "Graduate" },
      { icon: "🔧", label: "Vocational / Trade",      sub: "Skills in 18 months. Employed quickly.",      effect: { education: 14, wealth: -4000 }, tag: "Skilled Trade" },
      { icon: "🏢", label: "Enter the workforce now", sub: "Earn immediately. Learn on the job.",         effect: { wealth: 18000, education: -5 } },
      { icon: "✈️", label: "Travel & explore the world", sub: "Experience over money. Perspective gained.", effect: { happiness: 22, reputation: 8, education: 5, wealth: -9000 } },
      { icon: "⚽", label: "Pursue sport / art professionally", sub: "High passion. Uncertain income.", effect: { fitness: 18, happiness: 20, wealth: -3000, reputation: 8 }, tag: "Performer" },
    ],
  },
  {
    id: "ya_first_job", phase: "youngAdult", age: 21,
    title: "First Real Job",
    narrative: "You land your first proper job. The workplace is nothing like you imagined. Your boss is demanding, some colleagues are territorial. How do you play it?",
    choices: [
      { icon: "🌟", label: "Outwork everyone",         sub: "Long hours. Noticed fast. Promoted.",        effect: { wealth: 12000, reputation: 12, health: -5, happiness: -8 } },
      { icon: "🤗", label: "Network and build allies", sub: "Relationships open doors no CV can.",        effect: { reputation: 18, happiness: 10, wealth: 5000 } },
      { icon: "⚖️", label: "Do the job, keep balance", sub: "Stable. Respected. Decent progression.",    effect: { wealth: 8000, happiness: 12 } },
      { icon: "🚪", label: "Quit and find better",     sub: "Bold. May take time to land something.",    effect: { wealth: -5000, happiness: -5, education: 5 } },
    ],
  },
  {
    id: "ya_career", phase: "youngAdult", age: 24,
    title: "Career Direction",
    narrative: "You are 24 and it is time to get serious about your career. What field do you commit to?",
    choices: [
      { icon: "🏥", label: "Medicine / Healthcare",       sub: "Life-saving work. Demanding but noble.",  effect: { education: 18, reputation: 22, wealth: -8000  }, career: "Doctor",      tag: "Doctor" },
      { icon: "💻", label: "Technology & Engineering",    sub: "Future-proof, well-paid, global.",        effect: { education: 12, wealth: 22000, reputation: 10 }, career: "Engineer",    tag: "Engineer" },
      { icon: "⚖️", label: "Law",                        sub: "Power and complexity. High stakes.",      effect: { education: 15, reputation: 20, wealth: 10000 }, career: "Lawyer",      tag: "Lawyer" },
      { icon: "🎨", label: "Creative / Arts",             sub: "Passion-led. Income is variable.",        effect: { happiness: 22, reputation: 12, wealth: 4000  }, career: "Artist" },
      { icon: "📰", label: "Journalism / Media",          sub: "Truth-telling. Recognition. Adventure.",  effect: { reputation: 18, happiness: 15, wealth: 6000  }, career: "Journalist" },
      { icon: "🚀", label: "Start a business",            sub: "Highest risk. Highest ceiling.", risky: true, effect: { wealth: -6000, happiness: 14, reputation: 8 }, career: "Entrepreneur", tag: "Founder" },
    ],
  },
  {
    id: "ya_relocation", phase: "youngAdult", age: 26,
    title: "Stay or Go?",
    narrative: "You receive a life-changing opportunity to move to a major global city or another country entirely. Your roots are here, but the world is calling.",
    choices: [
      { icon: "🌍", label: "Move abroad — chase the dream", sub: "Brave. Lonely at first. Worth it.",     effect: { wealth: 30000, happiness: 10, reputation: 10 }, tag: "Immigrant" },
      { icon: "🏙️", label: "Relocate within your country",  sub: "New chapter, familiar context.",         effect: { wealth: 12000, happiness: 8 } },
      { icon: "🏠", label: "Stay — roots matter",           sub: "Community, family, stability.",          effect: { happiness: 14, reputation: 8, wealth: 5000 } },
    ],
  },

  // ── ADULT ────────────────────────────────────────────────────────────────────
  {
    id: "adult_love", phase: "adult", age: 29,
    title: "Love & Marriage",
    narrative: "You are 29. A long-term partner is in your life. The conversation around commitment and possibly children has started. What is your path?",
    choices: [
      { icon: "💍", label: "Marry and start a family",    sub: "Commitment. Joy. Responsibility.",      effect: { happiness: 22, wealth: -10000, reputation: 12 }, tag: "Married" },
      { icon: "🤗", label: "Together but not married",    sub: "Modern and flexible.",                   effect: { happiness: 14, wealth: -3000 } },
      { icon: "🧘", label: "Focus on yourself first",     sub: "Career before family. For now.",         effect: { wealth: 14000, education: 6, happiness: 5 } },
      { icon: "💔", label: "End it — not the right one",  sub: "Honest but painful.",                    effect: { happiness: -10, wealth: 5000, reputation: -4 } },
    ],
  },
  {
    id: "adult_property", phase: "adult", age: 33,
    title: "Where Do You Live?",
    narrative: "You have been renting for years. The property question is serious now. Your next decision will affect your financial future significantly.",
    choices: [
      { icon: "🏠", label: "Buy a home",              sub: "Major commitment. Builds equity over time.", effect: { wealth: -20000, reputation: 10, happiness: 14 }, tag: "Home Owner" },
      { icon: "🏗️", label: "Invest in rental property", sub: "Wealth-building strategy.",              effect: { wealth: -35000, reputation: 8 } },
      { icon: "🏙️", label: "Stay renting, invest rest", sub: "Flexibility. Keep cash working.",         effect: { wealth: 18000, happiness: 8 } },
    ],
  },
  {
    id: "adult_finance", phase: "adult", age: 36,
    title: "Building Wealth",
    narrative: "You are 36 and in your earning prime. The financial decisions you make this decade will define your 50s and 60s. What is your strategy?",
    choices: [
      { icon: "📈", label: "Stocks, crypto & investments", sub: "Risk it for the biscuit.",           effect: { wealth: 55000, happiness: -5 }, tag: "Investor" },
      { icon: "🏗️", label: "Build a business empire",     sub: "Multiple income streams.", risky: true, effect: { wealth: 40000, health: -8, happiness: 10, reputation: 15 } },
      { icon: "💰", label: "Aggressively save & invest",   sub: "FIRE strategy. Delayed gratification.", effect: { wealth: 30000, happiness: -3 } },
      { icon: "✈️", label: "Live well, spend well",        sub: "You only live once.",                 effect: { happiness: 22, wealth: -15000 } },
    ],
  },
  {
    id: "adult_health", phase: "adult", age: 40,
    title: "Your Health at 40",
    narrative: "A health check delivers some uncomfortable news. Your doctor says your lifestyle is catching up with you. What do you do about it?",
    choices: [
      { icon: "🏃", label: "Complete lifestyle overhaul",   sub: "Diet, gym, sleep, mindset.",         effect: { health: 28, fitness: 20, happiness: 10, wealth: -3000 } },
      { icon: "💊", label: "Medication and monitoring",     sub: "Managed. Not fixed.",                effect: { health: 10, wealth: -5000 } },
      { icon: "😤", label: "Ignore it — too busy for this", sub: "Short-term gain. Long-term cost.",   effect: { health: -22, happiness: 8 } },
    ],
  },
  {
    id: "adult_crisis", phase: "adult", age: 44,
    title: "A Moral Test",
    narrative: "You discover your employer is involved in serious wrongdoing — fraud, exploitation, or worse. You have evidence. What do you do?",
    choices: [
      { icon: "📣", label: "Blow the whistle",         sub: "Right thing. Career-ending risk.",        effect: { reputation: 30, wealth: -20000, happiness: -5 }, tag: "Whistleblower" },
      { icon: "🤫", label: "Stay quiet, protect income", sub: "Complicit but safe.",                  effect: { wealth: 10000, reputation: -15, happiness: -12 } },
      { icon: "🚪", label: "Quietly resign and move on", sub: "Self-preservation. Clean exit.",       effect: { wealth: -5000, reputation: 5, happiness: 5 } },
    ],
  },

  // ── MID-LIFE ─────────────────────────────────────────────────────────────────
  {
    id: "midlife_peak", phase: "midLife", age: 50,
    title: "Peak or Pivot?",
    narrative: "You are 50. You are either at your career peak or staring at a wall wondering what comes next. A defining choice arrives.",
    choices: [
      { icon: "📊", label: "Double down — go for the top",  sub: "Peak income. Real pressure.",        effect: { wealth: 75000, reputation: 22, health: -12 } },
      { icon: "🧑‍🏫", label: "Mentor and lead others",      sub: "Legacy over salary.",                effect: { reputation: 25, happiness: 18 } },
      { icon: "🔄", label: "Pivot — completely reinvent",   sub: "Scary. Electrifying. Possible.",     effect: { happiness: 20, wealth: -8000, reputation: 10 }, tag: "Reinvented" },
      { icon: "🏡", label: "Step back. Family first.",      sub: "Trade income for presence.",         effect: { happiness: 22, wealth: -15000 } },
    ],
  },
  {
    id: "midlife_community", phase: "midLife", age: 54,
    title: "Giving Back",
    narrative: "You have experience, money, and influence. People in your community are struggling. What role do you play?",
    choices: [
      { icon: "🏫", label: "Fund a school or scholarship",  sub: "Enduring impact on young lives.",    effect: { reputation: 28, happiness: 18, wealth: -25000 } },
      { icon: "🏛️", label: "Enter local politics",          sub: "Power to change things directly.",   effect: { reputation: 22, happiness: 10, wealth: -5000 }, tag: "Politician" },
      { icon: "🌳", label: "Environmental legacy",          sub: "Long after you're gone.",             effect: { happiness: 20, reputation: 15, wealth: -10000 } },
      { icon: "💼", label: "Focus on your own empire",      sub: "Business above all else.",            effect: { wealth: 40000, reputation: 8 } },
    ],
  },
  {
    id: "midlife_faith", phase: "midLife", age: 58,
    title: "Meaning & Reflection",
    narrative: "At 58, you find yourself asking the big questions. What is life for? How are you living? You feel a need to anchor yourself to something.",
    choices: [
      { icon: "🙏", label: "Faith & spirituality",         sub: "Deeper meaning. Community.",           effect: { happiness: 20, health: 8, reputation: 8 } },
      { icon: "🎭", label: "Art, culture & creativity",    sub: "Express what you've lived.",            effect: { happiness: 22, reputation: 12 } },
      { icon: "🧠", label: "Philosophy & lifelong learning", sub: "The examined life.",                 effect: { education: 15, happiness: 14 } },
      { icon: "👨‍👩‍👧‍👦", label: "Family is everything",       sub: "Grandchildren, memory-making.",     effect: { happiness: 25, health: 5 } },
    ],
  },

  // ── ELDERLY ──────────────────────────────────────────────────────────────────
  {
    id: "elderly_retire", phase: "elderly", age: 63,
    title: "Retirement",
    narrative: "You have worked your whole life. The time has come. But retirement is not an ending — it is the final chapter. How do you write it?",
    choices: [
      { icon: "✈️", label: "Travel every continent",       sub: "The bucket list. All of it.",           effect: { happiness: 28, wealth: -35000, health: 8 } },
      { icon: "📖", label: "Write, teach, pass on wisdom", sub: "Leave intellectual legacy.",            effect: { happiness: 20, reputation: 18, education: 8 } },
      { icon: "🌾", label: "Simple rural peace",           sub: "Garden, nature, silence.",              effect: { happiness: 22, health: 14, wealth: -6000 } },
      { icon: "🏢", label: "Start one final business",     sub: "Can't stop creating. Won't stop.", risky: true, effect: { wealth: 50000, happiness: 15, health: -10 } },
    ],
  },
  {
    id: "elderly_health", phase: "elderly", age: 68,
    title: "Health in Old Age",
    narrative: "Your body is slowing. Some things that were easy are now hard. How you treat your body now determines your final years.",
    choices: [
      { icon: "🏊", label: "Active — daily movement",    sub: "Swim, walk, stretch. Every single day.",  effect: { health: 20, fitness: 15, happiness: 12 } },
      { icon: "🧑‍⚕️", label: "Doctors & careful management", sub: "Monitor everything. Stay proactive.", effect: { health: 14, wealth: -8000 } },
      { icon: "🛋️", label: "Rest and take it easy",     sub: "Comfortable but gradual decline.",         effect: { happiness: 10, health: -8 } },
    ],
  },
  {
    id: "elderly_legacy", phase: "elderly", age: 73,
    title: "Your Final Gift",
    narrative: "You feel your time winding down. One last great act to shape what you leave behind. What does the world remember you for?",
    choices: [
      { icon: "🎓", label: "Endow a scholarship",          sub: "Hundreds of futures shaped by yours.",  effect: { reputation: 32, happiness: 22, wealth: -50000 } },
      { icon: "📜", label: "Write your autobiography",     sub: "Your truth, your story, forever.",      effect: { reputation: 24, happiness: 26 } },
      { icon: "❤️", label: "Everything to family",         sub: "Generational wealth begins with you.",  effect: { happiness: 30, wealth: -60000, reputation: 14 } },
      { icon: "🏗️", label: "Build something for community",sub: "A hospital wing. A park. A monument.", effect: { reputation: 35, happiness: 20, wealth: -80000 }, tag: "Community Builder" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

function fmtWealth(w: number) {
  if (w >= 1_000_000) return `$${(w / 1_000_000).toFixed(2)}M`;
  if (w >= 1_000)     return `$${(w / 1_000).toFixed(0)}K`;
  return `$${w}`;
}

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const { colors } = useTheme();
  const pct = clamp(value);
  return (
    <View style={sb.wrap}>
      <View style={sb.row}>
        <Text style={sb.emoji}>{icon}</Text>
        <Text style={[sb.label, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[sb.val, { color }]}>{Math.round(value)}</Text>
      </View>
      <View style={[sb.track, { backgroundColor: colors.border }]}>
        <View style={[sb.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap:  { gap: 5 },
  row:   { flexDirection: "row", alignItems: "center", gap: 6 },
  emoji: { fontSize: 14, width: 20 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  val:   { fontSize: 13, fontFamily: "Inter_700Bold" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill:  { height: "100%", borderRadius: 4 },
});

// ─── Main Game ────────────────────────────────────────────────────────────────

export default function LifeSimGame() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [gamePhase, setGamePhase]       = useState<GamePhase>("intro");
  const [sceneIndex, setSceneIndex]     = useState(0);
  const [stats, setStats]               = useState<Stats>({ health: 80, education: 10, happiness: 60, wealth: 0, reputation: 10, fitness: 50 });
  const [age, setAge]                   = useState(0);
  const [log, setLog]                   = useState<LogEntry[]>([]);
  const [country, setCountry]           = useState(COUNTRIES[0]);
  const [family, setFamily]             = useState(FAMILY_TYPES[2]);
  const [parentJobA, setParentJobA]     = useState("Teacher");
  const [parentJobB, setParentJobB]     = useState("Nurse");
  const [tags, setTags]                 = useState<string[]>([]);
  const [career, setCareer]             = useState<string | null>(null);
  const [xpEarned, setXpEarned]         = useState(0);
  const [currentEvent, setCurrentEvent] = useState<typeof RANDOM_EVENTS[0] | null>(null);
  const [usedEventIds, setUsedEventIds] = useState<Set<number>>(new Set());

  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const scene    = SCENES[sceneIndex];
  const gradient: [string, string] = scene ? PHASE_GRADIENTS[scene.phase] : ["#1a1a2e", "#16213e"];

  // ── Animate transition ──────────────────────────────────────────────────────

  function animateNext(fn: () => void) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(slideAnim, { toValue: -24, duration: 180, useNativeDriver: Platform.OS !== "web" }),
    ]).start(() => {
      fn();
      slideAnim.setValue(24);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(slideAnim, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
      ]).start();
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 80);
    });
  }

  // ── Apply stat effects ──────────────────────────────────────────────────────

  function applyEffect(effect: Partial<Record<StatKey, number>>, base: Stats): Stats {
    return {
      health:     clamp(base.health     + (effect.health     || 0)),
      education:  clamp(base.education  + (effect.education  || 0)),
      happiness:  clamp(base.happiness  + (effect.happiness  || 0)),
      wealth:     Math.max(0, base.wealth + (effect.wealth   || 0)),
      reputation: clamp(base.reputation + (effect.reputation || 0)),
      fitness:    clamp(base.fitness    + (effect.fitness    || 0)),
    };
  }

  // ── Start / reset game ──────────────────────────────────────────────────────

  function startGame() {
    const c = rand(COUNTRIES);
    const roll = Math.random();
    const f = roll < 0.10 ? FAMILY_TYPES[0]
            : roll < 0.22 ? FAMILY_TYPES[1]
            : roll < 0.45 ? FAMILY_TYPES[2]
            : roll < 0.70 ? FAMILY_TYPES[3]
            : roll < 0.87 ? FAMILY_TYPES[4]
            : roll < 0.96 ? FAMILY_TYPES[5]
            : FAMILY_TYPES[6];

    const startWealth = Math.round(f.wealth * (0.75 + Math.random() * 0.5) * c.wealthMod);
    const startEdu    = clamp(10 + f.edu);
    const startHealth = clamp(78 + f.health);

    setCountry(c);
    setFamily(f);
    setParentJobA(rand(PARENT_JOBS));
    setParentJobB(rand(PARENT_JOBS));
    setStats({ health: startHealth, education: startEdu, happiness: 62, wealth: startWealth, reputation: 5, fitness: 50 });
    setAge(0);
    setLog([{ age: 0, icon: "👶", text: `Born in ${c.name} (${c.region}) into a ${f.label} family`, type: "neutral" }]);
    setTags([]);
    setCareer(null);
    setXpEarned(0);
    setSceneIndex(0);
    setUsedEventIds(new Set());
    setCurrentEvent(null);
    setGamePhase("birth");
  }

  function beginPlaying() {
    animateNext(() => {
      setAge(SCENES[0].age);
      setGamePhase("playing");
    });
  }

  // ── Make a choice ───────────────────────────────────────────────────────────

  function makeChoice(choice: Choice) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newStats  = applyEffect(choice.effect, stats);
    const newAge    = scene.age;
    const xpGain    = Math.floor(Math.random() * 18) + 8;
    const newTags   = choice.tag ? [...tags.filter((t) => t !== choice.tag), choice.tag] : tags;
    const newCareer = choice.career || career;
    const newLog: LogEntry = {
      age: newAge, icon: choice.icon,
      text: `${choice.label} — ${choice.sub}`,
      type: choice.risky ? "bad" : "neutral",
    };

    // Pick a fresh random event (no repeat)
    const available = RANDOM_EVENTS.map((e, i) => ({ e, i })).filter(({ i }) => !usedEventIds.has(i));
    const fireEvent = Math.random() < 0.45 && available.length > 0;
    const pickedEvt = fireEvent ? rand(available) : null;

    animateNext(() => {
      setStats(newStats);
      setAge(newAge);
      setXpEarned((x) => x + xpGain);
      setLog((l) => [...l, newLog]);
      setTags(newTags);
      setCareer(newCareer);

      if (pickedEvt) {
        setUsedEventIds((prev) => new Set([...prev, pickedEvt.i]));
        setCurrentEvent(pickedEvt.e);
        setGamePhase("event");
      } else {
        const next = sceneIndex + 1;
        if (next >= SCENES.length) setGamePhase("death");
        else setSceneIndex(next);
      }
    });
  }

  // ── Dismiss event ───────────────────────────────────────────────────────────

  function dismissEvent() {
    if (!currentEvent) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newStats = applyEffect(currentEvent.effect as any, stats);
    const evLog: LogEntry = {
      age, icon: currentEvent.icon, text: currentEvent.title,
      type: currentEvent.type as "good" | "bad" | "neutral",
    };
    animateNext(() => {
      setStats(newStats);
      setLog((l) => [...l, evLog]);
      setCurrentEvent(null);
      const next = sceneIndex + 1;
      if (next >= SCENES.length) setGamePhase("death");
      else { setSceneIndex(next); setGamePhase("playing"); }
    });
  }

  // ── Life grade ──────────────────────────────────────────────────────────────

  function lifeGrade() {
    const wealthScore = Math.min(100, stats.wealth / 15000);
    const avg = (stats.health + stats.education + stats.happiness + stats.reputation + stats.fitness + wealthScore) / 6;
    if (avg >= 78) return { grade: "S", label: "Legendary Life",    emoji: "🏆", color: "#FFD700" };
    if (avg >= 64) return { grade: "A", label: "Outstanding Life",  emoji: "🌟", color: "#34C759" };
    if (avg >= 50) return { grade: "B", label: "Good Life",         emoji: "👍", color: "#007AFF" };
    if (avg >= 36) return { grade: "C", label: "Average Life",      emoji: "😊", color: "#FF9500" };
    return            { grade: "D", label: "Difficult Life",        emoji: "💪", color: "#FF3B30" };
  }

  const progress = SCENES.length > 0 ? sceneIndex / SCENES.length : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // INTRO
  // ─────────────────────────────────────────────────────────────────────────────

  if (gamePhase === "intro") {
    return (
      <View style={[s.root, { backgroundColor: "#050810" }]}>
        <LinearGradient colors={["#0d0d1a", "#0f1e3d", "#12094a"]} style={[s.introFull, { paddingTop: insets.top }]}>
          <View style={[s.orb, s.orb1]} />
          <View style={[s.orb, s.orb2]} />
          <View style={[s.orb, s.orb3]} />
          <TouchableOpacity style={[s.closeBtn, { top: insets.top + 10 }]} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={s.introScroll} showsVerticalScrollIndicator={false}>
            <Text style={s.introGlobe}>🌍</Text>
            <Text style={s.introTitle}>LIFE EARTH</Text>
            <Text style={s.introTagline}>The Ultimate Human Life Simulation</Text>
            <Text style={s.introBody}>
              You are about to be born into a randomly generated family, somewhere on Earth. 30 countries. 7 wealth tiers. 22 life decisions. 27 random events. Every choice matters — from infancy to your final gift to the world.
            </Text>

            {/* Feature grid */}
            <View style={s.featureGrid}>
              {[
                { icon: "🌍", title: "30 Countries", sub: "Every continent" },
                { icon: "👶", title: "7 Wealth Tiers", sub: "Destitute to Ultra-Rich" },
                { icon: "🎭", title: "22 Decisions", sub: "Birth to legacy" },
                { icon: "🎲", title: "27 Life Events", sub: "Random chaos" },
                { icon: "⚖️", title: "Moral Choices", sub: "Crime & consequence" },
                { icon: "🏆", title: "S–D Rating", sub: "How did you live?" },
              ].map((f) => (
                <View key={f.title} style={s.featureCard}>
                  <Text style={s.featureCardIcon}>{f.icon}</Text>
                  <Text style={s.featureCardTitle}>{f.title}</Text>
                  <Text style={s.featureCardSub}>{f.sub}</Text>
                </View>
              ))}
            </View>

            {/* Life stage roadmap */}
            <View style={s.roadmap}>
              <Text style={s.roadmapTitle}>LIFE STAGES</Text>
              <View style={s.roadmapRow}>
                {(["infant","child","teen","youngAdult","adult","midLife","elderly"] as Phase[]).map((p, i, arr) => (
                  <React.Fragment key={p}>
                    <View style={[s.roadmapDot, { backgroundColor: PHASE_GRADIENTS[p][0] }]}>
                      <Text style={s.roadmapDotEmoji}>
                        {p==="infant"?"👶":p==="child"?"🧒":p==="teen"?"🧑":p==="youngAdult"?"👨":p==="adult"?"🧔":p==="midLife"?"👴":"🧓"}
                      </Text>
                    </View>
                    {i < arr.length-1 && <View style={s.roadmapLine} />}
                  </React.Fragment>
                ))}
              </View>
            </View>

            <TouchableOpacity onPress={startGame}>
              <LinearGradient colors={["#e94560", "#c23152"]} style={s.beginBtn} start={{ x:0, y:0 }} end={{ x:1, y:0 }}>
                <Text style={s.beginBtnText}>Begin My Life</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BIRTH
  // ─────────────────────────────────────────────────────────────────────────────

  if (gamePhase === "birth") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#667eea","#764ba2"]} style={[s.birthBanner, { paddingTop: insets.top + 12 }]}>
          <Text style={{ fontSize: 70 }}>👶</Text>
          <Text style={s.birthBannerTitle}>You Have Been Born</Text>
          <View style={s.birthBannerFlag}>
            <Text style={{ fontSize: 32 }}>{country.flag}</Text>
            <View>
              <Text style={s.birthBannerCountry}>{country.name}</Text>
              <Text style={s.birthBannerRegion}>{country.region}</Text>
            </View>
          </View>
          <Text style={s.birthBannerDesc}>{country.desc}</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: insets.bottom + 30 }}>

          {/* Family */}
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: family.color + "44" }]}>
            <View style={s.cardHeader}>
              <Text style={{ fontSize: 32 }}>{family.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: colors.text }]}>{family.label} Family</Text>
                <Text style={[s.cardSub, { color: colors.textMuted }]}>{family.desc}</Text>
              </View>
              <View style={[s.chip, { backgroundColor: family.color + "22" }]}>
                <Text style={[s.chipText, { color: family.color }]}>{fmtWealth(stats.wealth)}</Text>
              </View>
            </View>
          </View>

          {/* Parents */}
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>👨‍👩‍👦 YOUR PARENTS</Text>
            <View style={{ gap: 10, marginTop: 8 }}>
              {[{ e: "👨", j: parentJobA }, { e: "👩", j: parentJobB }].map((p) => (
                <View key={p.e} style={[s.parentRow, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={{ fontSize: 24 }}>{p.e}</Text>
                  <Text style={[s.parentJob, { color: colors.text }]}>{p.j}</Text>
                  <View style={[s.chip, { backgroundColor: colors.border }]}>
                    <Text style={[s.chipText, { color: colors.textMuted }]}>Parent</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Starting stats */}
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>📊 YOUR STARTING CONDITIONS</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              <StatBar label="Health"     value={stats.health}     color="#34C759" icon="❤️" />
              <StatBar label="Education"  value={stats.education}  color="#007AFF" icon="📚" />
              <StatBar label="Happiness"  value={stats.happiness}  color="#FF9500" icon="😊" />
              <StatBar label="Fitness"    value={stats.fitness}    color="#FF2D55" icon="💪" />
              <StatBar label="Reputation" value={stats.reputation} color="#AF52DE" icon="⭐" />
            </View>
          </View>

          {/* Context note */}
          <View style={[s.card, { backgroundColor: "#0f1e3d", borderColor: "#1a3a6e" }]}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)", lineHeight: 21 }}>
              🌍 Born in <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>{country.name}</Text> into a{" "}
              <Text style={{ color: family.color, fontFamily: "Inter_600SemiBold" }}>{family.label}</Text> family. Your starting conditions are shaped by your country, your parents, and fortune. The rest — every single bit of it — is up to you.
            </Text>
          </View>

          <TouchableOpacity onPress={beginPlaying}>
            <LinearGradient colors={["#667eea","#764ba2"]} style={s.beginBtn} start={{ x:0, y:0 }} end={{ x:1, y:0 }}>
              <Text style={s.beginBtnText}>Start My Life Journey</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RANDOM EVENT
  // ─────────────────────────────────────────────────────────────────────────────

  if (gamePhase === "event" && currentEvent) {
    const isGood = currentEvent.type === "good";
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isGood ? ["#0b5c3e", "#11998e"] : ["#6e1a1a", "#b83232"]}
          style={[s.eventBanner, { paddingTop: insets.top + 14 }]}
        >
          <View style={s.eventTypeTag}>
            <Text style={s.eventTypeText}>{isGood ? "✨ LIFE BONUS" : "⚡ LIFE EVENT"}</Text>
          </View>
          <Text style={{ fontSize: 64, marginTop: 4 }}>{currentEvent.icon}</Text>
          <Text style={s.eventTitle}>{currentEvent.title}</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: insets.bottom + 30 }}>
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.eventNarrative, { color: colors.text }]}>{currentEvent.text}</Text>
            <View style={[s.chip, { backgroundColor: colors.backgroundSecondary, marginTop: 8, alignSelf: "flex-start" }]}>
              <Text style={[s.chipText, { color: colors.textMuted }]}>Age {age}</Text>
            </View>
          </View>

          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>IMPACT ON YOUR LIFE</Text>
          <View style={{ gap: 8 }}>
            {Object.entries(currentEvent.effect).map(([k, v]) => {
              const val = v as number;
              const pos = val > 0;
              const labels: Record<string, string> = {
                health:"❤️ Health", education:"📚 Education", happiness:"😊 Happiness",
                wealth:"💰 Wealth", reputation:"⭐ Reputation", fitness:"💪 Fitness",
              };
              return (
                <View key={k} style={[s.impactRow, {
                  backgroundColor: pos ? "#34C75910" : "#FF3B3010",
                  borderColor:     pos ? "#34C75940" : "#FF3B3040",
                }]}>
                  <Text style={[s.impactLabel, { color: colors.text }]}>{labels[k] || k}</Text>
                  <Text style={[s.impactVal, { color: pos ? "#34C759" : "#FF3B30" }]}>
                    {pos ? "+" : ""}{k === "wealth" ? fmtWealth(Math.abs(val)) : val} {pos ? "▲" : "▼"}
                  </Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity onPress={dismissEvent} style={{ marginTop: 8 }}>
            <LinearGradient
              colors={isGood ? ["#11998e","#38ef7d"] : ["#444","#333"]}
              style={s.beginBtn} start={{ x:0, y:0 }} end={{ x:1, y:0 }}
            >
              <Text style={s.beginBtnText}>{isGood ? "Great — continue" : "Accept & continue"}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DEATH / LEGACY
  // ─────────────────────────────────────────────────────────────────────────────

  if (gamePhase === "death" || sceneIndex >= SCENES.length) {
    const deathAge = 65 + Math.floor(stats.health / 4) + Math.floor(stats.fitness / 6);
    const { grade, label, emoji, color: gradeColor } = lifeGrade();
    const totalXp = xpEarned + Math.floor(stats.reputation / 1.5) + Math.floor(stats.happiness / 2);
    const careerData = CAREERS.find((c) => c.name === career);

    return (
      <View style={[s.root, { backgroundColor: "#050810" }]}>
        <LinearGradient colors={["#1a1a2e","#2c2c4e"]} style={[s.deathBanner, { paddingTop: insets.top + 20 }]}>
          <Text style={{ fontSize: 56 }}>{emoji}</Text>
          <Text style={s.deathTitle}>Your Life Is Complete</Text>
          <Text style={s.deathAge}>You lived to age {deathAge}</Text>
          <View style={[s.gradeCircle, { borderColor: gradeColor }]}>
            <Text style={[s.gradeText, { color: gradeColor }]}>{grade}</Text>
          </View>
          <Text style={[s.gradeLabel, { color: gradeColor }]}>{label}</Text>
          {career && (
            <View style={[s.chip, { backgroundColor: "rgba(255,255,255,0.12)", marginTop: 6 }]}>
              <Text style={[s.chipText, { color: "#fff" }]}>{careerData?.icon || "💼"} {career}</Text>
            </View>
          )}
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: insets.bottom + 36 }}>

          {/* Final Stats */}
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>FINAL STATS</Text>
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, gap: 10 }]}>
            <StatBar label="Health"     value={stats.health}     color="#34C759" icon="❤️" />
            <StatBar label="Education"  value={stats.education}  color="#007AFF" icon="📚" />
            <StatBar label="Happiness"  value={stats.happiness}  color="#FF9500" icon="😊" />
            <StatBar label="Fitness"    value={stats.fitness}    color="#FF2D55" icon="💪" />
            <StatBar label="Reputation" value={stats.reputation} color="#AF52DE" icon="⭐" />
            <View style={[s.wealthFinalRow, { borderTopColor: colors.border }]}>
              <Text style={[s.wealthFinalLabel, { color: colors.textMuted }]}>💰 Final Net Worth</Text>
              <Text style={[s.wealthFinalVal, { color: "#34C759" }]}>{fmtWealth(stats.wealth)}</Text>
            </View>
          </View>

          {/* Career summary */}
          {careerData && (
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>CAREER</Text>
              <View style={[s.cardHeader, { marginTop: 8 }]}>
                <Text style={{ fontSize: 28 }}>{careerData.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: colors.text }]}>{careerData.name}</Text>
                  <Text style={[s.cardSub, { color: colors.textMuted }]}>Est. peak income: {fmtWealth(Math.round(careerData.income * (0.7 + Math.random() * 0.6)))}/yr</Text>
                </View>
              </View>
            </View>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>LIFE ACHIEVEMENTS</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {tags.map((t) => (
                  <View key={t} style={[s.tagBadge, { borderColor: gradeColor + "55", backgroundColor: gradeColor + "18" }]}>
                    <Text style={[s.tagText, { color: gradeColor }]}>🏅 {t}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* XP */}
          <View style={[s.card, { backgroundColor: "#FF950014", borderColor: "#FF950040" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="flash" size={24} color="#FF9500" />
              <View>
                <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: "#FF9500" }}>+{totalXp} XP</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#FF9500", opacity: 0.75 }}>Earned across {log.length} life events</Text>
              </View>
            </View>
          </View>

          {/* Life story */}
          <Text style={[s.sectionLabel, { color: colors.textMuted }]}>YOUR LIFE STORY</Text>
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, gap: 0, padding: 0 }]}>
            {log.map((entry, i) => (
              <View key={i}>
                <View style={s.logRow}>
                  <View style={[s.logAgeBubble, { backgroundColor: colors.backgroundSecondary }]}>
                    <Text style={[s.logAgeText, { color: colors.textMuted }]}>{entry.age}</Text>
                  </View>
                  <Text style={{ fontSize: 18 }}>{entry.icon}</Text>
                  <Text style={[s.logEntryText, { color: colors.text, flex: 1 }]} numberOfLines={2}>{entry.text}</Text>
                </View>
                {i < log.length - 1 && <View style={[{ height: 0.5, marginLeft: 60, backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity onPress={startGame}>
            <LinearGradient colors={["#e94560","#c23152"]} style={s.beginBtn} start={{ x:0, y:0 }} end={{ x:1, y:0 }}>
              <Text style={s.beginBtnText}>Live Another Life</Text>
              <Ionicons name="refresh" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={[s.ghostBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
            <Text style={[s.ghostBtnText, { color: colors.textMuted }]}>Back to Games</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PLAYING
  // ─────────────────────────────────────────────────────────────────────────────

  const phaseEmoji: Record<Phase, string> = {
    infant:"👶", child:"🧒", teen:"🧑", youngAdult:"👨", adult:"🧔", midLife:"👴", elderly:"🧓"
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* Stage header */}
      <LinearGradient colors={gradient} style={[s.stageHeader, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={14}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.65)" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
          <Text style={s.stageEmoji}>{scene ? phaseEmoji[scene.phase] : "👤"}</Text>
          <Text style={s.stageLabel}>{scene ? PHASE_LABELS[scene.phase] : ""}</Text>
          {/* Progress bar */}
          <View style={s.lifeBar}>
            <Animated.View style={[s.lifeBarFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
        <View style={[s.agePill, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
          <Text style={s.ageText}>Age {age}</Text>
        </View>
      </LinearGradient>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>

        {/* Stats dashboard */}
        <View style={[s.statsPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ gap: 9 }}>
            <StatBar label="Health"     value={stats.health}     color="#34C759" icon="❤️" />
            <StatBar label="Education"  value={stats.education}  color="#007AFF" icon="📚" />
            <StatBar label="Happiness"  value={stats.happiness}  color="#FF9500" icon="😊" />
            <StatBar label="Fitness"    value={stats.fitness}    color="#FF2D55" icon="💪" />
            <StatBar label="Reputation" value={stats.reputation} color="#AF52DE" icon="⭐" />
          </View>
          <View style={s.statsPanelBottom}>
            <View style={[s.chip, { backgroundColor: "#34C75918", borderColor: "#34C75940", borderWidth: 0.5 }]}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: "#34C759" }}>💰 Net Worth</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#34C759" }}>{fmtWealth(stats.wealth)}</Text>
            </View>
            {career && (
              <View style={[s.chip, { backgroundColor: gradient[0] + "22", borderColor: gradient[0] + "44", borderWidth: 0.5 }]}>
                <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: gradient[0] }}>Career</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: gradient[0] }}>{career}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Scene */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Narrative card */}
          <LinearGradient
            colors={[gradient[0] + "28", gradient[1] + "10"]}
            style={[s.narrativeCard, { borderColor: gradient[0] + "40" }]}
          >
            <View style={s.narrativeHeader}>
              <View style={[s.narrativeStagePill, { backgroundColor: gradient[0] + "33" }]}>
                <Text style={[s.narrativeStagePillText, { color: "#fff" }]}>
                  {scene?.phase?.replace(/([A-Z])/g, " $1").trim().toUpperCase()}
                </Text>
              </View>
              <View style={[s.narrativeStagePill, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
                <Text style={[s.narrativeStagePillText, { color: "rgba(255,255,255,0.7)" }]}>
                  Scene {sceneIndex + 1} of {SCENES.length}
                </Text>
              </View>
            </View>
            <Text style={[s.narrativeTitle, { color: colors.text }]}>{scene?.title}</Text>
            <Text style={[s.narrativeBody, { color: colors.textSecondary }]}>{scene?.narrative}</Text>
          </LinearGradient>

          {/* Choice label */}
          <Text style={[s.choiceGroupLabel, { color: colors.textMuted }]}>
            WHAT DO YOU DO?  •  {scene?.choices.length} OPTIONS
          </Text>

          {/* Choice cards */}
          <View style={{ gap: 10 }}>
            {scene?.choices.map((choice, idx) => (
              <TouchableOpacity key={idx} onPress={() => makeChoice(choice)} activeOpacity={0.75}>
                <View style={[
                  s.choiceCard,
                  { backgroundColor: colors.surface, borderColor: choice.risky ? "#FF3B3055" : colors.border },
                  choice.risky && { borderWidth: 1.5 },
                ]}>
                  {/* Risk indicator */}
                  {choice.risky && (
                    <View style={s.riskBadge}>
                      <Text style={s.riskBadgeText}>⚠️ RISKY</Text>
                    </View>
                  )}
                  <Text style={s.choiceEmoji}>{choice.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.choiceTitle, { color: colors.text }]}>{choice.label}</Text>
                    <Text style={[s.choiceSub, { color: colors.textMuted }]}>{choice.sub}</Text>
                    {/* Stat previews */}
                    <View style={s.effectRow}>
                      {Object.entries(choice.effect).slice(0, 4).map(([k, v]) => {
                        const val = v as number;
                        const pos = val > 0;
                        return (
                          <Text key={k} style={[s.effectChip, { color: pos ? "#34C759" : "#FF3B30", backgroundColor: pos ? "#34C75912" : "#FF3B3012" }]}>
                            {pos?"+":""}{k === "wealth" ? fmtWealth(Math.abs(val)) : val} {k === "wealth" ? "💰" : k === "health" ? "❤️" : k === "education" ? "📚" : k === "happiness" ? "😊" : k === "reputation" ? "⭐" : "💪"}
                          </Text>
                        );
                      })}
                    </View>
                    {choice.tag && (
                      <View style={[s.tagBadge, { alignSelf: "flex-start", marginTop: 4, borderColor: gradient[0] + "55", backgroundColor: gradient[0] + "18" }]}>
                        <Text style={[s.tagText, { color: gradient[0] }]}>🏅 Unlocks: {choice.tag}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Mini life log */}
        {log.length > 0 && (
          <View style={[s.miniLog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>📖 RECENT LIFE LOG</Text>
            {log.slice(-4).map((e, i) => (
              <View key={i} style={s.miniLogRow}>
                <Text style={{ fontSize: 14, width: 22 }}>{e.icon}</Text>
                <Text style={[s.miniLogText, { color: colors.textSecondary }]} numberOfLines={1}>
                  Age {e.age}: {e.text}
                </Text>
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

  // Orbs
  orb:  { position: "absolute", borderRadius: 999 },
  orb1: { width: 340, height: 340, backgroundColor: "#e9456012", top: -120, right: -100 },
  orb2: { width: 220, height: 220, backgroundColor: "#5356D612", bottom: 80,  left:  -70 },
  orb3: { width: 160, height: 160, backgroundColor: "#FFD70008", top:  200, left:  100 },

  // Intro
  introFull:   { flex: 1, position: "relative" },
  closeBtn:    { position: "absolute", right: 16, zIndex: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  introScroll: { alignItems: "center", padding: 28, paddingTop: 60, gap: 16 },
  introGlobe:  { fontSize: 80 },
  introTitle:  { fontSize: 34, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 4 },
  introTagline:{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", textAlign: "center" },
  introBody:   { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 23, maxWidth: 320 },

  featureGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%" },
  featureCard:     { width: (W - 80) / 2, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 12, gap: 4, alignItems: "center" },
  featureCardIcon: { fontSize: 26 },
  featureCardTitle:{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  featureCardSub:  { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", textAlign: "center" },

  roadmap:       { width: "100%", gap: 10 },
  roadmapTitle:  { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.45)", letterSpacing: 1, textAlign: "center" },
  roadmapRow:    { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  roadmapDot:    { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  roadmapDotEmoji:{ fontSize: 18 },
  roadmapLine:   { flex: 1, height: 2, backgroundColor: "rgba(255,255,255,0.15)", maxWidth: 18 },

  beginBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 18, borderRadius: 20, width: "100%" },
  beginBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  ghostBtn:     { alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 0.5, marginTop: 4 },
  ghostBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Birth
  birthBanner:       { alignItems: "center", paddingHorizontal: 24, paddingBottom: 28, gap: 8 },
  birthBannerTitle:  { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  birthBannerFlag:   { flexDirection: "row", alignItems: "center", gap: 10 },
  birthBannerCountry:{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  birthBannerRegion: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  birthBannerDesc:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", textAlign: "center" },

  // Cards
  card:       { borderRadius: 18, borderWidth: 0.5, padding: 16, gap: 6 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitle:  { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardSub:    { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  chip:       { flexDirection: "column", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 1 },
  chipText:   { fontSize: 12, fontFamily: "Inter_700Bold" },
  parentRow:  { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12 },
  parentJob:  { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  sectionLabel:{ fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },

  // Event
  eventBanner:   { alignItems: "center", paddingHorizontal: 24, paddingBottom: 28, gap: 8 },
  eventTypeTag:  { backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  eventTypeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.8 },
  eventTitle:    { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  eventNarrative:{ fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  impactRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 12, borderWidth: 0.5 },
  impactLabel:   { fontSize: 14, fontFamily: "Inter_500Medium" },
  impactVal:     { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Stage header
  stageHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  stageEmoji:  { fontSize: 22 },
  stageLabel:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)" },
  lifeBar:     { height: 4, width: 130, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.22)", overflow: "hidden" },
  lifeBarFill: { height: "100%", borderRadius: 2, backgroundColor: "#fff" },
  agePill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  ageText:     { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },

  // Stats panel
  statsPanel:       { borderRadius: 18, borderWidth: 0.5, padding: 14, gap: 12 },
  statsPanelBottom: { flexDirection: "row", gap: 10, marginTop: 4 },

  // Narrative
  narrativeCard:         { borderRadius: 20, borderWidth: 1, padding: 18, gap: 10, marginBottom: 12 },
  narrativeHeader:       { flexDirection: "row", gap: 8, marginBottom: 4 },
  narrativeStagePill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  narrativeStagePillText:{ fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  narrativeTitle:        { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26 },
  narrativeBody:         { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 23 },
  choiceGroupLabel:      { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 4 },

  // Choice card
  choiceCard:  { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 16, borderWidth: 0.5, position: "relative" },
  riskBadge:   { position: "absolute", top: 10, right: 36, backgroundColor: "#FF3B3022", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  riskBadgeText:{ fontSize: 9, fontFamily: "Inter_700Bold", color: "#FF3B30" },
  choiceEmoji: { fontSize: 28, paddingTop: 2 },
  choiceTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  choiceSub:   { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  effectRow:   { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 7 },
  effectChip:  { fontSize: 10, fontFamily: "Inter_600SemiBold", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  tagBadge:    { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 0.5 },
  tagText:     { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Mini log
  miniLog:    { borderRadius: 14, borderWidth: 0.5, padding: 12, gap: 8 },
  miniLogRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniLogText:{ fontSize: 12, fontFamily: "Inter_400Regular" },

  // Death / legacy
  deathBanner:    { alignItems: "center", paddingHorizontal: 24, paddingBottom: 28, paddingTop: 20, gap: 6 },
  deathTitle:     { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  deathAge:       { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  gradeCircle:    { width: 80, height: 80, borderRadius: 40, borderWidth: 3.5, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)", marginTop: 10 },
  gradeText:      { fontSize: 36, fontFamily: "Inter_700Bold" },
  gradeLabel:     { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  wealthFinalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 0.5, marginTop: 4 },
  wealthFinalLabel:{ fontSize: 13, fontFamily: "Inter_500Medium" },
  wealthFinalVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  logRow:         { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  logAgeBubble:   { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  logAgeText:     { fontSize: 10, fontFamily: "Inter_700Bold" },
  logEntryText:   { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
