export type SpotCategory = 'cafe' | 'eat' | 'cowork' | 'colive' | 'experience' | 'stay' | 'other';

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  current_city: string | null;
  current_country: string | null;
  home_city: string | null;
  role: string;
  created_at: string;
}

export interface Spot {
  id: number;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  category: SpotCategory;
  subcategory: string | null;
  note: string | null;
  description: string | null;
  tags: string[];
  photo_url: string | null;
  google_place_id: string | null;
  created_by: string | null;
  votes: number;
  is_seed: boolean;
  created_at: string;
  profiles?: Profile;
}

export type SafetyTag = 'feels safe' | 'stay alert' | 'avoid at night' | 'well-lit' | 'tourist-friendly';

export type VibeTag =
  | 'nightlife' | 'quiet residential' | 'artsy' | 'foodie heaven'
  | 'walkable' | 'local feel' | 'coworking-friendly' | 'beach vibes'
  | 'nature/countryside' | 'touristy' | 'family-friendly' | 'expat hub'
  | 'chill vibes' | 'buzzing nightlife' | 'cafe culture' | 'creative scene' | 'hidden gem';

export type NeighborhoodTag = SafetyTag | VibeTag;

export const SAFETY_TAGS: SafetyTag[] = [
  'feels safe', 'stay alert', 'avoid at night', 'well-lit', 'tourist-friendly',
];

export const VIBE_TAGS: VibeTag[] = [
  'nightlife', 'quiet residential', 'artsy', 'foodie heaven',
  'walkable', 'local feel', 'coworking-friendly', 'beach vibes',
  'nature/countryside', 'touristy', 'family-friendly', 'expat hub',
  'chill vibes', 'buzzing nightlife', 'cafe culture', 'creative scene', 'hidden gem',
];

export interface NeighborhoodVibe {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  neighborhood_name: string | null;
  city: string | null;
  country: string | null;
  tags: NeighborhoodTag[];
  created_at: string;
}

export interface Post {
  id: number;
  user_id: string;
  spot_id: number | null;
  content: string;
  photo_url: string | null;
  created_at: string;
  profiles?: Profile;
  spots?: Spot;
  likes?: { count: number }[];
  post_likes?: { user_id: string }[];
  comments?: { count: number }[];
}

export interface Comment {
  id: number;
  user_id: string;
  post_id: number;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface CheckIn {
  id: string;
  user_id: string;
  spot_id: number;
  created_at: string;
  profiles?: Profile;
}

export interface AppEvent {
  id: number;
  creator_id: string;
  spot_id: number | null;
  title: string;
  description: string | null;
  event_time: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  profiles?: Profile;
  event_rsvps?: { count: number }[];
}

export interface Connection {
  id: string;
  requester_id: string;
  target_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export type ActivityStatus = 'exploring' | 'working' | 'available' | 'offline';

export interface EventRsvp {
  id: string;
  event_id: number;
  user_id: string;
  status: 'going' | 'interested' | 'not_going';
  created_at: string;
  profiles?: Profile;
}

export interface TravelPlan {
  id: string;
  user_id: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  is_public: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface UserAvailability {
  user_id: string;
  status: ActivityStatus;
  message: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  expires_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface AffiliatePartner {
  name: string;
  icon: string;
  label: string;
  subtitle: string;
  url: string;
}

export const AFFILIATE_PARTNERS: Record<string, AffiliatePartner> = {
  airalo: { name: 'Airalo', icon: 'smartphone', label: 'eSIM & Data', subtitle: 'Stay connected worldwide', url: 'https://www.airalo.com/' },
  safetywing: { name: 'SafetyWing', icon: 'shield', label: 'Travel Insurance', subtitle: 'Coverage for nomads', url: 'https://safetywing.com/' },
  wise: { name: 'Wise', icon: 'credit-card', label: 'Money Transfer', subtitle: 'Send money anywhere', url: 'https://wise.com/' },
  booking: { name: 'Booking.com', icon: 'home', label: 'Accommodation', subtitle: 'Find your next stay', url: 'https://www.booking.com/' },
};
