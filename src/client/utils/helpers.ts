// ============================================================
// ClawCity — UI Helper Utilities
// ============================================================

// Get a consistent color for an agent based on their name
export function agentColor(name: string): string {
  const colors = [
    '#e8b84b', '#7ec850', '#5b8def', '#e85b5b', '#c45bdb',
    '#5bdbc4', '#db8f5b', '#5b7edb', '#db5b8f', '#8fdb5b',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get personality emoji based on Big Five traits
export function personalityEmoji(personality?: Record<string, number> | null): string {
  if (!personality) return '🤖';
  const { openness = 0.5, extraversion = 0.5, agreeableness = 0.5, neuroticism = 0.5 } = personality;

  if (openness > 0.7) return '🎨';
  if (extraversion > 0.7) return '🎉';
  if (agreeableness > 0.7) return '💛';
  if (neuroticism > 0.7) return '🌊';
  return '🧠';
}

// Get mood emoji and label
export function moodInfo(mood: number): { emoji: string; label: string } {
  if (mood >= 0.8) return { emoji: '😊', label: 'Happy' };
  if (mood >= 0.6) return { emoji: '🙂', label: 'Content' };
  if (mood >= 0.4) return { emoji: '😐', label: 'Neutral' };
  if (mood >= 0.2) return { emoji: '😟', label: 'Worried' };
  return { emoji: '😢', label: 'Sad' };
}

// Get weather emoji
export function weatherEmoji(weather: string): string {
  const map: Record<string, string> = {
    clear: '☀️',
    cloudy: '☁️',
    rain: '🌧️',
    storm: '⛈️',
    snow: '❄️',
    fog: '🌫️',
    windy: '💨',
  };
  return map[weather] || '🌤️';
}

// Get season emoji
export function seasonEmoji(season: string): string {
  const map: Record<string, string> = {
    spring: '🌸',
    summer: '☀️',
    autumn: '🍂',
    fall: '🍂',
    winter: '❄️',
  };
  return map[season] || '🌍';
}

// Format game time display
export function formatGameTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

// Get item emoji for inventory
export function itemEmoji(item: string): string {
  const map: Record<string, string> = {
    wood: '🪵',
    stone: '🪨',
    iron: '⛏️',
    iron_ore: '⛏️',
    food: '🍎',
    fish: '🐟',
    wheat: '🌾',
    herbs: '🌿',
    gold: '✨',
    plank: '🪵',
    brick: '🧱',
    tool: '🔧',
    sword: '⚔️',
    bread: '🍞',
    potion: '🧪',
    cloth: '🧵',
    gem: '💎',
    sand: '🏖️',
    coal: '�ite',
  };
  return map[item.toLowerCase()] || '📦';
}

// Relationship emoji based on affinity
export function relationshipEmoji(affinity: number): string {
  if (affinity >= 70) return '❤️';
  if (affinity >= 50) return '💛';
  if (affinity >= 30) return '😊';
  if (affinity >= 0) return '🤝';
  if (affinity >= -20) return '😐';
  return '😠';
}

// Relationship label
export function relationshipLabel(affinity: number): string {
  if (affinity >= 70) return 'best friend';
  if (affinity >= 50) return 'close friend';
  if (affinity >= 30) return 'friend';
  if (affinity >= 0) return 'acquaintance';
  if (affinity >= -20) return 'wary';
  return 'rival';
}
