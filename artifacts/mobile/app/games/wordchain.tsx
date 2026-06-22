import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Easing, FlatList, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "@/components/ui/SafeGradient";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "@/lib/haptics";

const STARTER_WORDS = ["apple","beach","cloud","dance","eagle","flame","grape","honey","india","juice","karma","lemon","mango","night","ocean","piano","queen","river","storm","tiger","ultra","viper","water","xenon","yacht","zebra"];
const VALID_WORDS = new Set(["apple","beach","cloud","dance","eagle","flame","grape","honey","india","juice","karma","lemon","mango","night","ocean","piano","queen","river","storm","tiger","ultra","viper","water","xenon","yacht","zebra","able","acorn","acre","act","add","age","ago","aid","aim","air","all","allow","also","alter","among","angel","anger","angle","animal","answer","arch","area","army","ask","atom","aunt","auto","away","baby","back","ball","band","bank","barn","base","bath","bear","beat","been","bell","belt","best","bird","bite","blow","blue","blur","boat","bold","bolt","bone","book","born","boss","both","bowl","brad","brave","brew","brim","bring","brown","buck","build","bulk","bull","burn","burp","calm","came","camp","card","care","cart","cast","cave","cell","cent","chem","chin","chip","chop","city","clam","clay","clip","club","coal","coat","code","coil","cold","come","cone","cook","cool","corn","cost","coup","cover","crab","crew","crop","crow","cube","cure","curl","cute","cyan","dead","dear","debt","deed","deep","deer","desk","diet","dime","dine","dip","dirt","dish","disk","dome","done","door","dork","dove","down","draw","drew","drop","drum","duke","dull","dune","dusk","dust","duty","each","earn","ease","east","edge","else","emit","emit","envy","epic","even","ever","exam","exit","face","fact","fair","fall","fame","farm","fast","fate","feel","feet","felt","file","fill","film","find","fine","fish","fist","five","flag","flat","flaw","flew","flip","flow","foam","fold","folk","font","food","fool","ford","fork","form","fort","frog","from","fuel","full","gale","game","gate","gave","gaze","gear","gild","give","glad","glee","glow","glue","goal","gold","golf","gown","grab","gray","grew","grid","grin","grip","grit","grow","gulf","gulf","gust","half","hall","halt","hand","hang","hard","harp","hate","have","head","heal","heap","heat","heel","help","herb","here","hero","high","hill","hint","hold","hole","home","hood","hook","hoop","hope","horn","hour","hump","hunk","hunt","hurt","hymn","icon","idea","idle","inch","iron","isle","item","jade","jail","jazz","jerk","join","joke","jump","just","keen","keep","kick","kind","king","kite","knob","knot","know","lack","lake","lamb","lamp","lane","last","late","lawn","lead","leaf","lean","left","lens","life","lift","like","limb","lime","line","link","lion","lips","list","live","load","loan","lock","loft","lone","long","lore","lose","loss","loud","love","luck","lung","lurk","lust","made","mail","main","make","male","mall","mark","mars","mass","math","maze","meal","meat","meet","melt","menu","mere","mesh","mild","mile","milk","mill","mind","mine","mint","mist","mode","mole","monk","moon","more","moss","most","move","much","muck","mule","must","myth","nail","name","navy","near","neck","need","neon","nerd","news","next","nice","nine","node","none","noon","norm","note","noun","obey","odds","once","only","onto","open","oral","orca","orb","orbs","over","oval","oven","owns","pace","pack","page","pain","pair","pale","palm","park","part","pass","past","path","pave","peak","pear","peel","peer","pelt","perk","pest","pick","pink","pipe","pity","plan","play","plot","plow","plug","plus","poem","poet","poke","poll","pool","pour","prey","prim","prod","prop","pros","pump","pure","push","rack","rage","rail","rain","rake","ramp","rang","rank","rare","real","ream","reel","rein","rely","rent","rest","rice","rich","ride","riff","rift","ring","ripe","risk","road","roam","roar","role","roll","roof","room","root","rose","rude","rule","rush","rust","safe","sage","sail","sale","salt","same","sand","sane","sang","sash","save","scan","scar","seal","seam","seed","seem","self","sell","shed","shin","ship","shoe","shop","shot","show","shut","sick","side","sign","silk","sing","sire","site","size","size","skin","skip","skull","slab","slam","slap","slash","slim","slip","slow","slug","snap","sock","sofa","soil","sole","solo","some","song","soul","sour","span","spar","span","spin","spit","spot","spread","spur","stab","star","stay","stem","step","stem","stop","strap","stub","such","suit","silk","sole","sulk","sunk","surf","sure","swan","swap","swam","swat","sway","swim","sync","tail","tale","tall","tame","task","taxi","teal","team","tear","tent","text","than","thaw","them","then","thin","this","tidy","till","time","tiny","toad","toil","tone","took","tore","toss","tour","town","trap","tree","trim","trio","trip","trod","trot","tuna","tune","turf","turn","tusk","twin","type","ugly","undo","unit","upon","urge","used","vain","vale","very","vest","view","vine","volt","vote","wage","wake","walk","wall","wand","want","ward","warm","warn","warp","wave","weak","weal","weld","went","west","what","when","whip","wide","wild","will","wilt","wind","wine","wing","wink","wire","wise","wish","with","woke","wolf","wood","word","wore","work","worm","wove","wrap","yell","your","zone","zoom"]);

