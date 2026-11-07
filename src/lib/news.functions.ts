import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createPublicClient } from "./supabase-public.server";
import { collectAllSources, processPendingArticles } from "./collect.server";
import { ADMIN_EMAIL, isAdminEmail } from "./admin-identity";

export interface NewsArticleDTO {
  id: string;
  title: string;
  link: string;
  excerpt: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  collectedAt: string;
  category: string;
  sentiment: string;
  sentimentScore: number | null;
  summary: string | null;
  keywords: string[];
  mlProcessed: boolean;
  sourceName: string | null;
  sourceHomepage: string | null;
}

export interface NewsStats {
  totalArticles: number;
  processedArticles: number;
  activeSources: number;
  categories: { name: string; count: number }[];
  sentiments: { name: string; count: number }[];
  lastCollectedAt: string | null;
}

const articleSelect =
  "id, title, link, excerpt, image_url, published_at, collected_at, category, sentiment, sentiment_score, summary, keywords, ml_processed, news_sources(name, homepage_url)";

interface RawArticle {
  id: string;
  title: string;
  link: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
  collected_at: string;
  category: string;
  sentiment: string;
  sentiment_score: number | null;
  summary: string | null;
  keywords: string[] | null;
  ml_processed: boolean;
  news_sources: { name: string | null; homepage_url: string | null } | null;
}

function toDto(row: RawArticle): NewsArticleDTO {
  return {
    id: row.id,
    title: row.title,
    link: row.link,
    excerpt: row.excerpt,
    imageUrl: row.image_url,
    publishedAt: row.published_at,
    collectedAt: row.collected_at,
    category: row.category,
    sentiment: row.sentiment,
    sentimentScore: row.sentiment_score === null ? null : Number(row.sentiment_score),
    summary: row.summary,
    keywords: row.keywords ?? [],
    mlProcessed: row.ml_processed,
    sourceName: row.news_sources?.name ?? null,
    sourceHomepage: row.news_sources?.homepage_url ?? null,
  };
}

function computeStats(rows: NewsArticleDTO[], totalArticles: number, activeSources: number, processedTotal: number): NewsStats {
  const categories = new Map<string, number>();
  const sentiments = new Map<string, number>();
  let lastCollectedAt: string | null = null;

  for (const row of rows) {
    categories.set(row.category, (categories.get(row.category) ?? 0) + 1);
    sentiments.set(row.sentiment, (sentiments.get(row.sentiment) ?? 0) + 1);
    if (!lastCollectedAt || row.collectedAt > lastCollectedAt) lastCollectedAt = row.collectedAt;
  }

  return {
    totalArticles,
    processedArticles: processedTotal,
    activeSources,
    categories: [...categories.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    sentiments: [...sentiments.entries()].map(([name, count]) => ({ name, count })),
    lastCollectedAt,
  };
}

export const getNewsFeed = createServerFn({ method: "GET" }).handler(async (): Promise<{
  articles: NewsArticleDTO[];
  stats: NewsStats;
  error?: string;
}> => {
  try {
    const supabase = createPublicClient();
    const [{ data: articles }, { count: totalArticles }, { count: activeSources }, { count: processedTotal }] =
      await Promise.all([
      supabase
        .from("articles")
        .select(articleSelect)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(150),
      supabase.from("articles").select("id", { count: "exact", head: true }),
      supabase.from("news_sources").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("ml_processed", true),
    ]);

    const rows = ((articles ?? []) as unknown as RawArticle[]).map(toDto);
    return {
      articles: rows,
      stats: computeStats(rows, totalArticles ?? rows.length, activeSources ?? 0, processedTotal ?? 0),
    };
  } catch (error) {
    console.error("getNewsFeed failed:", error);
    return {
      articles: [],
      stats: {
        totalArticles: 0,
        processedArticles: 0,
        activeSources: 0,
        categories: [],
        sentiments: [],
        lastCollectedAt: null,
      },
      error: error instanceof Error ? error.message : "Could not load the news feed",
    };
  }
});

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<{ article: NewsArticleDTO | null; related: NewsArticleDTO[] }> => {
    const supabase = createPublicClient();
    const { data: row } = await supabase.from("articles").select(articleSelect).eq("id", data.id).maybeSingle();

    if (!row) return { article: null, related: [] };
    const article = toDto(row as unknown as RawArticle);

    const { data: relatedRows } = await supabase
      .from("articles")
      .select(articleSelect)
      .eq("category", article.category)
      .neq("id", article.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(6);

    return { article, related: ((relatedRows ?? []) as unknown as RawArticle[]).map(toDto) };
  });

async function assertAdmin(context: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
  claims: Record<string, unknown>;
}) {
  if (!isAdminEmail(typeof context.claims.email === "string" ? context.claims.email : null)) {
    throw new Error("Forbidden — admin access required");
  }
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden — admin access required");
}

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: totalArticles }, { count: pendingArticles }, { count: activeSources }, { data: runs }, { data: sources }] =
      await Promise.all([
        supabaseAdmin.from("articles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("articles").select("id", { count: "exact", head: true }).eq("ml_processed", false),
        supabaseAdmin.from("news_sources").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabaseAdmin
          .from("collection_runs")
          .select("id, trigger, status, articles_fetched, articles_new, articles_failed, articles_processed, message, started_at, finished_at")
          .order("started_at", { ascending: false })
          .limit(10),
        supabaseAdmin.from("news_sources").select("id, name, feed_url, homepage_url, is_active, created_at").order("name"),
      ]);

    const { data: categoryRows } = await supabaseAdmin
      .from("articles")
      .select("category, sentiment, ml_processed");

    const categories = new Map<string, number>();
    const sentiments = new Map<string, number>();
    let processed = 0;
    for (const row of categoryRows ?? []) {
      categories.set(row.category, (categories.get(row.category) ?? 0) + 1);
      sentiments.set(row.sentiment, (sentiments.get(row.sentiment) ?? 0) + 1);
      if (row.ml_processed) processed++;
    }

    return {
      stats: {
        totalArticles: totalArticles ?? 0,
        pendingArticles: pendingArticles ?? 0,
        processedArticles: processed,
        activeSources: activeSources ?? 0,
        categories: [...categories.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        sentiments: [...sentiments.entries()].map(([name, count]) => ({ name, count })),
      },
      runs: runs ?? [],
      sources: sources ?? [],
    };
  });

export const runCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);

    const collect = await collectAllSources("manual");
    const ml = await processPendingArticles(24);

    return {
      fetched: collect.fetched,
      inserted: collect.inserted,
      failedSources: collect.failed,
      processedByMl: ml.processed,
      sources: collect.sources,
    };
  });

export const processPending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const result = await processPendingArticles(24);
    return result;
  });

export const addSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; feedUrl: string; homepageUrl?: string | undefined }) =>
    z
      .object({
        name: z.string().min(2).max(120),
        feedUrl: z.string().url().max(500),
        homepageUrl: z.string().url().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("news_sources").insert({
      name: data.name,
      feed_url: data.feedUrl,
      homepage_url: data.homepageUrl ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; isActive: boolean }) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("news_sources").update({ is_active: data.isActive }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("news_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
