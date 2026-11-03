# Roadmap — Domestic News Collections using ML

MCA major project for Mohammed Afroz (Hall Ticket 1314-24-862-003), guided by
Ms. Rana Tilath, MESCO Institute of Management and Computer Sciences, Hyderabad.
Spec source: MCA_Project.pdf pages 1–23 (news collection part); the later GDP/ML
notebook pages in the PDF belong to a different project and were ignored.

## Done
- [x] Enable Lovable Cloud (database + auth) and design the schema
      (news_sources, articles, collection_runs, admin roles, first-user-admin trigger)
- [x] Seed 12 national Indian news RSS sources
- [x] Server-side collection pipeline: RSS fetch + parse + dedupe + store
- [x] ML pipeline on Lovable AI (gemini flash-lite): topic classification,
      sentiment score, abstractive summary, keyword extraction — verified on
      real articles (24/275 processed, sensible categories/sentiments/summaries)
- [x] Public dashboard (/, /article/$id, /about) with filters, search, ticker
- [x] Admin console (/admin): run collection, run ML on pending, source CRUD,
      run history, charts — verified signed-in as the student's account
- [x] Auth: email/password + Google + Sign in with Lovable; first signup becomes admin
- [x] Managed schedules: collect 3x daily (IST 04:00/10:00/17:30), ML every 15 min
- [x] Tests 6/6 passing; typecheck clean; full browser pass with zero console errors
- [x] PDF alignment: About page credits Pantech e Learning (PEHYD0005/MAJOR
      PROJECT/DS/2025-2026); dashboard ML-processed stat counts the whole database

## Open
- [ ] Publish the app — scheduled jobs can only reach the stable published URL.
      After publish, verify the first scheduled collection + ML pass runs.
