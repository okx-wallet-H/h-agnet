-- H Wallet initial PostgreSQL schema draft.
-- This is a blueprint for the future DB adapter, not a production migration yet.

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  provider text not null default 'okx-agent-wallet',
  wallet_id text,
  email text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cards (
  id text primary key,
  user_id uuid references users(id),
  type text not null,
  status text not null,
  source text not null,
  title text not null,
  summary text not null,
  metrics jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_user_created_idx on cards(user_id, created_at desc);
create index cards_type_status_idx on cards(type, status);

create table card_events (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references cards(id),
  user_id uuid references users(id),
  event_type text not null,
  actor_type text not null default 'system',
  actor_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index card_events_card_created_idx on card_events(card_id, created_at desc);

create table side_quest_rule_sets (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  status text not null,
  base_version text,
  change_note text,
  published_at timestamptz,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table side_quest_rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references side_quest_rule_sets(id),
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

create table scoring_rule_sets (
  id uuid primary key default gen_random_uuid(),
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

create table scoring_rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references scoring_rule_sets(id),
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

create table agent_authorization_grants (
  id text primary key,
  user_id uuid references users(id),
  scope text not null,
  address text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, scope, address)
);

create index agent_authorization_grants_user_scope_idx
  on agent_authorization_grants(user_id, scope, status);

create table user_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  scoring_rule_set_version text not null,
  score integer not null,
  tier jsonb not null default '{}'::jsonb,
  dimensions jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index user_score_snapshots_user_created_idx
  on user_score_snapshots(user_id, created_at desc);

create table admin_audit_logs (
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

create index admin_audit_logs_resource_created_idx
  on admin_audit_logs(resource, created_at desc);
