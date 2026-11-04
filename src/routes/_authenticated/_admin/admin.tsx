import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Inbox, Loader2, Newspaper, Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getAdminData,
  runCollection,
  processPending,
  addSource,
  toggleSource,
  deleteSource,
} from "@/lib/news.functions";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/news-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  head: () => ({
    meta: [
      { title: "Newsroom Admin — Domestic News Collections" },
      {
        name: "description",
        content: "Manage news sources, run the collection and ML pipeline, and review collection history.",
      },
      { property: "og:title", content: "Newsroom Admin" },
      { property: "og:description", content: "Manage sources, collections and the ML pipeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="font-display text-2xl font-bold text-primary">{value}</div>
      <div className="kicker mt-1 text-muted-foreground">{label}</div>
    </div>
  );
}

function AdminPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  const { data, isPending, error } = useQuery({
    queryKey: ["admin-data"],
    queryFn: () => getAdminData(),
  });

  const runCollectionFn = useServerFn(runCollection);
  const processPendingFn = useServerFn(processPending);
  const addSourceFn = useServerFn(addSource);
  const toggleSourceFn = useServerFn(toggleSource);
  const deleteSourceFn = useServerFn(deleteSource);

  const [collecting, setCollecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newHomepage, setNewHomepage] = useState("");
  const [adding, setAdding] = useState(false);

  if (error) {
    const forbidden = error.message.includes("Forbidden");
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="font-display text-xl font-bold text-foreground">
            {forbidden ? "Admin access required" : "Could not load the admin console"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {forbidden
              ? "Your account does not have the admin role. The first account created in this project automatically becomes the admin."
              : error.message}
          </p>
        </div>
      </div>
    );
  }

  async function handleCollect() {
    setCollecting(true);
    try {
      const result = await runCollectionFn();
      toast.success(
        `Collection finished: ${result.inserted} new stories from ${result.fetched} fetched; ML tagged ${result.processedByMl}.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Collection failed");
    } finally {
      setCollecting(false);
    }
  }

  async function handleProcess() {
    setProcessing(true);
    try {
      const result = await processPendingFn();
      toast.success(`ML pipeline tagged ${result.processed} stories.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "ML processing failed");
    } finally {
      setProcessing(false);
    }
  }

  async function handleAddSource() {
    if (!newName.trim() || !newFeedUrl.trim()) {
      toast.error("Source name and feed URL are required.");
      return;
    }
    setAdding(true);
    try {
      await addSourceFn({
        data: {
          name: newName.trim(),
          feedUrl: newFeedUrl.trim(),
          homepageUrl: newHomepage.trim() || undefined,
        },
      });
      toast.success(`Added source "${newName.trim()}".`);
      setNewName("");
      setNewFeedUrl("");
      setNewHomepage("");
      await queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not add the source");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await toggleSourceFn({ data: { id, isActive } });
      await queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update the source");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remove the source "${name}"? Its collected stories stay in the database.`)) return;
    try {
      await deleteSourceFn({ data: { id } });
      toast.success(`Removed source "${name}".`);
      await queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not remove the source");
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
    router.invalidate();
  }

  if (isPending || !data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { stats, sources, runs } = data;
  const sentimentData = ["positive", "neutral", "negative"].map((name) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: stats.sentiments.find((s) => s.name === name)?.count ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker text-accent-foreground">Control room</p>
          <h1 className="font-display text-3xl font-black text-foreground">Newsroom admin</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCollect} disabled={collecting}>
            {collecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {collecting ? "Collecting…" : "Run collection"}
          </Button>
          <Button variant="outline" onClick={handleProcess} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {processing ? "Processing…" : "Run ML on pending"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/settings">Settings</Link>
          </Button>
          <Button variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total stories" value={stats.totalArticles} />
        <StatCard label="ML processed" value={stats.processedArticles} />
        <StatCard label="Pending ML" value={stats.pendingArticles} />
        <StatCard label="Active sources" value={stats.activeSources} />
      </div>

      {stats.pendingArticles > 0 && (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm text-accent-foreground">
          <Inbox className="h-4 w-4 shrink-0" />
          {stats.pendingArticles} collected {stats.pendingArticles === 1 ? "story is" : "stories are"} waiting for
          the ML pipeline — use "Run ML on pending" or wait for the scheduled job.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold text-foreground">Stories by topic</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categories.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold text-foreground">Sentiment split</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {sentimentData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">News sources</h2>
          <Badge variant="secondary">{sources.length} configured</Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source-name" className="sr-only">
              Source name
            </Label>
            <Input
              id="source-name"
              placeholder="Source name, e.g. Deccan Herald"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="source-feed" className="sr-only">
              RSS feed URL
            </Label>
            <Input
              id="source-feed"
              placeholder="RSS feed URL (https://…)"
              value={newFeedUrl}
              onChange={(event) => setNewFeedUrl(event.target.value)}
            />
          </div>
          <Button onClick={handleAddSource} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add source
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>RSS feed</TableHead>
                <TableHead className="text-center">Collecting</TableHead>
                <TableHead className="text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                    <a href={source.feed_url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                      {source.feed_url}
                    </a>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={source.is_active} onCheckedChange={(checked) => handleToggle(source.id, checked)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(source.id, source.name)}
                      aria-label={`Remove ${source.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold text-foreground">Recent collection runs</h2>
        </div>
        {runs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No runs yet — press "Run collection" to fetch the first batch of stories.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Fetched</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead className="text-right">Source errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{timeAgo(run.started_at)}</TableCell>
                    <TableCell className="capitalize">{run.trigger}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          run.status === "success"
                            ? "text-sentiment-positive"
                            : run.status === "failed"
                              ? "text-sentiment-negative"
                              : "text-sentiment-neutral"
                        }
                      >
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{run.articles_fetched}</TableCell>
                    <TableCell className="text-right">{run.articles_new}</TableCell>
                    <TableCell className="text-right">{run.articles_failed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
