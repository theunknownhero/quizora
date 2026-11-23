// Onboarding options. `cats` links an option to game categories (see games.js) for recommendations.

export const interests = [
  { id: 'culture', label: 'Culture & origins', emoji: '🌍', cats: ['culture'] },
  { id: 'food', label: 'Food & drink', emoji: '🍲', cats: ['food'] },
  { id: 'science', label: 'Inventions & science', emoji: '💡', cats: ['science', 'tech', 'space'] },
  { id: 'celebs', label: 'Celebrities', emoji: '⭐', cats: ['celebs'] },
  { id: 'geo', label: 'Geography', emoji: '🗺️', cats: ['geo'] },
  { id: 'history', label: 'History', emoji: '🏛️', cats: ['history'] },
  { id: 'sports', label: 'Sports', emoji: '⚽', cats: ['sports', 'football', 'olympics'] },
  { id: 'music', label: 'Music', emoji: '🎵', cats: ['music', 'celebs'] },
  { id: 'film', label: 'Film & TV', emoji: '🎬', cats: ['movies', 'celebs'] },
  { id: 'nature', label: 'Nature & animals', emoji: '🦊', cats: ['nature'] },
  { id: 'art', label: 'Art & design', emoji: '🎨', cats: ['art'] },
  { id: 'travel', label: 'Travel', emoji: '✈️', cats: ['travel', 'geo', 'culture'] },
]

export const topics = [
  { id: 'street-food', label: 'Street food', emoji: '🌭', cats: ['food'] },
  { id: 'wine', label: 'Wine & drinks', emoji: '🍷', cats: ['food'] },
  { id: 'national-dishes', label: 'National dishes', emoji: '🥘', cats: ['food', 'culture'] },
  { id: 'inventors', label: 'Famous inventors', emoji: '⚙️', cats: ['tech', 'science'] },
  { id: 'space', label: 'Space', emoji: '🚀', cats: ['space', 'science'] },
  { id: 'royals', label: 'Kings & queens', emoji: '👑', cats: ['history'] },
  { id: 'castles', label: 'Castles & landmarks', emoji: '🏰', cats: ['history', 'geo'] },
  { id: 'capitals', label: 'World capitals', emoji: '🏙️', cats: ['capitals', 'geo'] },
  { id: 'flags', label: 'Flags', emoji: '🚩', cats: ['flags', 'geo'] },
  { id: 'movie-stars', label: 'Movie stars', emoji: '🎥', cats: ['movies', 'celebs'] },
  { id: 'musicians', label: 'Musicians', emoji: '🎸', cats: ['music', 'celebs'] },
  { id: 'folk', label: 'Folk traditions', emoji: '🪅', cats: ['culture'] },
  { id: 'festivals', label: 'Festivals', emoji: '🎉', cats: ['holidays', 'culture'] },
  { id: 'football', label: 'Football', emoji: '🏟️', cats: ['football', 'sports'] },
  { id: 'animals', label: 'Animals', emoji: '🐾', cats: ['nature'] },
  { id: 'languages', label: 'Languages & words', emoji: '🔤', cats: ['language'] },
]
