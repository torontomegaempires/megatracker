/**
 * The shared-game tables, created on first use. Statements are idempotent so every new
 * function instance can run them. The final-result columns on shared_seat mirror the group
 * website's game_player_nation table, for exporting finished games there later.
 */
export const SCHEMA = [
  `create table if not exists shared_game (
    id bigint generated always as identity primary key,
    code text not null unique,
    block text not null,
    player_count integer not null,
    ast_mode text not null,
    status text not null default 'active',
    created_at timestamptz not null default now(),
    ended_at timestamptz
  )`,
  `create table if not exists shared_seat (
    id bigint generated always as identity primary key,
    game_id bigint not null references shared_game (id) on delete cascade,
    name text not null,
    nation text not null,
    host boolean not null default false,
    token_hash text not null,
    snapshot jsonb not null,
    joined_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    final_rank integer,
    score integer,
    cities integer,
    ast_pos integer,
    num_civ_adv_1vp integer,
    num_civ_adv_3vp integer,
    num_civ_adv_6vp integer,
    building_vp integer,
    special_building boolean,
    special_building_own boolean,
    bonus_vp boolean
  )`,
  `create unique index if not exists shared_seat_nation on shared_seat (game_id, lower(nation))`,
];
