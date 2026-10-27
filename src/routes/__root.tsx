import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Back to headlines
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Domestic News Collections using ML" },
      {
        name: "description",
        content:
          "An MCA major project that collects Indian domestic news from live RSS sources and uses machine learning to classify topics, analyse sentiment, summarise stories and extract keywords.",
      },
      { property: "og:title", content: "Domestic News Collections using ML" },
      {
        property: "og:description",
        content: "Indian news collected automatically and organised by machine learning — topic, sentiment, summary and keywords.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Public+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="group flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            MCA Major Project · 2024–2026
          </span>
          <span className="font-display text-xl font-black leading-tight text-foreground sm:text-2xl">
            Domestic News Collections{" "}
            <span className="text-primary">using ML</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link
            to="/"
            className="rounded-md px-2 py-1.5 text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
          >
            Headlines
          </Link>
          <Link
            to="/about"
            className="rounded-md px-2 py-1.5 text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground sm:px-3"
          >
            The ML Pipeline
          </Link>
          <Link
            to="/admin"
            className="rounded-md bg-primary px-2 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90 sm:px-3"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary/60">
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-xs leading-relaxed text-muted-foreground">
        <p className="font-display text-sm font-semibold text-foreground">
          Domestic News Collections using ML
        </p>
        <p className="mt-1">
          MCA Major Project · Mohammed Afroz (Hall Ticket 1314-24-862-003) · Guide: Ms. Rana Tilath,
          Assistant Professor, Department of Computer Science–MCA
        </p>
        <p className="mt-1">
          MESCO Institute of Management and Computer Sciences, Mustaid Pura, Karwan Road, Hyderabad – 500006, T.G.
        </p>
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => authListener.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
