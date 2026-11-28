-- ARAMO · Control: copia en la nube de cada Cierre de compras terminado            2026-11-24
-- Pegalo en Supabase → SQL Editor → Run. Se corre una sola vez; correrlo otra vez no borra nada.
-- Sirve para que el Control vea las compras hechas en CUALQUIER teléfono (antes vivían solo en uno).
-- Nota: por ahora esta tabla se puede leer y escribir con la llave pública, igual que los pedidos
-- de Surtido. Se cierra cuando se hagan los puestos y accesos (Etapa 1 de ARAMO Empresa).
create table if not exists public.aramo_cierres_compras (
  id         text primary key,
  fecha      date not null,
  firma      text,
  total      numeric not null default 0,
  datos      jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists aramo_cierres_compras_fecha on public.aramo_cierres_compras (fecha);
alter table public.aramo_cierres_compras enable row level security;
drop policy if exists "cierres de compras: leer y guardar" on public.aramo_cierres_compras;
create policy "cierres de compras: leer y guardar" on public.aramo_cierres_compras
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update on public.aramo_cierres_compras to anon, authenticated;
notify pgrst, 'reload schema';
select 'Listo: el Control ya puede ver las compras de cualquier teléfono.' as resultado;
