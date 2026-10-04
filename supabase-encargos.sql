-- ARAMO Canasta · tabla de encargos de clientes.
-- Pegá todo esto una sola vez en Supabase → SQL Editor → Run.
-- Con esto, Canasta y Mostrador comparten los pedidos en vivo entre todos los teléfonos.

create table if not exists public.encargos (
  id          text primary key,
  data        jsonb not null,
  estado      text,
  sucursal    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists encargos_updated_idx on public.encargos (updated_at desc);

alter table public.encargos enable row level security;

-- Mismo nivel de acceso que el resto de tablas de ARAMO (llave pública de la app).
drop policy if exists "encargos lectura" on public.encargos;
drop policy if exists "encargos escritura" on public.encargos;
drop policy if exists "encargos cambios" on public.encargos;
create policy "encargos lectura"   on public.encargos for select using (true);
create policy "encargos escritura" on public.encargos for insert with check (true);
create policy "encargos cambios"   on public.encargos for update using (true) with check (true);

-- En vivo (realtime)
do $$
begin
  alter publication supabase_realtime add table public.encargos;
exception when duplicate_object then null;
end $$;
