-- ARAMO · Precio de venta por tienda (2026-11-27). Se puede correr varias veces; no borra datos.
--
-- Desde Inventario → «Productos y precios» se pone el precio de venta de Moravia, de Los Ángeles o de las dos
-- (en Ambos se ven y se cambian las dos; en una tienda, solo la suya). Aquí queda una fila por tienda y producto.
-- La caja activa del ARAMO POS de esa tienda la lee, pone ese precio y marca `aplicado_at`; después publica su
-- catálogo y La Feria y Ambos ven el precio nuevo. Si una tienda cambia el precio en su POS, Ambos lo ve por el
-- catálogo del POS (aramo_catalogo_tienda), como siempre.
create table if not exists public.aramo_precio_venta (
  tienda      text not null check (tienda in ('moravia', 'angeles')),
  id          text not null check (char_length(id) between 1 and 120),      -- producto de ARAMO (catalogo_id del POS)
  nombre      text check (char_length(nombre) <= 120),
  precio      numeric not null check (precio > 0 and precio < 10000000),
  unidad      text check (unidad in ('kg', 'unid')),
  por         text check (char_length(por) <= 40),                          -- desde dónde se cambió: ambos / moravia / angeles
  at          timestamptz not null default now(),
  aplicado_at timestamptz,                                                   -- cuándo lo puso el POS de esa tienda
  primary key (tienda, id)
);
alter table public.aramo_precio_venta enable row level security;
drop policy if exists "precio venta: leer y guardar" on public.aramo_precio_venta;
create policy "precio venta: leer y guardar" on public.aramo_precio_venta
  for all to anon, authenticated using (true) with check (true);
-- como aramo_pos_dia: la llave pública lee, inserta y actualiza (no borra)
grant select, insert, update on public.aramo_precio_venta to anon, authenticated;
revoke delete on public.aramo_precio_venta from anon, authenticated;

notify pgrst, 'reload schema';
select 'Listo: precio de venta por tienda' as resultado;
