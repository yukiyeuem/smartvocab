import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface User {
  id: string;
  email_canonical: string;
  email_display: string;
  display_name: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  timezone: string;
  request_note?: string;
  requested_at?: number;
  decided_at?: number;
  decided_by?: string;
  created_at: number;
  last_login_at?: number;
}

export interface LoginOtp {
  id: string;
  email_canonical: string;
  code_hash: string;
  expires_at: number;
  attempts: number;
  consumed_at?: number;
  created_at: number;
}

export interface Session {
  token_hash: string;
  user_id: string;
  created_at: number;
  last_seen_at: number;
  expires_at: number;
  user_agent?: string;
  revoked_at?: number;
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

export interface AppSettings {
  ai_kill_switch: boolean;
  ai_daily_budget: number;
  default_daily_lookup_quota: number;
  default_daily_reading_quota: number;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description: string;
  topic: string;
  created_at: number;
  updated_at: number;
  archived_at?: number;
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

export interface ReviewLog {
  review_id: string;
  user_id: string;
  card_id: string;
  direction: 'en_vi' | 'vi_en';
  rating: 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy
  mode: string;
  duration_ms: number;
  reviewed_at: number;
  received_at: number;
  prev_state_json: string;
}

export interface DictionaryCacheItem {
  cache_key: string;
  payload: any;
  model: string;
  prompt_version: string;
  created_at: number;
  expires_at: number;
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
  questions: Array<{
    question: string;
    options: string[];
    answer_index: number;
    explanation?: string;
  }>;
  created_at: number;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_user_id?: string;
  meta: Record<string, any>;
  created_at: number;
}

export interface AiUsageRecord {
  user_id: string;
  day: string; // YYYY-MM-DD
  kind: 'lookup' | 'reading';
  count: number;
  tokens_in: number;
  tokens_out: number;
}

export interface DatabaseSchema {
  users: User[];
  login_otps: LoginOtp[];
  sessions: Session[];
  user_settings: UserSettings[];
  app_settings: AppSettings;
  decks: Deck[];
  cards: Card[];
  user_card_state: UserCardState[];
  review_logs: ReviewLog[];
  dictionary_cache: DictionaryCacheItem[];
  reading_passages: ReadingPassage[];
  audit_logs: AuditLog[];
  ai_usage: AiUsageRecord[];
}

const DATA_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? path.resolve('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Canonical email normalization according to FR-AU-20
export function canonicalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return trimmed;
  let [local, domain] = parts;
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    domain = 'gmail.com';
    // Remove dots
    local = local.replace(/\./g, '');
    // Remove plus addressing
    const plusIdx = local.indexOf('+');
    if (plusIdx !== -1) {
      local = local.substring(0, plusIdx);
    }
  }
  return `${local}@${domain}`;
}

export function hashString(value: string, secret = 'vocab-spaced-salt-2026'): string {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.load();
    this.seedAdmin();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Failed to load db.json, starting with fresh store:', err);
    }

    return {
      users: [],
      login_otps: [],
      sessions: [],
      user_settings: [],
      app_settings: {
        ai_kill_switch: false,
        ai_daily_budget: 1000,
        default_daily_lookup_quota: 50,
        default_daily_reading_quota: 10,
      },
      decks: [],
      cards: [],
      user_card_state: [],
      review_logs: [],
      dictionary_cache: [],
      reading_passages: [],
      audit_logs: [],
      ai_usage: [],
    };
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmp = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, DB_FILE);
    } catch (err) {
      console.error('[DB] Persist error:', err);
    }
  }

  public scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.persist();
    }, 100);
  }

  public forceSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.persist();
  }

  private seedAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || 'huyhoangpham387@gmail.com';
    const canonical = canonicalizeEmail(adminEmail);
    let admin = this.data.users.find(u => u.email_canonical === canonical);
    if (!admin) {
      const adminId = crypto.randomUUID();
      admin = {
        id: adminId,
        email_canonical: canonical,
        email_display: adminEmail,
        display_name: 'Quản trị viên',
        role: 'admin',
        status: 'active',
        timezone: 'Asia/Ho_Chi_Minh',
        created_at: Date.now(),
      };
      this.data.users.push(admin);
      this.data.user_settings.push({
        user_id: adminId,
        new_cards_per_day: 15,
        max_reviews_per_day: 100,
        card_direction: 'en_vi',
        auto_pronounce: true,
        ai_enabled: true,
        ai_consent_at: Date.now(),
        theme: 'system',
        updated_at: Date.now(),
      });
      this.scheduleSave();
      console.log(`[DB] Seeded initial Admin user: ${adminEmail} (${adminId})`);
    } else if (admin.role !== 'admin' || admin.status !== 'active') {
      admin.role = 'admin';
      admin.status = 'active';
      this.scheduleSave();
    }
  }

  // Getters
  public getUsers() { return this.data.users; }
  public getSessions() { return this.data.sessions; }
  public getLoginOtps() { return this.data.login_otps; }
  public getUserSettings() { return this.data.user_settings; }
  public getAppSettings() { return this.data.app_settings; }
  public getDecks() { return this.data.decks; }
  public getCards() { return this.data.cards; }
  public getUserCardState() { return this.data.user_card_state; }
  public getReviewLogs() { return this.data.review_logs; }
  public getDictionaryCache() { return this.data.dictionary_cache; }
  public getReadingPassages() { return this.data.reading_passages; }
  public getAuditLogs() { return this.data.audit_logs; }
  public getAiUsage() { return this.data.ai_usage; }
}

export const db = new Database();
