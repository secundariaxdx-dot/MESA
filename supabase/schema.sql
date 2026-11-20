-- Esquema propuesto para migrar MESA a Supabase (fase 2).
-- La v1 funciona solo con almacenamiento local; este fichero documenta el destino.

create table if not exists profiles (
  user_id uuid primary key references auth.users on delete cascade,
  name text,
  country_id text not null default 'es',
  supermarket_id text not null,
  extra_supermarkets text[] default '{}',
  adults int not null default 2,
  children int not null default 0,
  days int[] not null,
  meals jsonb not null,
  leftovers text not null,
  budget numeric not null,
  cheapest boolean default false,
  preferences text[] default '{}',
  diet text not null,
  meats text[] default '{}',
  dislikes text[] default '{}',
  custom_dislikes text[] default '{}',
  allergens text[] default '{}',
  appliances text[] default '{}',
  updated_at timestamptz default now()
);

create table if not exists week_plans (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  week_start date not null,
  supermarket_id text not null,
  budget numeric,
  people int,
  portion_factor numeric,
  meals jsonb not null,
  warnings text[] default '{}',
  estimated_total numeric,
  purchase_id text,
  created_at timestamptz default now()
);

create table if not exists pantry_items (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  ingredient_id text,
  name text not null,
  quantity numeric,           -- null = "tengo suficiente"
  unit text not null,
  expires_at date,
  status text not null default 'ok',
  source text not null default 'manual',
  added_at date default now()
);

create table if not exists purchases (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  plan_id text references week_plans(id),
  supermarket_id text not null,
  currency text not null,
  total numeric not null,
  items jsonb not null,
  created_at timestamptz default now()
);

create table if not exists cooked_entries (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  recipe_id text not null,
  meal_id text,
  servings int,
  cooked_on date default now()
);

create table if not exists favorites (
  user_id uuid references auth.users on delete cascade,
  recipe_id text not null,
  primary key (user_id, recipe_id)
);

-- Catálogo de precios proveniente de fuentes autorizadas.
create table if not exists products (
  id text primary key,
  supermarket_id text not null,
  ingredient_id text not null,
  name text not null,
  brand text,
  category text,
  pack_size numeric not null,
  unit text not null,
  price numeric not null,
  price_per_unit numeric,
  updated_at date not null,
  source text not null,
  available boolean
);

alter table profiles enable row level security;
alter table week_plans enable row level security;
alter table pantry_items enable row level security;
alter table purchases enable row level security;
alter table cooked_entries enable row level security;
alter table favorites enable row level security;
-- Políticas: cada usuario solo accede a sus filas (auth.uid() = user_id).
