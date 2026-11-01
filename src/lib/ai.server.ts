import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./gateway-run-id";

const GATEWAY_URL = "https://ai.gateway.lovable.dev";

/**
 * Machine-learning pipeline model. google/gemini-3.1-flash-lite is the
 * gateway's cost-efficient model for high-volume extraction tasks — the
 * article classification/sentiment/summarization pipeline runs on every
 * collected story, so a high-volume model is the right fit here.
 */
const ML_MODEL = "google/gemini-3.1-flash-lite";

export const NEWS_CATEGORIES = [
  "Politics",
  "Business",
  "Sports",
  "Technology",
  "Entertainment",
  "Health",
  "Education",
  "National",
  "World",
  "Other",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

const itemSchema = z.object({
  index: z.number().int().min(0),
  category: z.enum(NEWS_CATEGORIES),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  sentimentScore: z.number().min(-1).max(1),
  summary: z.string().min(20).max(600),
  keywords: z.array(z.string().min(2).max(40)).min(2).max(6),
});

export type ArticleAnalysis = Omit<z.infer<typeof itemSchema>, "index">;

export interface AnalysisItem {
  id: string;
  title: string;
  excerpt: string;
}

function createProvider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: `${GATEWAY_URL}/v1`,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });
  return provider;
}

function extractJsonArray(text: string): unknown {
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = (fence[1] ?? "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) throw new Error("No JSON array in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function buildPrompt(items: AnalysisItem[], strict: boolean): string {
  const listed = items
    .map(
      (item, i) =>
        `ITEM ${i}\nTITLE: ${item.title}\nTEXT: ${(item.excerpt || "").slice(0, 700) || "(no body text — use the title)"}`,
    )
    .join("\n\n");

  return `You are the ML analysis engine of an Indian domestic news collection system. For each news item below, perform:
1. TOPIC CLASSIFICATION — pick exactly one category: Politics, Business, Sports, Technology, Entertainment, Health, Education, National, World, Other.
   "National" is for important Indian domestic news that spans multiple topics (courts, governance, disasters, crime of national interest). "Politics" only when politics/elections/parties are the main subject.
2. SENTIMENT ANALYSIS — label positive, neutral or negative, plus a score from -1.0 (very negative) to 1.0 (very positive). Neutral items score between -0.2 and 0.2.
3. ABSTRACTIVE SUMMARIZATION — a neutral 2-sentence summary (max 45 words) of the story.
4. KEYWORD EXTRACTION — 3 to 5 short keyphrases (proper nouns, places, organisations, topics).

${strict ? "Your previous answer was not valid JSON. Return ONLY a JSON array, no prose, no markdown fences." : "Return ONLY a JSON array, no prose, no markdown fences."}
Each element must be exactly:
{"index": <item number>, "category": "<category>", "sentiment": "<positive|neutral|negative>", "sentimentScore": <number -1 to 1>, "summary": "<summary>", "keywords": ["<kw>", ...]}

NEWS ITEMS:
${listed}`;
}

/**
 * Runs the ML pipeline over a batch of articles with a single model call.
 * Returns analyses keyed by article id; items the model could not analyse
 * are simply absent from the result.
 */
export async function analyzeArticleBatch(items: AnalysisItem[]): Promise<Map<string, ArticleAnalysis>> {
  if (items.length === 0) return new Map();
  const provider = createProvider();

  let text = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = streamText({
      model: provider(ML_MODEL),
      maxOutputTokens: 2400,
      maxRetries: 0,
      prompt: buildPrompt(items, attempt > 0),
    });
    text = await result.text;

    try {
      const parsed = z.array(itemSchema).parse(extractJsonArray(text));
      const byIndex = new Map(parsed.map((p) => [p.index, p]));
      const out = new Map<string, ArticleAnalysis>();
      items.forEach((item, i) => {
        const found = byIndex.get(i) ?? byIndex.get(-1);
        if (!found) return;
        out.set(item.id, {
          category: found.category,
          sentiment: found.sentiment,
          sentimentScore: found.sentimentScore,
          summary: found.summary,
          keywords: found.keywords,
        });
      });
      if (out.size > 0) return out;
    } catch {
      // fall through to the strict retry
    }
  }
  return new Map();
}
