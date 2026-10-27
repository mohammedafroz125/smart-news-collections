create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles add constraint user_roles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users can read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create table public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique,
  homepage_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.news_sources to anon, authenticated;
grant all on public.news_sources to service_role;
alter table public.news_sources enable row level security;
create policy "public read sources" on public.news_sources for select to anon, authenticated using (true);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.news_sources(id) on delete set null,
  title text not null,
  link text not null unique,
  excerpt text,
  image_url text,
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  category text not null default 'Uncategorized',
  sentiment text not null default 'neutral' check (sentiment in ('positive','neutral','negative')),
  sentiment_score numeric,
  summary text,
  keywords text[] not null default '{}',
  ml_processed boolean not null default false,
  processed_at timestamptz
);
create index articles_published_idx on public.articles (published_at desc);
create index articles_category_idx on public.articles (category);
create index articles_pending_idx on public.articles (collected_at desc) where ml_processed = false;

grant select on public.articles to anon, authenticated;
grant all on public.articles to service_role;
alter table public.articles enable row level security;
create policy "public read articles" on public.articles for select to anon, authenticated using (true);

create table public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null check (trigger in ('manual','scheduled')),
  status text not null default 'running' check (status in ('running','success','partial','failed')),
  articles_fetched int not null default 0,
  articles_new int not null default 0,
  articles_failed int not null default 0,
  articles_processed int not null default 0,
  message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
grant select on public.collection_runs to authenticated;
grant all on public.collection_runs to service_role;
alter table public.collection_runs enable row level security;
create policy "admin read runs" on public.collection_runs for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.assign_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;

create trigger on_auth_user_created_admin
after insert on auth.users
for each row execute function public.assign_first_admin();

insert into public.news_sources (name, feed_url, homepage_url) values
('NDTV - India', 'https://feeds.feedburner.com/ndtvnews-india-news', 'https://www.ndtv.com/india-news'),
('NDTV - Top Stories', 'https://feeds.feedburner.com/ndtvnews-top-stories', 'https://www.ndtv.com'),
('Times of India - Top Stories', 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', 'https://timesofindia.indiatimes.com'),
('Times of India - India', 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms', 'https://timesofindia.indiatimes.com/india'),
('The Hindu - National', 'https://www.thehindu.com/news/national/feeder/default.rss', 'https://www.thehindu.com/news/national/'),
('Hindustan Times - India', 'https://www.hindustantimes.com/feeds/rss/india-news/rss.xml', 'https://www.hindustantimes.com/india-news'),
('India Today - India', 'https://www.indiatoday.in/rss/1206578', 'https://www.indiatoday.in/india'),
('Times of India - Sports', 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms', 'https://timesofindia.indiatimes.com/sports'),
('Times of India - Business', 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms', 'https://timesofindia.indiatimes.com/business'),
('Times of India - Entertainment', 'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms', 'https://timesofindia.indiatimes.com/entertainment'),
('News18 - India', 'https://www.news18.com/rss/india.xml', 'https://www.news18.com/india/');