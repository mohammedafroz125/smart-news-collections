import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getNewsFeed, type NewsArticleDTO } from "@/lib/news.functions";
import { timeAgo, sentimentStyle, formatSentimentScore } from "@/lib/news-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const feedQueryOptions = queryOptions({
  queryKey: ["news-feed"],
  queryFn: () => getNewsFeed(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(feedQueryOptions),
  head: () => ({
    meta: [
      {
        title: "Domestic News Collections using ML — Live Indian News Dashboard",
      },
      {
        name: "description",
        content:
          "Live dashboard of Indian domestic news collected from national RSS sources, automatically classified by topic, scored for sentiment, summarised and tagged with keywords by machine learning.",
      },
      { property: "og:title", content: "Domestic News Collections using ML" },
      {
        property: "og:description",
        content: "Indian news collected automatically and organised by machine learning — topic, sentiment, summary and keywords.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function ArticleCard({ article, index }: { article: NewsArticleDTO; index: number }) {
  const sentiment = sentimentStyle(article.sentiment);
  return (
    <article
      className="headline-card group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <Link to="/article/$articleId" params={{ articleId: article.id }} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/25">
              <span className="font-display text-4xl font-black text-primary/40">
                {article.category.charAt(0)}
              </span>
            </div>
          )}
          <span className="kicker absolute left-2 top-2 rounded-sm bg-background/90 px-2 py-0.5 text-foreground">
            {article.category}
          </span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80">{article.sourceName ?? "Unknown source"}</span>
          <span aria-hidden>·</span>
          <span>{timeAgo(article.publishedAt ?? article.collectedAt)}</span>
        </div>
        <Link to="/article/$articleId" params={{ articleId: article.id }}>
          <h2 className="font-display text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
            {article.title}
          </h2>
        </Link>
        {article.mlProcessed && article.summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="kicker mr-1 text-primary">ML summary</span>
            {article.summary}
          </p>
        ) : (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{article.excerpt}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${sentiment.bg} ${sentiment.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sentiment.dot}`} />
            {sentiment.label} {article.mlProcessed ? formatSentimentScore(article.sentimentScore) : ""}
          </span>
          {article.keywords.slice(0, 3).map((keyword) => (
            <Badge key={keyword} variant="outline" className="font-normal text-muted-foreground">
              {keyword}
            </Badge>
          ))}
          <a
            href={article.link}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Source <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

function Ticker({ headlines }: { headlines: string[] }) {
  if (headlines.length === 0) return null;
  const content = headlines.map((headline, i) => (
    <span key={i} className="mx-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {headline}
    </span>
  ));
  return (
    <div className="overflow-hidden border-b border-border bg-secondary/70 py-2">
      <div className="flex w-max animate-ticker">
        <div className="flex">{content}</div>
        <div className="flex" aria-hidden>
          {content}
        </div>
      </div>
    </div>
  );
}

function Index() {
  const { data } = useSuspenseQuery(feedQueryOptions);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const articles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.articles.filter((article) => {
      if (category && article.category !== category) return false;
      if (!query) return true;
      return (
        article.title.toLowerCase().includes(query) ||
        (article.excerpt ?? "").toLowerCase().includes(query) ||
        article.keywords.some((keyword) => keyword.toLowerCase().includes(query))
      );
    });
  }, [data.articles, search, category]);

  const shownCategories = data.stats.categories;
  const mlShare = data.stats.totalArticles
    ? Math.round((data.stats.processedArticles / data.stats.totalArticles) * 100)
    : 0;

  return (
    <div>
      <Ticker headlines={data.articles.slice(0, 8).map((article) => article.title)} />

      <section className="mx-auto max-w-6xl px-4 pt-10">
        <p className="kicker text-accent-foreground">
          India · collected automatically · organised by machine learning
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-black leading-tight text-foreground sm:text-4xl">
          Today's domestic headlines, classified by our ML pipeline
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Every story below was collected from live Indian news feeds, then run through the machine-learning
          pipeline for topic classification, sentiment scoring, abstractive summarisation and keyword extraction.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Stories collected", value: data.stats.totalArticles.toLocaleString() },
            { label: "ML processed", value: `${mlShare}%` },
            { label: "Active sources", value: data.stats.activeSources },
            {
              label: "Last collection",
              value: data.stats.lastCollectedAt ? timeAgo(data.stats.lastCollectedAt) : "—",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4">
              <div className="font-display text-2xl font-bold text-primary sm:text-3xl">{stat.value}</div>
              <div className="kicker mt-1 text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search headlines or keywords…"
            className="sm:max-w-xs"
            aria-label="Search headlines"
            suppressHydrationWarning
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={category === null ? "default" : "outline"}
              onClick={() => setCategory(null)}
            >
              All
            </Button>
            {shownCategories.map((cat) => (
              <Button
                key={cat.name}
                type="button"
                size="sm"
                variant={category === cat.name ? "default" : "outline"}
                onClick={() => setCategory(category === cat.name ? null : cat.name)}
              >
                {cat.name} <span className="opacity-60">{cat.count}</span>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4 pb-4">
        {data.error && articles.length === 0 ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            Could not load the news feed: {data.error}
          </p>
        ) : articles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <p className="font-display text-lg font-semibold text-foreground">No stories match yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The collection runs on a schedule and the ML pipeline tags each story a few minutes later. Check
              back shortly.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.slice(0, 60).map((article, index) => (
              <ArticleCard key={article.id} article={article} index={index} />
            ))}
          </div>
        )}
        {articles.length > 60 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Showing the 60 most recent of {articles.length} matching stories.
          </p>
        )}
      </section>
    </div>
  );
}
