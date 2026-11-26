// Every quiz category on QuizBit, grouped. Names are translated in src/i18n/dict.js (key "cat.<id>").
// Keep existing ids stable: they're stored in games.js and in players' preferences.

export const groups = [
  { id: 'knowledge', emoji: '🧠' },
  { id: 'entertainment', emoji: '🎬' },
  { id: 'lifestyle', emoji: '🌍' },
  { id: 'sports', emoji: '🏆' },
  { id: 'brain', emoji: '🧩' },
]

export const categories = [
  // Knowledge
  { id: 'general', group: 'knowledge', emoji: '✨', color: '#a78bfa', name: 'General Knowledge', blurb: 'A bit of everything. The ultimate all-rounder test.' },
  { id: 'geo', group: 'knowledge', emoji: '🗺️', color: '#4ade80', name: 'Geography', blurb: 'Maps, countries, borders, rivers and mountains.' },
  { id: 'history', group: 'knowledge', emoji: '🏛️', color: '#facc15', name: 'History', blurb: 'Dates, empires, revolutions and turning points.' },
  { id: 'science', group: 'knowledge', emoji: '🔬', color: '#22d3ee', name: 'Science', blurb: 'Physics, chemistry, biology and the curious minds behind them.' },
  { id: 'space', group: 'knowledge', emoji: '🚀', color: '#818cf8', name: 'Space & Astronomy', blurb: 'Planets, stars, missions and the edge of the universe.' },
  { id: 'nature', group: 'knowledge', emoji: '🦊', color: '#34d399', name: 'Nature & Animals', blurb: 'Wildlife, plants, oceans and the planet we live on.' },
  { id: 'health', group: 'knowledge', emoji: '🫀', color: '#f87171', name: 'Health & Body', blurb: 'Medicine, the human body and healthy living.' },
  { id: 'language', group: 'knowledge', emoji: '🔤', color: '#c084fc', name: 'Languages & Words', blurb: 'Word origins, spelling, idioms and languages of the world.' },
  { id: 'literature', group: 'knowledge', emoji: '📚', color: '#fb923c', name: 'Books & Literature', blurb: 'Authors, classics, characters and famous first lines.' },
  { id: 'myth', group: 'knowledge', emoji: '⚡', color: '#fbbf24', name: 'Mythology & Religion', blurb: 'Gods, legends, myths and world beliefs.' },
  { id: 'society', group: 'knowledge', emoji: '🌐', color: '#60a5fa', name: 'World & Society', blurb: 'Countries, leaders, organisations and how the world works.' },
  { id: 'business', group: 'knowledge', emoji: '📈', color: '#2dd4bf', name: 'Business & Money', blurb: 'Companies, founders, currencies and the economy.' },

  // Entertainment
  { id: 'movies', group: 'entertainment', emoji: '🎬', color: '#f472b6', name: 'Movies & TV', blurb: 'Blockbusters, series, quotes and behind-the-scenes facts.' },
  { id: 'music', group: 'entertainment', emoji: '🎵', color: '#e879f9', name: 'Music', blurb: 'Artists, albums, lyrics-free hits and music history.' },
  { id: 'celebs', group: 'entertainment', emoji: '⭐', color: '#fb7185', name: 'Celebrities', blurb: 'Famous faces, surprising roots and star trivia.' },
  { id: 'gaming', group: 'entertainment', emoji: '🎮', color: '#a3e635', name: 'Video Games', blurb: 'Consoles, characters, classics and esports.' },
  { id: 'anime', group: 'entertainment', emoji: '🦸', color: '#f97316', name: 'Anime & Comics', blurb: 'Manga, superheroes, cartoons and graphic novels.' },
  { id: 'popculture', group: 'entertainment', emoji: '📱', color: '#38bdf8', name: 'Pop Culture & Internet', blurb: 'Memes, trends, viral moments and social media.' },
  { id: 'art', group: 'entertainment', emoji: '🎨', color: '#f59e0b', name: 'Art & Design', blurb: 'Painters, masterpieces, architecture and design icons.' },

  // Lifestyle
  { id: 'culture', group: 'lifestyle', emoji: '🌍', color: '#a78bfa', name: 'Culture & Origins', blurb: 'Where did it really come from? Customs, origins and surprises.' },
  { id: 'food', group: 'lifestyle', emoji: '🍲', color: '#fb923c', name: 'Food & Drink', blurb: 'Dishes, drinks, cuisines and delicious myths.' },
  { id: 'travel', group: 'lifestyle', emoji: '✈️', color: '#22d3ee', name: 'Travel & Landmarks', blurb: 'Famous places, wonders of the world and hidden gems.' },
  { id: 'holidays', group: 'lifestyle', emoji: '🎉', color: '#f43f5e', name: 'Holidays & Traditions', blurb: 'Festivals, celebrations and customs around the world.' },
  { id: 'fashion', group: 'lifestyle', emoji: '👗', color: '#ec4899', name: 'Fashion & Style', blurb: 'Designers, trends, brands and style history.' },
  { id: 'brands', group: 'lifestyle', emoji: '🏷️', color: '#eab308', name: 'Brands & Logos', blurb: 'Logos, slogans, mascots and company stories.' },
  { id: 'cars', group: 'lifestyle', emoji: '🚗', color: '#ef4444', name: 'Cars & Transport', blurb: 'Car makers, trains, planes and everything that moves.' },
  { id: 'tech', group: 'lifestyle', emoji: '💡', color: '#06b6d4', name: 'Inventions & Tech', blurb: 'Gadgets, inventors, the internet and breakthroughs.' },

  // Sports
  { id: 'sports', group: 'sports', emoji: '🏅', color: '#22c55e', name: 'Sports', blurb: 'Champions, records and rules across every sport.' },
  { id: 'football', group: 'sports', emoji: '⚽', color: '#16a34a', name: 'Football', blurb: 'Clubs, legends, World Cups and transfer sagas.' },
  { id: 'olympics', group: 'sports', emoji: '🥇', color: '#f59e0b', name: 'Olympics', blurb: 'Games, medals, hosts and unforgettable moments.' },

  // Brain games
  { id: 'flags', group: 'brain', emoji: '🚩', color: '#ef4444', name: 'Flags', blurb: 'Every flag on Earth, and their tricky lookalikes.' },
  { id: 'capitals', group: 'brain', emoji: '🏙️', color: '#0ea5e9', name: 'Capitals', blurb: 'Capital cities, from easy to fiendish.' },
  { id: 'math', group: 'brain', emoji: '🔢', color: '#8b5cf6', name: 'Math & Logic', blurb: 'Numbers, patterns and quick-thinking puzzles.' },
  { id: 'puzzles', group: 'brain', emoji: '🧩', color: '#14b8a6', name: 'Riddles & Puzzles', blurb: 'Brain teasers, riddles and lateral thinking.' },
  { id: 'kids', group: 'brain', emoji: '🧸', color: '#fda4af', name: 'Kids & Family', blurb: 'Fun, friendly quizzes for the whole family.' },
]

export const categoryById = (id) => categories.find((c) => c.id === id)

// Shown on the home page bento (first is the big tile)
export const homeCategories = ['general', 'geo', 'movies', 'food', 'history', 'sports', 'music', 'science']
