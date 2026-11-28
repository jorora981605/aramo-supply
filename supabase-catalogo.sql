-- ARAMO · Catálogo conectado (2026-11-25)
-- Cada ARAMO POS publica aquí sus productos y precios (uno por tienda). La Feria de esa tienda
-- usa esos precios ("manda el POS") y Surtido ve los productos que solo están en el POS.
-- Se puede correr las veces que quiera: no borra nada ni cambia contraseñas.

create table if not exists public.aramo_catalogo_tienda (
  sucursal   text primary key check (sucursal in ('moravia','angeles')),
  productos  jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.aramo_catalogo_tienda enable row level security;
drop policy if exists aramo_catalogo_leer on public.aramo_catalogo_tienda;
create policy aramo_catalogo_leer on public.aramo_catalogo_tienda for select to anon, authenticated using (true);
grant select on public.aramo_catalogo_tienda to anon, authenticated;
-- Escribir solo con la contraseña del POS de esa tienda (función de abajo).

create or replace function public.pos_publicar_catalogo(p_suc text, p_clave text, p_productos jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare n int;
begin
  if not public.pos_ok(p_suc, p_clave) then return json_build_object('ok', false, 'motivo', 'clave'); end if;
  if p_productos is null or jsonb_typeof(p_productos) <> 'object' then return json_build_object('ok', false, 'motivo', 'datos'); end if;
  if octet_length(p_productos::text) > 3000000 then return json_build_object('ok', false, 'motivo', 'grande'); end if;
  select count(*) into n from jsonb_object_keys(p_productos);
  insert into public.aramo_catalogo_tienda (sucursal, productos, updated_at) values (p_suc, p_productos, now())
  on conflict (sucursal) do update set productos = excluded.productos, updated_at = now();
  return json_build_object('ok', true, 'n', n);
end $$;
revoke all on function public.pos_publicar_catalogo(text, text, jsonb) from public;
grant execute on function public.pos_publicar_catalogo(text, text, jsonb) to anon, authenticated;

-- Precio de cada producto de un pedido de La Feria: primero el del POS de esa tienda (si lo tiene
-- y es mayor que 0); si no, como antes: lista de la tienda → precio de esa tienda → precio general
-- → ficha. Si el teléfono mandó otro precio, queda anotado en pCliente.
create or replace function public.aramo_item_precio(it jsonb, t jsonb, tsuc jsonb, suc text) returns jsonb
language plpgsql stable as $$
declare k text := it->>'k'; precio numeric; unidad text; q numeric := public.aramo_num(it->>'q'); pos jsonb;
begin
  if q is null or q <= 0 or q > 500 then raise exception 'Hay una cantidad que no es válida en el pedido.'; end if;
  select c.productos->k into pos from public.aramo_catalogo_tienda c where c.sucursal = suc;
  precio := coalesce(nullif(public.aramo_num(pos->>'p'), 0),
    public.aramo_num(t#>>array['listas', suc, k, 'p']), public.aramo_num(t#>>array['listas', suc, k]),
    public.aramo_num(tsuc#>>array['precios', k]), public.aramo_num(t#>>array['precios', k]),
    public.aramo_num(tsuc#>>array['prods', k, 'p']), public.aramo_num(t#>>array['prods', k, 'p']));
  if coalesce(public.aramo_num(pos->>'p'), 0) > 0 then
    unidad := case when pos->>'u' = 'kg' then 'kg' when it->>'u' = 'kg' then 'unid' else null end;
  else
    unidad := t#>>array['listas', suc, k, 'u'];
  end if;
  if precio is not null and precio > 0 and public.aramo_num(it->>'p') is distinct from precio then
    it := jsonb_set(it, '{p}', to_jsonb(precio)) || jsonb_build_object('pCliente', it->'p');
  end if;
  if coalesce(unidad, '') <> '' and it->>'u' is distinct from unidad then
    it := jsonb_set(it, '{u}', to_jsonb(unidad), true);
  end if;
  return it;
end $$;

select 'Listo: catálogo conectado' as resultado;
