/**
 * Centralized query key factory — prevents typos and enables precise invalidation.
 * Pattern: [entity, scope?, filters?]
 */
export const qk = {
  spots: {
    all: ['spots'] as const,
    byCity: (city: string) => ['spots', 'city', city] as const,
    byId: (id: number) => ['spots', 'detail', id] as const,
    byCategory: (city: string, category: string) => ['spots', 'city', city, 'category', category] as const,
  },
  feed: {
    all: ['feed'] as const,
    city: (city: string) => ['feed', 'city', city] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    byId: (id: string) => ['profiles', id] as const,
    me: (id: string) => ['profiles', 'me', id] as const,
  },
  comments: {
    bySpot: (spotId: number) => ['comments', 'spot', spotId] as const,
  },
  notifications: {
    unread: (userId: string) => ['notifications', 'unread', userId] as const,
  },
};
