// Achievement catalogue. Ids must match the checks in public._grant_achievements / finish_session.
// tier: bronze | silver | gold | platinum (badge colour)

export const tiersStyle = {
  bronze: { label: 'Bronze', color: '#d97706' },
  silver: { label: 'Silver', color: '#cbd5e1' },
  gold: { label: 'Gold', color: '#facc15' },
  platinum: { label: 'Platinum', color: '#a5f3fc' },
}

export const achievements = [
  { id: 'first_game', emoji: '🎮', tier: 'bronze', name: 'First Steps', desc: 'Finish your first game.' },
  { id: 'first_win', emoji: '🏆', tier: 'bronze', name: 'Winner', desc: 'Win your first round.' },
  { id: 'games_10', emoji: '🔟', tier: 'silver', name: 'Regular', desc: 'Finish 10 games.' },
  { id: 'games_50', emoji: '🎯', tier: 'gold', name: 'Dedicated', desc: 'Finish 50 games.' },
  { id: 'games_100', emoji: '💯', tier: 'platinum', name: 'Centurion', desc: 'Finish 100 games.' },
  { id: 'wins_10', emoji: '🥈', tier: 'silver', name: 'Serial Winner', desc: 'Win 10 rounds.' },
  { id: 'wins_50', emoji: '🥇', tier: 'gold', name: 'Champion', desc: 'Win 50 rounds.' },
  { id: 'perfect', emoji: '💎', tier: 'gold', name: 'Flawless', desc: 'Answer every question in a round correctly.' },
  { id: 'streak_5', emoji: '🔥', tier: 'bronze', name: 'On Fire', desc: '5 correct answers in a row.' },
  { id: 'streak_10', emoji: '⚡', tier: 'silver', name: 'Unstoppable', desc: '10 correct answers in a row.' },
  { id: 'streak_20', emoji: '🌋', tier: 'gold', name: 'Volcanic', desc: '20 correct answers in a row.' },
  { id: 'level_5', emoji: '⭐', tier: 'bronze', name: 'Rising Star', desc: 'Reach level 5.' },
  { id: 'level_10', emoji: '🌟', tier: 'silver', name: 'Bright Mind', desc: 'Reach level 10.' },
  { id: 'level_25', emoji: '👑', tier: 'gold', name: 'Royalty', desc: 'Reach level 25.' },
  { id: 'day_streak_3', emoji: '📅', tier: 'bronze', name: 'Habit Forming', desc: 'Play 3 days in a row.' },
  { id: 'day_streak_7', emoji: '🗓️', tier: 'silver', name: 'Weekly Ritual', desc: 'Play 7 days in a row.' },
  { id: 'day_streak_30', emoji: '🏅', tier: 'platinum', name: 'Unbreakable', desc: 'Play 30 days in a row.' },
  { id: 'night_owl', emoji: '🦉', tier: 'bronze', name: 'Night Owl', desc: 'Finish a game between midnight and 5am.' },
  { id: 'early_bird', emoji: '🐦', tier: 'bronze', name: 'Early Bird', desc: 'Finish a game between 5am and 8am.' },
  { id: 'speed_runner', emoji: '⏱️', tier: 'silver', name: 'Speed Runner', desc: 'Win a round in under 2 minutes.' },
  { id: 'collector', emoji: '🔖', tier: 'bronze', name: 'Collector', desc: 'Save 5 games.' },
  { id: 'critic', emoji: '❤️', tier: 'bronze', name: 'Critic', desc: 'Like 3 games.' },
  { id: 'curator', emoji: '📚', tier: 'bronze', name: 'Curator', desc: 'Create a QuizList.' },
  { id: 'party_first', emoji: '🎉', tier: 'bronze', name: 'Party Starter', desc: 'Finish a game in a party room.' },
  { id: 'party_win', emoji: '🥇', tier: 'silver', name: 'Crowd Pleaser', desc: 'Win a multiplayer room.' },
  { id: 'party_crowd', emoji: '🎪', tier: 'gold', name: 'Full House', desc: 'Finish a room with 4 or more players.' },
  { id: 'tourney_first', emoji: '🎟️', tier: 'bronze', name: 'Contender', desc: 'Finish a tournament.' },
  { id: 'tourney_podium', emoji: '🥉', tier: 'silver', name: 'On the Podium', desc: 'Finish a tournament in the top 3.' },
  { id: 'tourney_champion', emoji: '🏆', tier: 'platinum', name: 'Champion', desc: 'Win a daily or weekly tournament.' },
]

export const achievementById = (id) => achievements.find((a) => a.id === id)
