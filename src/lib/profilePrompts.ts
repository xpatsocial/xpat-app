/**
 * Hinge-style profile prompt library for x/pat nomad profiles.
 * Users pick up to 3 prompts and write short answers (max 300 chars).
 * Research: prompts get 47% more connection likelihood and 3x engagement.
 */

export interface ProfilePrompt {
  id: string;
  question: string;
  placeholder: string;
  category: 'travel' | 'lifestyle' | 'social' | 'work' | 'personal';
}

export const PROFILE_PROMPTS: ProfilePrompt[] = [
  // Travel
  {
    id: 'hidden_gem',
    question: 'My favorite hidden gem is...',
    placeholder: 'That tiny ramen bar in Chiang Mai\'s old city with no English menu',
    category: 'travel',
  },
  {
    id: 'place_changed_me',
    question: 'The place that changed me was...',
    placeholder: 'Oaxaca. The food, the art, the people — I stayed 4 months instead of 2 weeks',
    category: 'travel',
  },
  {
    id: 'unpopular_opinion',
    question: 'My unpopular travel opinion is...',
    placeholder: 'Bali is overrated and Lombok is where the real magic happens',
    category: 'travel',
  },
  {
    id: 'next_adventure',
    question: 'My next adventure is...',
    placeholder: 'Learning to surf in Sri Lanka while shipping my side project',
    category: 'travel',
  },
  {
    id: 'travel_hack',
    question: 'A travel hack I swear by is...',
    placeholder: 'Always book a one-way ticket. Return dates are just suggestions',
    category: 'travel',
  },
  {
    id: 'new_nomad_advice',
    question: 'Best advice I\'d give a new nomad...',
    placeholder: 'Slow down. One month in a city beats one week in four',
    category: 'travel',
  },

  // Lifestyle
  {
    id: 'find_me_at',
    question: 'You\'ll find me at...',
    placeholder: 'The cafe with the fastest Wi-Fi and the strongest cold brew',
    category: 'lifestyle',
  },
  {
    id: 'currently_obsessed',
    question: 'Currently obsessed with...',
    placeholder: 'Learning Thai boxing, building in public, and mango sticky rice',
    category: 'lifestyle',
  },
  {
    id: 'cafe_order',
    question: 'My go-to cafe order is...',
    placeholder: 'Oat flat white, extra shot. Or whatever the local version is',
    category: 'lifestyle',
  },
  {
    id: 'morning_routine',
    question: 'My morning routine abroad is...',
    placeholder: 'Sunrise walk, espresso from the corner shop, code until noon',
    category: 'lifestyle',
  },
  {
    id: 'cant_travel_without',
    question: 'I can\'t travel without...',
    placeholder: 'Noise-canceling headphones, hot sauce, and a Kindle loaded with sci-fi',
    category: 'lifestyle',
  },

  // Social
  {
    id: 'looking_for',
    question: 'I\'m looking for...',
    placeholder: 'Coworking buddies who actually want to explore the city after 5pm',
    category: 'social',
  },
  {
    id: 'perfect_day',
    question: 'A perfect day in a new city is...',
    placeholder: 'Morning market, deep work at a cafe, sunset hike, street food with friends',
    category: 'social',
  },
  {
    id: 'lets_bond_over',
    question: 'Let\'s bond over...',
    placeholder: 'Terrible hostel stories, startup ideas at 2am, or finding the best tacos',
    category: 'social',
  },
  {
    id: 'weirdest_experience',
    question: 'My weirdest travel experience was...',
    placeholder: 'Getting invited to a wedding in rural Turkey by a stranger on a bus',
    category: 'social',
  },

  // Work
  {
    id: 'ask_me_about',
    question: 'Ask me about...',
    placeholder: 'React Native, visa runs in Southeast Asia, or the best coworking in Lisbon',
    category: 'work',
  },
  {
    id: 'geek_out',
    question: 'I geek out about...',
    placeholder: 'Maps, typography, productivity systems, and obscure coffee brewing methods',
    category: 'work',
  },
  {
    id: 'building_right_now',
    question: 'What I\'m building right now is...',
    placeholder: 'An app that helps nomads find each other. Oh wait, you\'re already here',
    category: 'work',
  },

  // Personal
  {
    id: 'hot_take',
    question: 'A hill I\'ll die on is...',
    placeholder: 'Street food is always better than restaurant food. Always.',
    category: 'personal',
  },
  {
    id: 'life_motto',
    question: 'My life motto is...',
    placeholder: 'Collect moments, not things. Also collect stamps in your passport.',
    category: 'personal',
  },
];

/** Preset travel style options — users pick up to 3 */
export const TRAVEL_STYLE_OPTIONS = [
  'Slow traveler',
  'Fast-paced explorer',
  'Budget backpacker',
  'Comfort seeker',
  'Digital nomad',
  'Weekend tripper',
  'Off the beaten path',
  'City hopper',
  'Beach & island life',
  'Mountain & nature',
  'Culture & history',
  'Foodie traveler',
  'Adventure & sports',
  'Solo traveler',
  'Social butterfly',
  'Work-first, explore-second',
] as const;

export type TravelStyle = (typeof TRAVEL_STYLE_OPTIONS)[number];

/** Common status emojis for custom status */
export const STATUS_EMOJIS = [
  '✈️', '🏖️', '💻', '☕', '🏔️', '🌊', '🎒', '🗺️',
  '🧑‍💻', '📍', '🏠', '🌙', '🎉', '🧘', '🏄', '🚀',
];

/**
 * Calculate profile completion score (0-100) based on filled fields.
 * Weighted so prompts and photos matter most.
 */
export function calculateProfileCompletion(profile: {
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  current_city?: string | null;
  home_city?: string | null;
  nationality?: string | null;
  tagline?: string | null;
  travel_style?: string[] | null;
  work_type?: string | null;
  prompt_1_answer?: string | null;
  prompt_2_answer?: string | null;
  prompt_3_answer?: string | null;
  countries_visited?: string[] | null;
  languages?: string[] | null;
  skills?: string[] | null;
  open_to?: string[] | null;
}): number {
  let score = 0;
  const weights: [boolean, number][] = [
    [!!profile.display_name, 10],
    [!!profile.avatar_url, 12],
    [!!profile.bio, 8],
    [!!profile.current_city, 6],
    [!!profile.home_city, 4],
    [!!profile.nationality, 4],
    [!!profile.tagline, 8],
    [(profile.travel_style?.length ?? 0) > 0, 6],
    [!!profile.work_type, 5],
    [!!profile.prompt_1_answer, 10],
    [!!profile.prompt_2_answer, 9],
    [!!profile.prompt_3_answer, 8],
    [(profile.countries_visited?.length ?? 0) > 0, 4],
    [(profile.languages?.length ?? 0) > 0, 3],
    [(profile.skills?.length ?? 0) > 0, 3],
  ];

  for (const [filled, weight] of weights) {
    if (filled) score += weight;
  }

  return Math.min(score, 100);
}
