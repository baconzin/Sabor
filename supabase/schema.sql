-- Sistema Sabor - estrutura inicial do Supabase
-- Execute este arquivo inteiro no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  phone text not null check (char_length(trim(phone)) > 0),
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) > 0),
  unit text not null check (unit in ('KG', 'G', 'L', 'ML', 'UN')),
  cost_per_unit numeric(14,4) not null default 0 check (cost_per_unit >= 0),
  stock numeric(14,4) not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity >= 0),
  waste_percentage numeric(7,2) not null default 0 check (waste_percentage >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, ingredient_id)
);

create sequence if not exists public.order_number_seq start 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.order_number_seq'),
  status text not null default 'AGUARDANDO_CONFIRMACAO'
    check (status in ('AGUARDANDO_CONFIRMACAO', 'EM_PREPARACAO', 'PRONTO', 'ENTREGUE', 'CANCELADO')),
  type text not null check (type in ('DELIVERY', 'RETIRADA_BALCAO')),
  customer_id uuid references public.customers(id) on delete set null,
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null check (payment_method in ('PIX', 'CREDITO', 'DEBITO', 'DINHEIRO')),
  stock_deducted boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence public.order_number_seq owned by public.orders.order_number;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  payment_method text not null check (payment_method in ('PIX', 'CREDITO', 'DEBITO', 'DINHEIRO')),
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  total_cost numeric(12,2) not null check (total_cost >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_recipe_items_product on public.recipe_items(product_id);
create index if not exists idx_recipe_items_ingredient on public.recipe_items(ingredient_id);
create index if not exists idx_orders_status_created_at on public.orders(status, created_at desc);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_sales_product_created_at on public.sales(product_id, created_at desc);
create index if not exists idx_purchases_ingredient_created_at on public.purchases(ingredient_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists ingredients_set_updated_at on public.ingredients;
create trigger ingredients_set_updated_at
before update on public.ingredients
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Compra e atualização de estoque/custo médio em uma única transação.
create or replace function public.register_purchase(
  p_ingredient_id uuid,
  p_quantity numeric,
  p_total_cost numeric
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_current_stock numeric;
  v_current_cost numeric;
  v_new_stock numeric;
  v_new_average numeric;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_quantity <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;

  if p_total_cost < 0 then
    raise exception 'O custo total não pode ser negativo.';
  end if;

  select stock, cost_per_unit
    into v_current_stock, v_current_cost
  from public.ingredients
  where id = p_ingredient_id
  for update;

  if not found then
    raise exception 'Ingrediente não encontrado.';
  end if;

  v_new_stock := v_current_stock + p_quantity;
  v_new_average := case
    when v_new_stock > 0 then ((v_current_stock * v_current_cost) + p_total_cost) / v_new_stock
    else v_current_cost
  end;

  insert into public.purchases (ingredient_id, quantity, total_cost, created_by)
  values (p_ingredient_id, p_quantity, p_total_cost, auth.uid())
  returning id into v_purchase_id;

  update public.ingredients
  set stock = v_new_stock,
      cost_per_unit = v_new_average
  where id = p_ingredient_id;

  return v_purchase_id;
end;
$$;

-- Cria pedido, venda e baixa o estoque em uma única transação.
create or replace function public.create_restaurant_order(
  p_product_id uuid,
  p_customer_id uuid,
  p_order_type text,
  p_payment_method text,
  p_quantity integer default 1
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order_id uuid;
  v_product_price numeric(12,2);
  v_total numeric(12,2);
  v_missing_ingredient text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if p_quantity <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;

  if p_order_type not in ('DELIVERY', 'RETIRADA_BALCAO') then
    raise exception 'Tipo de pedido inválido.';
  end if;

  if p_payment_method not in ('PIX', 'CREDITO', 'DEBITO', 'DINHEIRO') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  if p_order_type = 'DELIVERY' and p_customer_id is null then
    raise exception 'Selecione um cliente para o delivery.';
  end if;

  select price into v_product_price
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'Produto não encontrado.';
  end if;

  -- Bloqueia os ingredientes usados para evitar duas vendas simultâneas usando o mesmo estoque.
  perform 1
  from public.ingredients i
  join public.recipe_items ri on ri.ingredient_id = i.id
  where ri.product_id = p_product_id
  for update of i;

  select i.name into v_missing_ingredient
  from public.ingredients i
  join (
    select ingredient_id,
           sum(quantity * (1 + waste_percentage / 100.0) * p_quantity) as required_quantity
    from public.recipe_items
    where product_id = p_product_id
    group by ingredient_id
  ) required on required.ingredient_id = i.id
  where i.stock < required.required_quantity
  limit 1;

  if v_missing_ingredient is not null then
    raise exception 'Estoque insuficiente para o ingrediente: %.', v_missing_ingredient;
  end if;

  v_total := v_product_price * p_quantity;

  insert into public.orders (
    status, type, customer_id, total, payment_method, stock_deducted, created_by
  )
  values (
    'AGUARDANDO_CONFIRMACAO', p_order_type, p_customer_id, v_total,
    p_payment_method, true, auth.uid()
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  values (v_order_id, p_product_id, p_quantity, v_product_price);

  insert into public.sales (order_id, product_id, payment_method, amount)
  values (v_order_id, p_product_id, p_payment_method, v_total);

  update public.ingredients i
  set stock = i.stock - required.required_quantity
  from (
    select ingredient_id,
           sum(quantity * (1 + waste_percentage / 100.0) * p_quantity) as required_quantity
    from public.recipe_items
    where product_id = p_product_id
    group by ingredient_id
  ) required
  where i.id = required.ingredient_id;

  return v_order_id;
end;
$$;

-- Segurança: somente usuários autenticados podem acessar os dados.
alter table public.customers enable row level security;
alter table public.ingredients enable row level security;
alter table public.products enable row level security;
alter table public.recipe_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'ingredients', 'products', 'recipe_items',
    'orders', 'order_items', 'sales', 'purchases'
  ]
  loop
    execute format('drop policy if exists "Authenticated users full access" on public.%I', table_name);
    execute format(
      'create policy "Authenticated users full access" on public.%I for all to authenticated using (true) with check (true)',
      table_name
    );
  end loop;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.ingredients to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.recipe_items to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.sales to authenticated;
grant select, insert, update, delete on public.purchases to authenticated;
grant usage, select on sequence public.order_number_seq to authenticated;
revoke execute on function public.register_purchase(uuid, numeric, numeric) from public, anon;
revoke execute on function public.create_restaurant_order(uuid, uuid, text, text, integer) from public, anon;
grant execute on function public.register_purchase(uuid, numeric, numeric) to authenticated;
grant execute on function public.create_restaurant_order(uuid, uuid, text, text, integer) to authenticated;

-- Sincronização em tempo real entre caixa, cozinha e outros dispositivos.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers', 'ingredients', 'products', 'recipe_items',
    'orders', 'order_items', 'sales', 'purchases'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

-- Dados iniciais. Os UUIDs fixos evitam duplicação se o script for executado novamente.
insert into public.ingredients (id, name, unit, cost_per_unit, stock)
values
  ('10000000-0000-0000-0000-000000000001', 'Arroz Branco', 'KG', 5.50, 10),
  ('10000000-0000-0000-0000-000000000002', 'Feijão Carioca', 'KG', 7.20, 5),
  ('10000000-0000-0000-0000-000000000003', 'Peito de Frango', 'KG', 18.90, 8),
  ('10000000-0000-0000-0000-000000000004', 'Farinha de Rosca', 'KG', 8.50, 2),
  ('10000000-0000-0000-0000-000000000005', 'Ovo', 'UN', 0.80, 30),
  ('10000000-0000-0000-0000-000000000006', 'Óleo de Soja', 'L', 6.90, 3)
on conflict do nothing;

insert into public.products (id, name, description, price)
values
  ('20000000-0000-0000-0000-000000000001', 'Marmita de Frango Grelhado', 'Arroz, feijão e frango grelhado.', 22.00),
  ('20000000-0000-0000-0000-000000000002', 'Marmita de Frango Empanado', 'Arroz, feijão e frango empanado frito.', 25.00)
on conflict do nothing;

insert into public.recipe_items (id, product_id, ingredient_id, quantity, waste_percentage)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 0.15, 20),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 0.10, 20),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 0.15, 20),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 0.15, 20),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 0.10, 20),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 0.15, 20),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 0.05, 20),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 1.00, 0),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 0.10, 20)
on conflict do nothing;
