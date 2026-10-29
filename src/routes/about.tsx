import { createFileRoute } from "@tanstack/react-router";
import { Rss, Tags, Gauge, FileText, KeyRound, Database } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "How the ML Pipeline Works — Domestic News Collections" },
      {
        name: "description",
        content:
          "The five-stage machine-learning pipeline behind Domestic News Collections: RSS collection, preprocessing, topic classification, sentiment analysis, summarisation and keyword extraction.",
      },
      { property: "og:title", content: "How the ML Pipeline Works" },
      {
        property: "og:description",
        content: "The five-stage machine-learning pipeline behind Domestic News Collections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const STAGES = [
  {
    icon: Rss,
    title: "1 · News collection",
    body: "The system subscribes to RSS feeds of major Indian national newsrooms. A scheduled job fetches every active feed, deduplicates stories against the database and stores new headlines within minutes of publication.",
  },
  {
    icon: Database,
    title: "2 · Preprocessing",
    body: "Raw feed entries are cleaned: CDATA and HTML are stripped, entities are decoded, boilerplate is removed and each story is reduced to a title plus its leading text — the model's input.",
  },
  {
    icon: Tags,
    title: "3 · Topic classification",
    body: "A language model assigns each story one primary label — Politics, Business, Sports, Technology, Entertainment, Health, Education, National, World or Other — so readers can filter the whole corpus by subject.",
  },
  {
    icon: Gauge,
    title: "4 · Sentiment analysis",
    body: "The same pass scores the story's tone on a scale from −1 (very negative) to +1 (very positive) with a matching label, revealing the emotional shape of the day's domestic news.",
  },
  {
    icon: FileText,
    title: "5 · Summarisation & keywords",
    body: "Finally the model writes a neutral two-sentence abstractive summary and extracts 3–5 keyphrases (places, organisations, topics) that power search and the tag chips on every card.",
  },
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="kicker text-accent-foreground">About the project</p>
      <h1 className="mt-2 font-display text-3xl font-black text-foreground sm:text-4xl">
        How the ML pipeline works
      </h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Domestic News Collections using ML</strong> is an MCA major project
        that automatically gathers Indian domestic news and organises it with machine learning. It replaces
        manual monitoring of many newsrooms with one dashboard where every story arrives pre-classified,
        sentiment-scored, summarised and keyword-tagged.
      </p>

      <div className="mt-10 grid gap-4">
        {STAGES.map((stage) => (
          <div key={stage.title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <stage.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">{stage.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{stage.body}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-foreground">Technology</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li className="rounded-md border border-border bg-card p-3">
            <strong className="text-foreground">Collection:</strong> scheduled fetchers over national RSS feeds
            with deduplication by story link
          </li>
          <li className="rounded-md border border-border bg-card p-3">
            <strong className="text-foreground">Machine learning:</strong> a large language model on the Lovable
            AI gateway performs classification, sentiment scoring, abstractive summarisation and keyword
            extraction
          </li>
          <li className="rounded-md border border-border bg-card p-3">
            <strong className="text-foreground">Storage & security:</strong> a managed cloud database with
            row-level security; admin actions require an authenticated admin role
          </li>
          <li className="rounded-md border border-border bg-card p-3">
            <strong className="text-foreground">Application:</strong> a React front-end rendered on the server,
            with a protected newsroom-admin console
          </li>
        </ul>
      </section>

      <section className="mt-12 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Project credits</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="kicker text-muted-foreground">Project title</dt>
            <dd className="mt-1 font-medium text-foreground">Domestic News Collections using ML</dd>
          </div>
          <div>
            <dt className="kicker text-muted-foreground">Student</dt>
            <dd className="mt-1 font-medium text-foreground">
              Mohammed Afroz · Hall Ticket No: 1314-24-862-003
            </dd>
          </div>
          <div>
            <dt className="kicker text-muted-foreground">Course</dt>
            <dd className="mt-1 font-medium text-foreground">Master of Computer Application (MCA)</dd>
          </div>
          <div>
            <dt className="kicker text-muted-foreground">Guide</dt>
            <dd className="mt-1 font-medium text-foreground">
              Ms. Rana Tilath, Assistant Professor, Department of Computer Science–MCA
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="kicker text-muted-foreground">Institution</dt>
            <dd className="mt-1 font-medium text-foreground">
              MESCO Institute of Management and Computer Sciences, Mesco Educational Complex, Mustaid Pura,
              Karwan Road, Hyderabad – 500006, T.G
            </dd>
          </div>
          <div>
            <dt className="kicker text-muted-foreground">Academic year</dt>
            <dd className="mt-1 font-medium text-foreground">2024–2026</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
