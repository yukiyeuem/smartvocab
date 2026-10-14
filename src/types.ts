export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  timezone: string;
  createdAt: number;
}

export interface UserSettings {
  user_id: string;
  new_cards_per_day: number;
  max_reviews_per_day: number;
  card_direction: 'en_vi' | 'vi_en';
  auto_pronounce: boolean;
  ai_enabled: boolean;
  ai_consent_at?: number;
  theme: 'system' | 'light' | 'dark';
  updated_at: number;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description: string;
  topic: string;
  created_at: number;
  updated_at: number;
  totalCards?: number;
  reviewedCards?: number;
  dueCards?: number;
  newCards?: number;
}

export interface Card {
  id: string;
  deck_id: string;
  user_id: string;
  position: number;
  term: string;
  term_normalized: string;
  meaning_vi: string;
  definition_en: string;
  phonetic: string;
  part_of_speech: string;
  synonyms: string[];
  antonyms: string[];
  example: string;
  group_name: string;
  field_sources: Record<string, string>;
  flagged_hard: boolean;
  created_at: number;
  updated_at: number;
  srs_en_vi?: UserCardState;
  srs_vi_en?: UserCardState;
  relatedCards?: Array<{ id: string; term: string; meaning_vi: string; part_of_speech: string }>;
}

export interface UserCardState {
  user_id: string;
  card_id: string;
  direction: 'en_vi' | 'vi_en';
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
  due_at: number;
  last_reviewed_at?: number;
  suspended: boolean;
}

export interface StudyQueueCard extends Card {
  srsState: UserCardState;
  relatedCards: Array<{ id: string; term: string; meaning_vi: string; part_of_speech: string }>;
}

export interface SenseResult {
  pos: string;
  meaning_vi: string;
  definition_en: string;
  phonetic: string;
  examples: string[];
  synonyms: Array<{ word: string; note_vi?: string }>;
  antonyms: string[];
}

export interface DictionaryLookupResult {
  term: string;
  lemma: string;
  phonetic: string;
  word_family?: string[];
  group_name?: string;
  senses: SenseResult[];
}

export interface ReadingQuestion {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

export interface ReadingPassage {
  id: string;
  user_id: string;
  title: string;
  passage: string;
  level: string;
  topic: string;
  target_card_ids: string[];
  target_words: string[];
  questions: ReadingQuestion[];
  created_at: number;
}

export interface StudyStats {
  totalCards: number;
  learnedCards: number;
  learningCards: number;
  newCards: number;
  dueToday: number;
  totalReviews: number;
  retentionRate: number;
  hardWords: Card[];
}

export interface AdminUserRecord {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  timezone: string;
  requestNote?: string;
  requestedAt?: number;
  createdAt: number;
  lastLoginAt?: number;
  deckCount: number;
  cardCount: number;
}
