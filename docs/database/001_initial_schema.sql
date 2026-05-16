-- H Wallet initial PostgreSQL schema.
-- IDs intentionally remain text because the current service contracts already
-- emit stable product IDs such as user-..., card-..., and agent-run-....

create table if not exists h_runtime_state (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  email text unique,
  display_name text,
  status text not null default 'pending-agent-wallet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_wallets (
  id text primary key,
  user_id text not null references users(id),
  provider text not null default 'okx-agent-wallet',
  status text not null default 'otp-requested',
  wallet_id text,
  account_id text,
  account_name text,
  email text,
  evm_address text,
  sol_address text,
  login_type text not null default 'email',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_wallets_user_idx
  on agent_wallets(user_id);

create table if not exists cards (
  id text primary key,
  user_id text references users(id),
  type text not null,
  status text not null,
  source text not null,
  title text not null,
  summary text not null,
  metrics jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_created_idx
  on cards(user_id, created_at desc);

create index if not exists cards_type_status_idx
  on cards(type, status);

create table if not exists card_events (
  id bigserial primary key,
  card_id text not null references cards(id),
  user_id text references users(id),
  event_type text not null,
  actor_type text not null default 'system',
  actor_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists card_events_card_created_idx
  on card_events(card_id, created_at desc);

create table if not exists ai_conversation_messages (
  id text primary key,
  user_id text references users(id),
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversation_messages_user_created_idx
  on ai_conversation_messages(user_id, created_at asc);

create table if not exists ai_conversation_turns (
  id text primary key,
  user_id text references users(id),
  intent text not null,
  confidence text not null,
  user_message_id text references ai_conversation_messages(id),
  assistant_message_id text references ai_conversation_messages(id),
  process_steps jsonb not null default '[]'::jsonb,
  card_ids jsonb not null default '[]'::jsonb,
  execution_plan jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_conversation_turns_user_created_idx
  on ai_conversation_turns(user_id, created_at asc);

create table if not exists agent_authorization_grants (
  id text primary key,
  user_id text references users(id),
  scope text not null,
  address text,
  address_key text generated always as (coalesce(address, '')) stored,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, scope, address_key)
);

create index if not exists agent_authorization_grants_user_scope_idx
  on agent_authorization_grants(user_id, scope, status);

create table if not exists strategy_runs (
  id text primary key,
  strategy_id text not null,
  strategy_version text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists strategy_runs_status_created_idx
  on strategy_runs(status, created_at desc);

create table if not exists h_skill_invocations (
  id text primary key,
  wrapper_id text not null,
  provider_skill text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists h_skill_invocations_wrapper_created_idx
  on h_skill_invocations(wrapper_id, created_at desc);

create table if not exists side_quest_rule_sets (
  id text primary key,
  version text not null unique,
  status text not null,
  base_version text,
  change_note text,
  published_at timestamptz,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists side_quest_rules (
  id text primary key,
  rule_set_id text not null references side_quest_rule_sets(id),
  rule_key text not null,
  title text not null,
  description text not null,
  category text not null,
  reward_label text not null,
  metric_path text not null,
  target numeric not null,
  unit text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  unique(rule_set_id, rule_key)
);

create table if not exists scoring_rule_sets (
  id text primary key,
  version text not null unique,
  status text not null,
  base_version text,
  dimensions jsonb not null default '[]'::jsonb,
  tiers jsonb not null default '[]'::jsonb,
  caveats jsonb not null default '[]'::jsonb,
  change_note text,
  published_at timestamptz,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scoring_rules (
  id text primary key,
  rule_set_id text not null references scoring_rule_sets(id),
  rule_key text not null,
  dimension text not null,
  label text not null,
  description text not null,
  metric_path text not null,
  points_per_unit numeric not null,
  min_points numeric not null default 0,
  max_points numeric not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  unique(rule_set_id, rule_key)
);

create table if not exists user_score_snapshots (
  id bigserial primary key,
  user_id text references users(id),
  scoring_rule_set_version text not null,
  score integer not null,
  tier jsonb not null default '{}'::jsonb,
  dimensions jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_score_snapshots_user_created_idx
  on user_score_snapshots(user_id, created_at desc);

create table if not exists admin_audit_logs (
  id text primary key,
  actor_id text not null,
  actor_role text not null,
  action text not null,
  resource text not null,
  resource_version text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  request jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_resource_created_idx
  on admin_audit_logs(resource, created_at desc);