const TIME_PER_TURN = 10;
type Phase = "intro" | "playing" | "result";
type Entry = { word: string; by: "user" | "cpu"; valid: boolean };

const CPU_RESPONSES: Record<string, string[]> = {
  a:["art","arm","amp","arc","ash","ace"],b:["ball","bank","bark","barn","base","bath"],
  c:["camp","card","cave","cell","coin","core"],d:["dart","dawn","deck","dome","door","dusk"],
  e:["earl","ease","edge","emit","epic","even"],f:["face","fact","farm","fate","feel","foam"],
  g:["gale","gate","gear","give","glow","goal"],h:["halo","hang","harp","heal","hero","high"],
  i:["icon","inch","iron","isle","idea","idle"],j:["jade","jazz","jump","just","jail","join"],
  k:["keen","kick","kind","king","kite","know"],l:["lack","lake","lamp","lane","leaf","life"],
  m:["mail","mane","mark","mass","meal","melt"],n:["nail","name","navy","near","neck","node"],
  o:["obey","once","open","oral","orca","oval"],p:["pace","pack","pain","pair","palm","peak"],
  q:["quad","quiz","quit"],r:["race","rack","rage","rail","rain","ramp"],
  s:["safe","sail","salt","sand","seal","silk"],t:["tale","tall","tame","task","teal","team"],
  u:["ugly","undo","unit","upon","urge","used"],v:["vain","vale","vest","view","vine","vote"],
  w:["wage","wake","walk","wall","warm","wave"],x:["xenon"],y:["yell","yoga","your","yore"],
  z:["zeal","zero","zinc","zone","zoom","zest"],
};

