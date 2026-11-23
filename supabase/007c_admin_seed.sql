-- Phase 6c: seed the editable catalog from the current site data, and make the first account the owner.
-- Re-running never overwrites edits made in the admin panel (on conflict do nothing).

insert into public.games (slug, title, tagline, emoji, gradient, categories, countries, status, featured, difficulty, minutes, questions, age_rating, prompt, yes_label, no_label, sort) values
  ('hungary-or-not', 'Hungary or Not?', 'Guess whether a food, invention, celebrity or tradition has Hungarian origins.', '🇭🇺', array['#CE2939','#477050']::text[], array['culture','food','tech','celebs','general']::text[], array['HU']::text[], 'live', true, 'Medium', 4, 20, 0, 'Does it have Hungarian origins?', 'Hungary', 'Not', 10),
  ('capital-clash', 'Capital Clash', 'Two cities, one capital. Pick fast before the timer runs out.', '🏙️', array['#0ea5e9','#22c55e']::text[], array['capitals','geo','travel']::text[], null, 'soon', false, 'Easy', 3, 25, 0, 'True or false?', 'True', 'False', 20),
  ('german-engineering', 'Made in Germany?', 'Cars, gadgets and everyday things: which ones were really invented in Germany?', '⚙️', array['#1f2937','#dd0000']::text[], array['tech','cars','history']::text[], array['DE']::text[], 'soon', false, 'Medium', 4, 20, 0, 'True or false?', 'True', 'False', 30),
  ('usa-or-canada', 'USA or Canada?', 'Celebrities, snacks and sports: guess which side of the border they come from.', '🍁', array['#1d4ed8','#dc2626']::text[], array['celebs','food','culture']::text[], array['US','CA']::text[], 'soon', false, 'Medium', 4, 20, 0, 'True or false?', 'True', 'False', 40),
  ('spain-or-portugal', 'Spain or Portugal?', 'Pastéis, paella, fado or flamenco: tell the Iberian neighbours apart.', '🥘', array['#c60b1e','#046a38']::text[], array['food','culture']::text[], array['ES','PT']::text[], 'soon', false, 'Hard', 4, 20, 0, 'True or false?', 'True', 'False', 50),
  ('czech-it-out', 'Czech It Out', 'Sugar cubes, contact lenses and Pilsner: how much do you know about Czech inventions?', '🍺', array['#11457e','#d7141a']::text[], array['tech','food','culture']::text[], array['CZ']::text[], 'soon', false, 'Medium', 3, 15, 0, 'True or false?', 'True', 'False', 60),
  ('serbian-stories', 'Serbian Legends', 'From Tesla to Novak: famous Serbs, dishes and traditions.', '🎾', array['#c6363c','#0c4076']::text[], array['celebs','culture','history','sports']::text[], array['RS']::text[], 'soon', false, 'Medium', 3, 15, 0, 'True or false?', 'True', 'False', 70),
  ('flag-frenzy', 'Flag Frenzy', 'Spot the right flag among near-identical lookalikes.', '🚩', array['#ef4444','#f59e0b']::text[], array['flags','geo']::text[], null, 'soon', false, 'Hard', 5, 30, 0, 'True or false?', 'True', 'False', 80),
  ('dish-detective', 'Dish Detective', 'One photo, four countries. Where is this dish from?', '🍜', array['#f97316','#e11d48']::text[], array['food','culture','travel']::text[], null, 'soon', false, 'Easy', 4, 20, 0, 'True or false?', 'True', 'False', 90),
  ('year-it-happened', 'The Year It Happened', 'Drag the slider to the year a historic moment took place.', '⏳', array['#eab308','#a855f7']::text[], array['history','general']::text[], null, 'soon', false, 'Hard', 5, 12, 0, 'True or false?', 'True', 'False', 100)
on conflict (slug) do nothing;

