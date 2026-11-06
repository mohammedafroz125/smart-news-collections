<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project — Domestic News Collections using ML

MCA major project (Mohammed Afroz, Hall Ticket 1314-24-862-003; guide Ms. Rana
Tilath, MESCO Institute of Management and Computer Sciences, Hyderabad).

## Architecture rules
- News collection is server-side only: RSS fetch/parse lives in `src/lib/rss.server.ts`,
  the pipeline in `src/lib/collect.server.ts`; never fetch feeds from the browser.
- ML calls go through the Lovable AI gateway in `src/lib/ai.server.ts` using
  `google/gemini-3.1-flash-lite` (high-volume extraction task; cheap + fast enough for
  per-article scheduled runs). Create the provider inside each handler, never at module scope.
- Articles are stored unclassified (`ml_processed = false`); ML results are only written
  by `processPendingArticles`. Never ship unprocessed articles as "classified".
- Public reads use the publishable client (`src/lib/supabase-public.server.ts`); writes use
  `supabaseAdmin` loaded inside handlers, after an admin role check via `has_role`.
- Scheduled jobs are TanStack server routes under `/api/public/jobs/*` guarded by
  `authenticateCronRequest`; managed HTTP schedules point at them (collect 3x daily,
  ML processing every 15 min). Keep each scheduled run fast (parallel feed fetch,
  small ML batches) — the scheduler times out in seconds.
- Feed item age limit for collection is 4 days, max 15 items per feed per run.
- The first account created becomes the admin (trigger on auth.users). No profiles table.
- Admin dashboard is admin-only: routes under `src/routes/_authenticated/_admin/`
  are gated by a `has_role` check in the pathless `_admin` layout `beforeLoad`.
  Public sign-up is disabled in Cloud auth — the admin account is the only one.
- Account email/password changes happen only through Admin Settings
  (`/_admin/settings`): current-password re-auth, then email OTP/link verification
  (recovery for password, magiclink for identity, email_change for the new address).
- The sole admin identity is `mohammedafroz125@gmail.com`; enforce it in both the
  admin route gate and server-side admin operations. Login is email/password only;
  password changes use recovery OTP verification, and passwords are never displayed.