export default function WordChainGame() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [phase, setPhase]   = useState<Phase>("intro");
  const [chain, setChain]   = useState<Entry[]>([]);
  const [input, setInput]   = useState("");
  const [timeLeft, setTime] = useState(TIME_PER_TURN);
  const [score, setScore]   = useState(0);
  const [error, setError]   = useState("");
  const [currentLetter, setCurrentLetter] = useState("a");
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef   = useRef<FlatList>(null);
  const timerAnim = useRef(new Animated.Value(1)).current;

  function startGame() {
    const starter = STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
    const used = new Set([starter]);
    setChain([{ word: starter, by: "cpu", valid: true }]);
    setCurrentLetter(starter[starter.length - 1]);
    setUsedWords(used);
    setInput("");
    setScore(0);
    setError("");
    setPhase("playing");
    startTimer(TIME_PER_TURN);
  }

  function startTimer(secs: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setTime(secs);
    timerAnim.setValue(1);
    Animated.timing(timerAnim, {
      toValue: 0, duration: secs * 1000, useNativeDriver: false, easing: Easing.linear,
    }).start();
    timerRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); handleTimeUp(); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function handleTimeUp() {
    setPhase("result");
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function cpuRespond(lastWord: string) {
    const firstLetter = lastWord[lastWord.length - 1];
    const pool = (CPU_RESPONSES[firstLetter] || []).filter((w) => !usedWords.has(w));
    if (pool.length === 0) {
      setChain((c) => [...c, { word: "...(CPU gives up! You win!)", by: "cpu", valid: false }]);
      clearInterval(timerRef.current!);
      setPhase("result");
      return;
    }
    const cpuWord = pool[Math.floor(Math.random() * pool.length)];
    setUsedWords((u) => new Set([...u, cpuWord]));
    setChain((c) => [...c, { word: cpuWord, by: "cpu", valid: true }]);
    setCurrentLetter(cpuWord[cpuWord.length - 1]);
    setScore((s) => s + 5);
    startTimer(TIME_PER_TURN);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function submitWord() {
    const word = input.trim().toLowerCase();
    setError("");

    if (word.length < 2) { setError("Word too short"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); return; }
    if (word[0] !== currentLetter) { setError(`Must start with "${currentLetter.toUpperCase()}"`); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); return; }
    if (usedWords.has(word)) { setError("Already used!"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); return; }
    if (!VALID_WORDS.has(word)) { setError("Not a valid word"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); return; }

    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUsedWords((u) => new Set([...u, word]));
    setChain((c) => [...c, { word, by: "user", valid: true }]);
    setInput("");
    setScore((s) => s + 10);
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
      cpuRespond(word);
    }, 300);
  }

  if (phase === "intro") {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#34C759","#30D158"]} style={[s.banner, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.bannerEmoji}>🔤</Text>
          <Text style={s.bannerTitle}>WordChain</Text>
          <Text style={s.bannerSub}>Chain words — each word starts with the last letter of the previous one</Text>
        </LinearGradient>
        <View style={s.body}>
          {[
            { icon: "text", label: "Enter a word starting with the shown letter" },
            { icon: "timer-outline", label: "10 seconds per turn — don't run out!" },
            { icon: "flash", label: "+10 XP per word · +5 XP per CPU word you survive" },
          ].map((r) => (
            <View key={r.label} style={[s.ruleRow, { borderColor: colors.border }]}>
              <View style={[s.ruleIcon, { backgroundColor: "#34C75920" }]}>
                <Ionicons name={r.icon as any} size={18} color="#34C759" />
              </View>
              <Text style={[s.ruleText, { color: colors.text }]}>{r.label}</Text>
            </View>
          ))}
          <TouchableOpacity style={[s.startBtn, { backgroundColor: "#34C759" }]} onPress={startGame}>
            <Text style={s.startBtnText}>Start Game</Text>
            <Ionicons name="play" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === "result") {
    const userWords = chain.filter((c) => c.by === "user" && c.valid).length;
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={["#34C759","#30D158"]} style={[s.banner, { paddingTop: insets.top + 30 }]}>
          <Text style={s.bannerEmoji}>{score >= 100 ? "🏆" : "🎯"}</Text>
          <Text style={s.bannerTitle}>Game Over</Text>
          <Text style={s.bannerSub}>You chained {userWords} words!</Text>
        </LinearGradient>
        <View style={s.body}>
          {[
            { label: "Total score", value: String(score) },
            { label: "Words you played", value: String(userWords) },
            { label: "XP earned", value: `+${Math.min(score, 30)} XP` },
          ].map((stat) => (
            <View key={stat.label} style={[s.statRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              <Text style={[s.statValue, { color: colors.text }]}>{stat.value}</Text>
            </View>
          ))}
          <TouchableOpacity style={[s.startBtn, { backgroundColor: "#34C759" }]} onPress={startGame}>
            <Text style={s.startBtnText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.startBtn, { backgroundColor: colors.surface, marginTop: 4 }]} onPress={() => router.back()}>
            <Text style={[s.startBtnText, { color: colors.text }]}>Back to Games</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[s.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient colors={["#34C759","#30D158"]} style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.topLabel}>WordChain</Text>
          <View style={s.timerTrack}>
            <Animated.View style={[s.timerFill, { width: timerAnim.interpolate({ inputRange:[0,1], outputRange:["0%","100%"] }), backgroundColor: timeLeft <= 3 ? "#FF3B30" : "#fff" }]} />
          </View>
        </View>
        <View style={[s.scoreBadge]}>
          <Text style={s.scoreTxt}>{score} pts</Text>
        </View>
      </LinearGradient>

      {/* Next letter indicator */}
      <View style={[s.letterBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.letterHint, { color: colors.textMuted }]}>Next word must start with</Text>
        <Text style={[s.letterBig, { color: "#34C759" }]}>{currentLetter.toUpperCase()}</Text>
        <View style={[s.timerPill, { backgroundColor: timeLeft <= 3 ? "#FF3B3022" : "#34C75922" }]}>
          <Ionicons name="timer-outline" size={13} color={timeLeft <= 3 ? "#FF3B30" : "#34C759"} />
          <Text style={[s.timerPillText, { color: timeLeft <= 3 ? "#FF3B30" : "#34C759" }]}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Chain */}
      <FlatList
        ref={listRef}
        data={chain}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[s.chainEntry, { alignSelf: item.by === "user" ? "flex-end" : "flex-start" }]}>
            <View style={[
              s.bubble,
              item.by === "user"
                ? { backgroundColor: "#34C759", borderBottomRightRadius: 4 }
                : { backgroundColor: colors.surface, borderColor: colors.border, borderBottomLeftRadius: 4 },
            ]}>
              <Text style={[s.bubbleWord, { color: item.by === "user" ? "#fff" : colors.text }]}>{item.word}</Text>
            </View>
            <Text style={[s.bubbleMeta, { color: colors.textMuted, textAlign: item.by === "user" ? "right" : "left" }]}>
              {item.by === "user" ? "You" : "CPU"}
            </Text>
          </View>
        )}
      />

      {/* Input */}
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          style={[s.input, { color: colors.text }]}
          placeholder={`Word starting with "${currentLetter.toUpperCase()}"...`}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={submitWord}
        />
        <TouchableOpacity style={[s.sendBtn, { backgroundColor: "#34C759" }]} onPress={submitWord}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  banner: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 32, gap: 8, position: "relative" },
  backBtn: { position: "absolute", top: 50, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  bannerEmoji: { fontSize: 56, marginTop: 16 },
  bannerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  bannerSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  body: { flex: 1, padding: 20, gap: 12 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 0.5 },
  ruleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ruleText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, marginTop: 8 },
  startBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 14, borderWidth: 0.5 },
  statLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },

  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  topLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  timerTrack: { height: 4, width: 120, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden", marginTop: 4 },
  timerFill: { height: "100%", borderRadius: 2 },
  scoreBadge: { backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  scoreTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },

  letterBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, padding: 14, borderBottomWidth: 0.5, borderTopWidth: 0.5 },
  letterHint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  letterBig: { fontSize: 28, fontFamily: "Inter_700Bold" },
  timerPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  timerPillText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  chainEntry: { maxWidth: "75%", gap: 3 },
  bubble: { borderRadius: 16, borderWidth: 0.5, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleWord: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  bubbleMeta: { fontSize: 10, fontFamily: "Inter_400Regular" },

  errorText: { textAlign: "center", color: "#FF3B30", fontSize: 13, fontFamily: "Inter_500Medium", paddingVertical: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 12, borderTopWidth: 0.5 },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", paddingVertical: 10 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
