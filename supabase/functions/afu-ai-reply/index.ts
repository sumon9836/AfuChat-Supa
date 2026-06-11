/**
 * AfuChat AI chat edge function.
 *
 * Handles text chat and audio transcription.
 * Provider chain: Groq (6 models) → Gemini (3 models)
 * so a single provider outage never silences the chat.
 *
 * Features injected into every system prompt:
 *  - Current date/time (EAT UTC+3)
 *  - Live weather data (Open-Meteo, free, no API key) when user asks about weather
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Groq voice transcription ─────────────────────────────────────────────────
async function transcribeWithGroq(
  audioUrl: string,
  apiKey: string,
): Promise<string> {
  const audioResp = await fetch(audioUrl);
  if (!audioResp.ok) {
    throw new Error(`Failed to download audio: ${audioResp.status}`);
  }
  const audioBlob = await audioResp.blob();
  const ext =
    (audioUrl.split("?")[0].split(".").pop() || "m4a").toLowerCase();
  const form = new FormData();
  form.append("file", audioBlob, `audio.${ext}`);
  form.append("model", "whisper-large-v3");
  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    },
  );
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.text || "";
}

// ── Groq text chat with per-model fallback ───────────────────────────────────
async function chatWithGroq(
  messages: any[],
  maxTokens: number,
  apiKey: string,
): Promise<string> {
  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.3-70b-specdec",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
    "llama-guard-3-8b",
  ];
  let lastError = "";
  for (const model of models) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        },
      );
      if (res.status === 429 || res.status === 503) {
        lastError = `${model} unavailable (${res.status})`;
        console.log(`${model} unavailable, trying next...`);
        continue;
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        lastError = `${model} error ${res.status}: ${errText}`;
        console.error(lastError);
        continue;
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      if (text) return text;
      lastError = `${model} returned empty content`;
    } catch (err) {
      lastError = `${model} threw: ${
        err instanceof Error ? err.message : String(err)
      }`;
      console.error(lastError);
    }
  }
  throw new Error(lastError || "All Groq models failed");
}

// ── Gemini fallback ──────────────────────────────────────────────────────────
async function chatWithGemini(
  messages: any[],
  maxTokens: number,
  apiKey: string,
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");

  const contents = chatMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const reqBody: any = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  };
  if (systemMsg) {
    reqBody.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
  let lastError = "";
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
        },
      );
      if (!res.ok) {
        lastError = `Gemini ${model} ${res.status}`;
        console.error(lastError);
        continue;
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (text) return text;
      lastError = `Gemini ${model} empty response`;
    } catch (err) {
      lastError = `Gemini ${model} threw: ${err instanceof Error ? err.message : String(err)}`;
      console.error(lastError);
    }
  }
  throw new Error(lastError || "All Gemini models failed");
}

// ── Weather awareness (Open-Meteo — free, no API key needed) ─────────────────

/** Map WMO weather interpretation code → human-readable condition */
function wmoCodeToCondition(code: number): string {
  if (code === 0) return "clear sky";
  if (code === 1) return "mainly clear";
  if (code === 2) return "partly cloudy";
  if (code === 3) return "overcast";
  if (code >= 45 && code <= 48) return "foggy";
  if (code >= 51 && code <= 55) return "drizzle";
  if (code >= 56 && code <= 57) return "freezing drizzle";
  if (code >= 61 && code <= 65) return "rain";
  if (code >= 66 && code <= 67) return "freezing rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain showers";
  if (code >= 85 && code <= 86) return "snow showers";
  if (code === 95) return "thunderstorm";
  if (code >= 96 && code <= 99) return "thunderstorm with hail";
  return "mixed conditions";
}

