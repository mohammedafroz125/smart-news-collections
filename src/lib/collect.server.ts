import { fetchFeed } from "./rss.server";
import { analyzeArticleBatch, type AnalysisItem } from "./ai.server";

const MAX_ITEMS_PER_FEED = 15;
const MAX_AGE_DAYS = 4;

export interface SourceOutcome {
  name: string;
  fetched: number;
  inserted: number;
  error?: string;
}

export interface CollectResult {
  runId: string;
  fetched: number;
  inserted: number;
  failed: number;
  sources: SourceOutcome[];
}

type AdminClient = Awaited<ReturnType<typeof loadAdminClient>>;

async function loadAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Collects the latest stories from every active RSS source, deduplicates
 * against the database and stores new articles (not yet ML-processed).
 */
export async function collectAllSources(trigger: "manual" | "scheduled"): Promise<CollectResult> {
  const supabaseAdmin = await loadAdminClient();

  const { data: sources, error: sourcesError } = await supabaseAdmin
    .from("news_sources")
    .select("id, name, feed_url")
    .eq("is_active", true);

  if (sourcesError) throw new Error(`Could not load news sources: ${sourcesError.message}`);

  const { data: runRow, error: runError } = await supabaseAdmin
    .from("collection_runs")
    .insert({ trigger, status: "running" })
    .select("id")
    .single();
  if (runError || !runRow) throw new Error(`Could not start collection run: ${runError?.message}`);

  const runId = runRow.id;
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const outcomes: SourceOutcome[] = [];

  await Promise.all(
    (sources ?? []).map(async (source) => {
      try {
        const items = await fetchFeed(source.feed_url, MAX_ITEMS_PER_FEED);
        const recent = items.filter((item) => !item.publishedAt || new Date(item.publishedAt).getTime() >= cutoff);

        let inserted = 0;
        if (recent.length > 0) {
          const links = recent.map((item) => item.link);
          const { data: existing } = await supabaseAdmin
            .from("articles")
            .select("link")
            .in("link", links);
          const known = new Set((existing ?? []).map((row) => row.link));
          const fresh = recent.filter((item) => !known.has(item.link));

          if (fresh.length > 0) {
            const rows = fresh.map((item) => ({
              source_id: source.id,
              title: item.title.slice(0, 500),
              link: item.link,
              excerpt: item.excerpt || null,
              image_url: item.imageUrl ?? null,
              published_at: item.publishedAt ?? null,
            }));
            const { data: insertedRows, error: insertError } = await supabaseAdmin
              .from("articles")
              .upsert(rows, { onConflict: "link", ignoreDuplicates: true })
              .select("id");
            if (insertError) throw insertError;
            inserted = insertedRows?.length ?? 0;
          }
        }

        outcomes.push({ name: source.name, fetched: items.length, inserted });
      } catch (error) {
        outcomes.push({
          name: source.name,
          fetched: 0,
          inserted: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );

  const fetched = outcomes.reduce((sum, o) => sum + o.fetched, 0);
  const inserted = outcomes.reduce((sum, o) => sum + o.inserted, 0);
  const failed = outcomes.filter((o) => o.error).length;
  const status = failed === 0 ? "success" : failed === outcomes.length && outcomes.length > 0 ? "failed" : "partial";
  const firstError = outcomes.find((o) => o.error)?.error;

  await supabaseAdmin
    .from("collection_runs")
    .update({
      status,
      articles_fetched: fetched,
      articles_new: inserted,
      articles_failed: failed,
      message:
        status === "success"
          ? `Collected ${fetched} stories from ${outcomes.length} sources; ${inserted} new.`
          : `Collected ${fetched} stories (${inserted} new); ${failed} source(s) failed. Last error: ${firstError}`,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  return { runId, fetched, inserted, failed, sources: outcomes };
}

/**
 * Runs the ML pipeline (classification, sentiment, summarization,
 * keywords) over pending articles in one batched model call.
 */
export async function processPendingArticles(limit: number): Promise<{ processed: number; failed: number }> {
  const supabaseAdmin = await loadAdminClient();

  const { data: pending } = await supabaseAdmin
    .from("articles")
    .select("id, title, excerpt")
    .eq("ml_processed", false)
    .order("collected_at", { ascending: true })
    .limit(limit);

  if (!pending || pending.length === 0) return { processed: 0, failed: 0 };

  const items: AnalysisItem[] = pending.map((article) => ({
    id: article.id,
    title: article.title,
    excerpt: article.excerpt ?? "",
  }));

  let analyses;
  try {
    analyses = await analyzeArticleBatch(items);
  } catch (error) {
    console.error("ML pipeline call failed:", error);
    return { processed: 0, failed: pending.length };
  }

  let processed = 0;
  for (const article of pending) {
    const analysis = analyses.get(article.id);
    if (!analysis) continue;
    const { error } = await supabaseAdmin
      .from("articles")
      .update({
        category: analysis.category,
        sentiment: analysis.sentiment,
        sentiment_score: analysis.sentimentScore,
        summary: analysis.summary,
        keywords: analysis.keywords,
        ml_processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("id", article.id);
    if (!error) processed++;
  }

  return { processed, failed: pending.length - processed };
}
