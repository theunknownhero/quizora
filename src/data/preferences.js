// Onboarding options. `cats` links an option to game categories (see games.js) for recommendations.

export const interests = [
  { id: 'culture', label: 'Culture & origins', emoji: '🌍', cats: ['culture'] },
  { id: 'food', label: 'Food & drink', emoji: '🍲', cats: ['food'] },
  { id: 'science', label: 'Inventions & science', emoji: '💡', cats: ['science'] },
  { id: 'celebs', label: 'Celebrities', emoji: '⭐', cats: ['celebs'] },
  { id: 'geo', label: 'Geography', emoji: '🗺️', cats: ['geo'] },
  { id: 'history', label: 'History', emoji: '🏛️', cats: ['history'] },
  { id: 'sports', label: 'Sports', emoji: '⚽', cats: [] },
  { id: 'music', label: 'Music', emoji: '🎵', cats: ['celebs'] },
  { id: 'film', label: 'Film & TV', emoji: '🎬', cats: ['celebs'] },
  { id: 'nature', label: 'Nature & animals', emoji: '🦊', cats: ['geo'] },
  { id: 'art', label: 'Art & design', emoji: '🎨', cats: ['culture'] },
  { id: 'travel', label: 'Travel', emoji: '✈️', cats: ['geo', 'culture'] },
]

export const topics = [
  { id: 'street-food', label: 'Street food', emoji: '🌭', cats: ['food'] },
  { id: 'wine', label: 'Wine & drinks', emoji: '🍷', cats: ['food'] },
  { id: 'national-dishes', label: 'National dishes', emoji: '🥘', cats: ['food', 'culture'] },
  { id: 'inventors', label: 'Famous inventors', emoji: '⚙️', cats: ['science'] },
  { id: 'space', label: 'Space', emoji: '🚀', cats: ['science'] },
  { id: 'royals', label: 'Kings & queens', emoji: '👑', cats: ['history'] },
  { id: 'castles', label: 'Castles & landmarks', emoji: '🏰', cats: ['history', 'geo'] },
  { id: 'capitals', label: 'World capitals', emoji: '🏙️', cats: ['geo'] },
  { id: 'flags', label: 'Flags', emoji: '🚩', cats: ['geo'] },
  { id: 'movie-stars', label: 'Movie stars', emoji: '🎥', cats: ['celebs'] },
  { id: 'musicians', label: 'Musicians', emoji: '🎸', cats: ['celebs'] },
  { id: 'folk', label: 'Folk traditions', emoji: '🪅', cats: ['culture'] },
  { id: 'festivals', label: 'Festivals', emoji: '🎉', cats: ['culture'] },
  { id: 'football', label: 'Football', emoji: '🏟️', cats: [] },
  { id: 'animals', label: 'Animals', emoji: '🐾', cats: ['geo'] },
  { id: 'languages', label: 'Languages & words', emoji: '🔤', cats: ['culture'] },
]
