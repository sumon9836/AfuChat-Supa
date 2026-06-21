/**
 * AI Support Auto-Responder
 *
 * Generates a draft reply for newly-created support tickets using a
 * Groq → Gemini fallback chain (same provider order as the afu-ai-reply
 * edge function). The draft is inserted as sender_type = 'ai' so staff
 * can review, edit, and send it — or dismiss it entirely.
 *
 * Chain order:
 *   1. Groq  — llama-3.3-70b-versatile → llama-3.1-8b-instant → mixtral-8x7b-32768
 *   2. Gemini — gemini-2.0-flash → gemini-1.5-flash-8b
 */

import OpenAI from "openai";
import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../lib/constants";

function getGroqKey(): string {
  return process.env.GROQ_API_KEY || "";
}
function getGeminiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "";
}

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-8b",
];

const CATEGORY_CONTEXT: Record<string, string> = {
  account: "Account & Login issues — common causes: forgotten password, phone number change, 2FA problems, account lockout, or profile recovery.",
  payments: "Payments & ACoins — common causes: failed top-up, ACoins not credited, refund request, transaction dispute, or Pesapal payment issues.",
  marketplace: "AfuMarket Orders — common causes: order not received, seller not shipping, refund request, wrong item, or escrow dispute.",
  messages: "Messaging issues — common causes: messages not sending, media not loading, disappearing messages, blocked contact, or chat encryption errors.",
  content: "Content & Posts — common causes: post not visible, story expired early, video processing failed, or content removed by moderation.",
  safety: "Safety & Privacy — common causes: harassment report, blocked user bypassing, account impersonation, data privacy request, or reporting inappropriate content.",
  technical: "Technical Issue — common causes: app crash, slow performance, push notifications not working, camera/microphone permission, or sync errors.",
  general: "General Enquiry — the user has a general question about AfuChat features, policies, or account management.",
};

function buildSystemPrompt(category: string): string {
  const ctx = CATEGORY_CONTEXT[category] || CATEGORY_CONTEXT.general;
  return `You are AfuChat Support AI, a helpful and empathetic support assistant for AfuChat — a social super-app with messaging, social posts, AfuPay (ACoins virtual currency), AfuMarket, video sharing, and AI features.

Context for this ticket category: ${ctx}

Your task: Write a helpful, warm, and professional first response to the user's support request.

Guidelines:
- Open with genuine empathy for their situation (2–3 words max, no generic "I hope this message finds you well")
- Acknowledge the specific issue they described
- Provide 2–4 actionable troubleshooting steps or information relevant to their exact problem
- If it's a payment/ACoins issue, reassure them their funds are safe
- If it's a technical issue, include at least one self-service step (restart app, clear cache, check connection)
- End with: "If this doesn't resolve your issue, our human support team will follow up shortly."
- Tone: warm, concise, helpful — like a knowledgeable friend, not a corporate bot
- Length: 80–180 words
- Do NOT use markdown headers or bullet point symbols (•, -, *) — use numbered steps only when listing actions
- Do NOT promise refunds or account actions — those require human review
- Sign off as: "AfuChat Support Team"`;
}

async function callGroq(
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  const GROQ_API_KEY = getGroqKey();
  if (!GROQ_API_KEY) return null;

  const client = new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  for (const model of GROQ_MODELS) {
    try {
      const resp = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 350,
        temperature: 0.6,
      });
      const text = resp.choices[0]?.message?.content?.trim();
      if (text) {
        logger.info({ model }, "[ai-draft] Groq generated draft");
        return text;
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 429 || status === 503) {
        logger.warn({ model, status }, "[ai-draft] Groq model unavailable, trying next");
        continue;
      }
      logger.warn({ model, err: err?.message }, "[ai-draft] Groq error");
    }
  }
  return null;
}

async function callGemini(
  systemPrompt: string,
  userMessage: string,
): Promise<string | null> {
  const GEMINI_API_KEY = getGeminiKey();
  if (!GEMINI_API_KEY) return null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n---\nUser's ticket:\n${userMessage}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 350,
            temperature: 0.6,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        const body = await resp.text();
        logger.warn({ model, status: resp.status, body }, "[ai-draft] Gemini error");
        continue;
      }

      const data: any = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        logger.info({ model }, "[ai-draft] Gemini generated draft");
        return text;
      }
    } catch (err: any) {
      logger.warn({ model, err: err?.message }, "[ai-draft] Gemini error");
    }
  }
  return null;
}

export interface AiDraftInput {
  ticketId: string;
  subject: string;
  category: string;
  userMessage: string;
  userName?: string;
}

/**
 * Generate an AI draft reply and insert it into support_messages.
 * Returns true if a draft was successfully generated and stored.
 */
export async function generateAiDraft(input: AiDraftInput): Promise<boolean> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn("[ai-draft] SUPABASE_SERVICE_ROLE_KEY not set — skipping");
    return false;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Guard: skip if an AI draft already exists for this ticket
  const { data: existing } = await admin
    .from("support_messages")
    .select("id")
    .eq("ticket_id", input.ticketId)
    .eq("sender_type", "ai")
    .limit(1);

  if (existing && existing.length > 0) {
    logger.info({ ticketId: input.ticketId }, "[ai-draft] Draft already exists, skipping");
    return false;
  }

  const systemPrompt = buildSystemPrompt(input.category);
  const userPrompt = `Subject: ${input.subject}\n\nMessage from ${input.userName || "the user"}:\n${input.userMessage}`;

  let draft: string | null = null;

  try {
    // Try Groq first, then Gemini
    draft = await callGroq(systemPrompt, userPrompt);
    if (!draft) {
      draft = await callGemini(systemPrompt, userPrompt);
    }
  } catch (err) {
    logger.error({ err }, "[ai-draft] Unexpected error during generation");
  }

  if (!draft) {
    logger.warn({ ticketId: input.ticketId }, "[ai-draft] All providers failed — no draft generated");
    return false;
  }

  // Insert AI draft as a message
  const { error } = await admin.from("support_messages").insert({
    ticket_id: input.ticketId,
    sender_id: null,
    sender_type: "ai",
    message: draft,
    is_internal: false,
    metadata: {
      ai_draft: true,
      generated_at: new Date().toISOString(),
      provider: getGroqKey() ? "groq_or_gemini" : "gemini",
    },
  });

  if (error) {
    logger.error({ error, ticketId: input.ticketId }, "[ai-draft] Failed to insert draft");
    return false;
  }

  // Mark ticket as having an AI draft for staff dashboard
  await admin
    .from("support_tickets")
    .update({ has_ai_draft: true })
    .eq("id", input.ticketId)
    .then(({ error: e }) => {
      if (e) {
        // Column may not exist yet — non-fatal, draft is still inserted
        logger.info({ ticketId: input.ticketId }, "[ai-draft] has_ai_draft column not yet present (non-fatal)");
      }
    });

  logger.info({ ticketId: input.ticketId }, "[ai-draft] Draft inserted successfully");
  return true;
}
