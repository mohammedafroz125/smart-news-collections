update public.news_sources
   set name = 'Mint - India News', feed_url = 'https://www.livemint.com/rss/news', homepage_url = 'https://www.livemint.com'
 where feed_url = 'https://www.hindustantimes.com/feeds/rss/india-news/rss.xml';

update public.news_sources
   set name = 'New Indian Express - National', feed_url = 'https://www.newindianexpress.com/national/feed/', homepage_url = 'https://www.newindianexpress.com/national'
 where feed_url = 'https://www.news18.com/rss/india.xml';

insert into public.news_sources (name, feed_url, homepage_url)
values ('Business Standard - Top Stories', 'https://www.business-standard.com/rss/home_page_top_stories.rss', 'https://www.business-standard.com')
on conflict (feed_url) do nothing;