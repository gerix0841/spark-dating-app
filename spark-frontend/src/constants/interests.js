export const INTEREST_OPTIONS = [
  { id: 'Gaming', icon: '🎮' }, { id: 'Pizza', icon: '🍕' }, { id: 'Hiking', icon: '🏔️' },
  { id: 'Cooking', icon: '👨‍🍳' }, { id: 'Travel', icon: '✈️' }, { id: 'Music', icon: '🎵' },
  { id: 'Gym', icon: '💪' }, { id: 'Art', icon: '🎨' }, { id: 'Coffee', icon: '☕' },
  { id: 'Movies', icon: '🍿' }, { id: 'Photography', icon: '📸' }, { id: 'Coding', icon: '💻' },
  { id: 'Yoga', icon: '🧘' }, { id: 'Wine', icon: '🍷' }, { id: 'Dancing', icon: '💃' },
  { id: 'Nature', icon: '🌿' }, { id: 'Reading', icon: '📖' }, { id: 'Sports', icon: '⚽' }
];

export const getInterestIcon = (id) => {
  const option = INTEREST_OPTIONS.find(opt => opt.id === id);
  return option ? option.icon : '✨';
};