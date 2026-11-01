import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { getArticle, type NewsArticleDTO } from "@/lib/news.functions";
import { timeAgo, sentimentStyle, formatSentimentScore } from "@/lib/news-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/article/$articleId")({
  loader: async ({ params }) => {
    const result = await getArticle({ data: { id: params.articleId } });
    if (!result.article) throw notFound();
    return result;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.article ? `${loaderData.article.title} — Domestic News Collections` : "Story — Domestic News Collections",
      },
      {
        name: "description",
        content:
          loaderData?.article?.summary ??
          loaderData?.article?.excerpt ??
          "A story collected and analysed by the Domestic News Collections ML pipeline.",
      },
      { property: "og:title", content: loaderData?.article?.title ?? "Story — Domestic News Collections" },
      {
        property: "og:description",
        content: loaderData?.article?.summary ?? loaderData?.article?.excerpt ?? "Collected and analysed by the ML pipeline.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArticleDetail,
});

function RelatedItem({ article }: { article: NewsArticleDTO }) {
  return (
    <Link
      to="/article/$articleId"
      params={{ articleId: article.id }}
      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary"
    >
      <div className="text-xs text-muted-foreground">
        {article.sourceName ?? "Unknown source"} · {timeAgo(article.publishedAt ?? article.collectedAt)}
      </div>
      <div className="mt-1 font-display text-sm font-bold leading-snug text-foreground">{article.title}</div>
    </Link>
  );
}

function ArticleDetail() {
  const { article, related } = Route.useLoaderData();
  if (!article) throw notFound();
  const sentiment = sentimentStyle(article.sentiment);
  const scorePercent = article.sentimentScore === null ? 50 : Math.round(((article.sentimentScore + 1) / 2) * 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to headlines
      </Link>

      <article className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">{article.category}</Badge>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${sentiment.bg} ${sentiment.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sentiment.dot}`} />
            {sentiment.label} sentiment · {formatSentimentScore(article.sentimentScore)}
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl font-black leading-tight text-foreground sm:text-4xl">
          {article.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground/80">{article.sourceName ?? "Unknown source"}</span>
          <span aria-hidden>·</span>
          <span>Published {timeAgo(article.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span>Collected {timeAgo(article.collectedAt)}</span>
        </div>

        {article.imageUrl && (
          <img
            src={article.imageUrl}
            alt=""
            className="mt-6 aspect-[16/9] w-full rounded-lg border border-border object-cover"
          />
        )}

        {article.mlProcessed ? (
          <section className="mt-8 rounded-lg border-l-4 border-accent bg-accent/10 p-5">
            <p className="kicker text-accent-foreground">Machine-generated summary</p>
            <p className="mt-2 font-display text-lg leading-relaxed text-foreground">{article.summary}</p>
          </section>
        ) : (
          <p className="mt-8 rounded-lg border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
            The ML pipeline has not tagged this story yet — topic, sentiment, summary and keywords appear here a
            few minutes after collection.
          </p>
        )}

        {article.excerpt && (
          <section className="mt-6">
            <p className="kicker text-muted-foreground">Original feed text</p>
            <p className="mt-2 leading-relaxed text-foreground/90">{article.excerpt}</p>
          </section>
        )}

        {article.keywords.length > 0 && (
          <section className="mt-6">
            <p className="kicker text-muted-foreground">ML-extracted keywords</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {article.keywords.map((keyword) => (
                <Badge key={keyword} variant="outline" className="font-normal">
                  {keyword}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {article.mlProcessed && article.sentimentScore !== null && (
          <section className="mt-8">
            <p className="kicker text-muted-foreground">Sentiment score</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${sentiment.dot}`}
                style={{ width: `${Math.min(100, Math.max(4, scorePercent))}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Negative</span>
              <span>Neutral</span>
              <span>Positive</span>
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <a href={article.link} target="_blank" rel="noreferrer noopener">
              Read the full story at {article.sourceName ?? "the source"} <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          {article.sourceHomepage && (
            <Button asChild variant="outline">
              <a href={article.sourceHomepage} target="_blank" rel="noreferrer noopener">
                Visit {article.sourceName ?? "source"}
              </a>
            </Button>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-foreground">
            More in {article.category}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((item) => (
              <RelatedItem key={item.id} article={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
