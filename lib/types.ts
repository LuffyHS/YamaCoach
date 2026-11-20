export type Role = "coach" | "student";
export type RoutineCategory = "warmup" | "tdm" | "aim" | "tactical";
export type VodStatus = "pending" | "reviewed";
export type ProofStatus = "pending" | "approved" | "rejected";
export type PlanType = "stripe" | "pix" | "coupon";
export type SubscriptionStatus = "inactive" | "active" | "past_due" | "canceled";
export type LiveStatus = "scheduled" | "live" | "ended";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  initial_rank?: string | null;
  current_rank: string | null;
  target_rank: string | null;
  rank_goal_start?: string | null;
  coach_id: string | null;
  is_active: boolean;
  subscription_expires_at: string | null;
  subscription_status?: string;
  riot_id?: string | null;
  created_at: string;
  setup?: PlayerSetup;
  recurring_errors?: string;
  tracker_url?: string | null;
};

export type PlayerSetup = { processor:string; gpu:string; ram:string; monitor_hz:string; mouse:string; keyboard:string; headset:string; mousepad:string; dpi:number|null; sensitivity:number|null; resolution:string; crosshair_code:string; equipment_history:string; main_role:string; agents:string[] };
export type CalendarEvent = {id:string; student_id:string; coach_id:string; title:string; kind:"live"|"vod"|"training"; starts_at:string; notes:string};

export type Subscription = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  plan_type: PlanType | null;
  expires_at: string | null;
  created_at: string;
};

export type PaymentProof = {
  id: string;
  user_id: string;
  pix_key: string;
  receipt_url: string | null;
  status: ProofStatus;
  created_at: string;
  reviewed_at: string | null;
};

export type TrainingRoutine = {
  id: string;
  student_id: string;
  coach_id: string;
  title: string;
  category: RoutineCategory;
  is_completed: boolean;
  description: string | null;
  youtube_url?: string | null;
  scheduled_for: string;
  completed_at: string | null;
  created_at: string;
};

export type VodReview = {
  id: string;
  student_id: string;
  coach_id: string | null;
  student_youtube_url: string;
  coach_review_youtube_url: string | null;
  map: string;
  agent: string;
  coach_notes: string | null;
  recurring_errors: string | null;
  status: VodStatus;
  created_at: string;
};

export type LiveSession = {
  id: string;
  student_id: string;
  student_ids?: string[];
  coach_id: string;
  title: string;
  stream_url: string;
  notes: string;
  scheduled_at: string;
  status: LiveStatus;
  is_public?: boolean;
  updated_at: string;
  created_at?: string;
};

export type RankEntry = {
  id: string;
  student_id: string;
  rank: string;
  recorded_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  percent_off: number;
  active: boolean;
  expires_at: string | null;
};

export type CouponRedemption = {
  id: string;
  coupon_id: string;
  user_id: string;
  redeemed_at: string;
};

export type Credential = {
  user_id: string;
  password_hash: string;
};

export type Database = {
  version: 1;
  profiles: Profile[];
  credentials: Credential[];
  subscriptions: Subscription[];
  payment_proofs: PaymentProof[];
  training_routines: TrainingRoutine[];
  vod_reviews: VodReview[];
  live_sessions: LiveSession[];
  rank_history: RankEntry[];
  coupons: Coupon[];
  coupon_redemptions: CouponRedemption[];
  calendar_events?: CalendarEvent[];
};