/** Fetch live weather for a city using Open-Meteo (geocoding + forecast APIs). */
async function fetchWeather(city: string): Promise<string | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!geoRes.ok) return null;
    const geoData = await geoRes.json();
    const loc = geoData.results?.[0];
    if (!loc) return null;

    const { latitude, longitude, name, country } = loc;
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,apparent_temperature` +
      `&timezone=auto`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!weatherRes.ok) return null;
    const wd = await weatherRes.json();
    const cur = wd.current;
    if (!cur) return null;

    const condition = wmoCodeToCondition(cur.weather_code ?? 0);
    return (
      `[CURRENT WEATHER] ${name}, ${country}: ${cur.temperature_2m}°C ` +
      `(feels like ${cur.apparent_temperature}°C), ${condition}, ` +
      `humidity ${cur.relative_humidity_2m}%, wind ${cur.wind_speed_10m} km/h, ` +
      `precipitation ${cur.precipitation} mm. ` +
      `Use this as the authoritative current weather when answering weather questions about ${name}.`
    );
  } catch (err) {
    console.warn("Weather fetch failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Detect if the user's latest message is asking about weather, and extract the city name. */
function detectWeatherCity(messages: any[]): string | null {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return null;

  const text = (lastUser.content ?? "").toLowerCase();
  const weatherKw = ["weather", "temperature", "forecast", "rain", "sunny", "cloudy",
    "hot outside", "cold outside", "humid", "wind speed", "how's the weather",
    "what's the weather", "whats the weather", "weather like", "degrees outside"];
  if (!weatherKw.some((kw) => text.includes(kw))) return null;

  // "weather in Kampala", "forecast for Nairobi", "temperature in Lagos"
  const m1 = text.match(/(?:weather|temperature|forecast|rain|weather like)\s+(?:in|at|for|of)\s+([a-z][a-z\s\-]{1,30}?)(?:\?|$|,|\s+(?:today|now|tomorrow|tonight|this week|right now))/);
  if (m1) return m1[1].trim();

  // "in Kampala weather", "Kampala temperature"
  const m2 = text.match(/(?:in|at)\s+([a-z][a-z\s\-]{1,30}?)\s+(?:weather|temperature|forecast)/);
  if (m2) return m2[1].trim();

  // "how's the weather?" with no city → default to Kampala (AfuChat's primary market)
  return "Kampala";
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // ── Audio transcription branch ─────────────────────────────────
  if (body?.audioUrl) {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY not configured");
      return json({ text: "" });
    }
    try {
      const text = await transcribeWithGroq(body.audioUrl, GROQ_API_KEY);
      return json({ text });
    } catch (e) {
      console.error("Groq transcription failed:", e);
      return json({ text: "" });
    }
  }

  // ── Text chat branch ──────────────────────────────────────────
  const { messages, max_tokens, fast } = body ?? {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages array is required" }, 400);
  }

  const tokenLimit =
    typeof max_tokens === "number" && max_tokens > 0
      ? max_tokens
      : fast
        ? 300
        : 2048;

  // ── 1. Inject real-time temporal context into the system prompt ──
  const now = new Date();
  const utcStr = now.toUTCString();
  const eatOffset = 3 * 60 * 60 * 1000;
  const eatDate = new Date(now.getTime() + eatOffset);
  const eatStr = eatDate.toISOString().replace("T", " ").substring(0, 19) + " EAT (UTC+3)";
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayOfWeek = dayNames[eatDate.getUTCDay()];
  const timeContext = `[CURRENT TIME] Today is ${dayOfWeek}, ${eatStr}. UTC: ${utcStr}. Always use this as the authoritative current date and time when the user asks what time or day it is.`;

  let enrichedMessages: any[] = messages.map((m: any) => {
    if (m.role === "system") {
      return { ...m, content: `${timeContext}\n\n${m.content}` };
    }
    return m;
  });
  if (!messages.some((m: any) => m.role === "system")) {
    enrichedMessages.unshift({ role: "system", content: timeContext });
  }

  // ── 2. Inject live weather if the user is asking about weather ──
  const weatherCity = detectWeatherCity(messages);
  if (weatherCity) {
    console.log(`Weather query detected for city: "${weatherCity}"`);
    const weatherContext = await fetchWeather(weatherCity);
    if (weatherContext) {
      console.log("Weather data fetched successfully");
      enrichedMessages = enrichedMessages.map((m: any) => {
        if (m.role === "system") {
          return { ...m, content: `${m.content}\n\n${weatherContext}` };
        }
        return m;
      });
      if (!enrichedMessages.some((m: any) => m.role === "system")) {
        enrichedMessages.unshift({ role: "system", content: weatherContext });
      }
    }
  }

  const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

  if (!GROQ_KEY && !GEMINI_KEY) {
    console.error("AfuAI: No API keys configured. Set GROQ_API_KEY in Supabase Edge Function secrets.");
    return json({
      reply: "AfuAI isn't fully set up yet. Please ask the admin to configure the AI service keys.",
    });
  }

  // Try Groq first
  if (GROQ_KEY) {
    try {
      console.log(`Groq chat: ${enrichedMessages.length} messages, ${tokenLimit} tokens`);
      const reply = await chatWithGroq(enrichedMessages, tokenLimit, GROQ_KEY);
      console.log("Groq chat succeeded");
      return json({ reply });
    } catch (e: any) {
      console.error("All Groq models failed, trying Gemini:", e?.message || e);
    }
  } else {
    console.warn("GROQ_API_KEY not set — skipping Groq");
  }

  // Gemini fallback
  if (GEMINI_KEY) {
    try {
      console.log("Gemini fallback chat...");
      const reply = await chatWithGemini(enrichedMessages, tokenLimit, GEMINI_KEY);
      console.log("Gemini fallback succeeded");
      return json({ reply });
    } catch (e: any) {
      console.error("Gemini fallback also failed:", e?.message || e);
    }
  } else {
    console.warn("GEMINI_API_KEY not set — no fallback available");
  }

  return json({
    reply: "I'm having a bit of trouble right now. Please try again in a moment!",
  });
});