insert into public.categories (id, name, emoji, grp, color, blurb, sort) values
  ('general', 'General Knowledge', '✨', 'knowledge', '#a78bfa', 'A bit of everything. The ultimate all-rounder test.', 10),
  ('geo', 'Geography', '🗺️', 'knowledge', '#4ade80', 'Maps, countries, borders, rivers and mountains.', 20),
  ('history', 'History', '🏛️', 'knowledge', '#facc15', 'Dates, empires, revolutions and turning points.', 30),
  ('science', 'Science', '🔬', 'knowledge', '#22d3ee', 'Physics, chemistry, biology and the curious minds behind them.', 40),
  ('space', 'Space & Astronomy', '🚀', 'knowledge', '#818cf8', 'Planets, stars, missions and the edge of the universe.', 50),
  ('nature', 'Nature & Animals', '🦊', 'knowledge', '#34d399', 'Wildlife, plants, oceans and the planet we live on.', 60),
  ('health', 'Health & Body', '🫀', 'knowledge', '#f87171', 'Medicine, the human body and healthy living.', 70),
  ('language', 'Languages & Words', '🔤', 'knowledge', '#c084fc', 'Word origins, spelling, idioms and languages of the world.', 80),
  ('literature', 'Books & Literature', '📚', 'knowledge', '#fb923c', 'Authors, classics, characters and famous first lines.', 90),
  ('myth', 'Mythology & Religion', '⚡', 'knowledge', '#fbbf24', 'Gods, legends, myths and world beliefs.', 100),
  ('society', 'World & Society', '🌐', 'knowledge', '#60a5fa', 'Countries, leaders, organisations and how the world works.', 110),
  ('business', 'Business & Money', '📈', 'knowledge', '#2dd4bf', 'Companies, founders, currencies and the economy.', 120),
  ('movies', 'Movies & TV', '🎬', 'entertainment', '#f472b6', 'Blockbusters, series, quotes and behind-the-scenes facts.', 130),
  ('music', 'Music', '🎵', 'entertainment', '#e879f9', 'Artists, albums, lyrics-free hits and music history.', 140),
  ('celebs', 'Celebrities', '⭐', 'entertainment', '#fb7185', 'Famous faces, surprising roots and star trivia.', 150),
  ('gaming', 'Video Games', '🎮', 'entertainment', '#a3e635', 'Consoles, characters, classics and esports.', 160),
  ('anime', 'Anime & Comics', '🦸', 'entertainment', '#f97316', 'Manga, superheroes, cartoons and graphic novels.', 170),
  ('popculture', 'Pop Culture & Internet', '📱', 'entertainment', '#38bdf8', 'Memes, trends, viral moments and social media.', 180),
  ('art', 'Art & Design', '🎨', 'entertainment', '#f59e0b', 'Painters, masterpieces, architecture and design icons.', 190),
  ('culture', 'Culture & Origins', '🌍', 'lifestyle', '#a78bfa', 'Where did it really come from? Customs, origins and surprises.', 200),
  ('food', 'Food & Drink', '🍲', 'lifestyle', '#fb923c', 'Dishes, drinks, cuisines and delicious myths.', 210),
  ('travel', 'Travel & Landmarks', '✈️', 'lifestyle', '#22d3ee', 'Famous places, wonders of the world and hidden gems.', 220),
  ('holidays', 'Holidays & Traditions', '🎉', 'lifestyle', '#f43f5e', 'Festivals, celebrations and customs around the world.', 230),
  ('fashion', 'Fashion & Style', '👗', 'lifestyle', '#ec4899', 'Designers, trends, brands and style history.', 240),
  ('brands', 'Brands & Logos', '🏷️', 'lifestyle', '#eab308', 'Logos, slogans, mascots and company stories.', 250),
  ('cars', 'Cars & Transport', '🚗', 'lifestyle', '#ef4444', 'Car makers, trains, planes and everything that moves.', 260),
  ('tech', 'Inventions & Tech', '💡', 'lifestyle', '#06b6d4', 'Gadgets, inventors, the internet and breakthroughs.', 270),
  ('sports', 'Sports', '🏅', 'sports', '#22c55e', 'Champions, records and rules across every sport.', 280),
  ('football', 'Football', '⚽', 'sports', '#16a34a', 'Clubs, legends, World Cups and transfer sagas.', 290),
  ('olympics', 'Olympics', '🥇', 'sports', '#f59e0b', 'Games, medals, hosts and unforgettable moments.', 300),
  ('flags', 'Flags', '🚩', 'brain', '#ef4444', 'Every flag on Earth, and their tricky lookalikes.', 310),
  ('capitals', 'Capitals', '🏙️', 'brain', '#0ea5e9', 'Capital cities, from easy to fiendish.', 320),
  ('math', 'Math & Logic', '🔢', 'brain', '#8b5cf6', 'Numbers, patterns and quick-thinking puzzles.', 330),
  ('puzzles', 'Riddles & Puzzles', '🧩', 'brain', '#14b8a6', 'Brain teasers, riddles and lateral thinking.', 340),
  ('kids', 'Kids & Family', '🧸', 'brain', '#fda4af', 'Fun, friendly quizzes for the whole family.', 350)
on conflict (id) do nothing;

-- The first (and currently only) account becomes the owner, if there is no owner yet.
update public.profiles set role = 'owner'
  where id = (select id from public.profiles order by created_at limit 1)
    and not exists (select 1 from public.profiles where role = 'owner');
