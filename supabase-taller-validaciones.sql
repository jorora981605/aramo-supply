-- ARAMO · Seguridad de los clientes, del lado de la nube.
-- Pegalo en Supabase → SQL Editor → Run DESPUÉS de supabase-encargos.sql. Se puede volver a correr.
-- Nada de esto depende de cómo esté escrito el Taller: aunque alguien altere la app en su teléfono,
-- la nube solo deja pasar lo permitido.
--
-- Pedidos nuevos de clientes:
--   · Máximo 5 por día por cuenta (día de Costa Rica).
--   · Siempre entran como "nuevo" con pago "pendiente": nadie se marca pagado, cobrado ni entregado.
--   · El teléfono del pedido es el de la cuenta verificada por SMS: nadie pide a nombre de otro.
--   · Precio y unidad de la tienda del pedido; cantidades, tienda y ubicación válidas; textos sin código.
--   · Premios 🍃 solo si existen en el programa y la cuenta tiene las hojas.
--   · Número de pedido sin repetir; hora de retiro dudosa marcada para revisar.
-- Cambios del cliente a su pedido: cancelar (si es nuevo), avisar que pagó, subir SU comprobante,
--   calificar, aceptar o rechazar un cambio que propuso la tienda, y agregar productos (si es nuevo).
--   Todo lo demás (precios, cantidades, estado, cobro) queda como estaba.
-- Ficha de la tienda: las claves del Mostrador no se publican; cada cambio queda registrado.
-- Comprobantes: solo imágenes o PDF de hasta 5 MB; cada cliente puede borrar los suyos.
-- "Borrar mi cuenta": borra los datos personales del cliente (los montos quedan para la contabilidad).
-- Datos viejos: a los 18 meses se borran nombre, teléfono, ubicación y notas de los pedidos.
-- Registro de visitas: con tope de tamaño y de cantidad.

-- ── Ayudas ──
create or replace function public.aramo_num(t text) returns numeric
language plpgsql immutable as $$ begin return nullif(btrim(t), '')::numeric; exception when others then return null; end $$;

create or replace function public.aramo_texto(t text, maximo int) returns text
language sql immutable as $$ select left(btrim(regexp_replace(coalesce(t, ''), '[<>[:cntrl:]]', '', 'g')), maximo) $$;

-- Total del pedido, igual que el Taller y el Mostrador (aramo-nube.js totalDe).
create or replace function public.aramo_total(o jsonb) returns numeric
language sql immutable as $$
  select round(greatest(0,
      coalesce((select sum(
          case when it->>'estado' = 'nohay' then 0
               else coalesce(public.aramo_num(it->>'qr'), public.aramo_num(it->>'q'), 0) end
          * coalesce(public.aramo_num(it->>'pr'), public.aramo_num(it->>'p'), 0))
        from jsonb_array_elements(case when jsonb_typeof(o->'items') = 'array' then o->'items' else '[]'::jsonb end) it), 0)
      + coalesce(public.aramo_num(o#>>'{retiro,envio,costo}'), 0)
      - coalesce(public.aramo_num(o#>>'{premio,valor}'), 0)) / 5) * 5
$$;

-- Hojas 🍃 disponibles de una cuenta (ganadas en pedidos entregados menos las usadas en premios).
create or replace function public.aramo_saldo_hojas(p_owner uuid) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare t jsonb; por numeric; ganadas numeric := 0; usadas numeric := 0; r record;
begin
  if p_owner is null then return 0; end if;
  select data into t from public.encargos where id = '__tienda__';
  if coalesce(t#>>'{lealtad,activa}', 'true') = 'false' then return 0; end if;
  por := greatest(1, coalesce(public.aramo_num(t#>>'{lealtad,porHoja}'), 1000));
  for r in select data from public.encargos
      where owner_id = p_owner and id <> '__tienda__' and coalesce(estado, '') not in ('cancelado', 'borrado') loop
    usadas := usadas + coalesce(public.aramo_num(r.data#>>'{premio,hojas}'), 0);
    if r.data->>'estado' = 'entregado' then
      ganadas := ganadas + floor(public.aramo_total(r.data) / por) * coalesce(public.aramo_num(r.data->>'hojasX'), 1);
    end if;
  end loop;
  return ganadas - usadas;
end $$;
revoke all on function public.aramo_saldo_hojas(uuid) from public, anon, authenticated;

create or replace function public.aramo_nuevo_ref() returns text
language plpgsql security definer set search_path = public as $$
declare alfa text := 'ACDEFGHJKMNPQRTUVWXY3479'; r text; i int;
begin
  loop
    r := 'A-';
    for i in 1..5 loop r := r || substr(alfa, 1 + floor(random() * length(alfa))::int, 1); end loop;
    exit when not exists (select 1 from public.encargos e
      where e.id <> '__tienda__' and e.data->>'ref' = r and e.created_at > now() - interval '120 days');
  end loop;
  return r;
end $$;
revoke all on function public.aramo_nuevo_ref() from public, anon, authenticated;

-- Un producto tal como lo puede mandar un cliente: textos limpios y sin campos de la tienda.
create or replace function public.aramo_item_cliente(it jsonb) returns jsonb
language plpgsql immutable as $$
begin
  if jsonb_typeof(it) is distinct from 'object' or coalesce(it->>'k', '') = '' then raise exception 'Hay un producto que no es válido en el pedido.'; end if;
  it := (it - 'pr' - 'qr' - 'estado' - 'subPropuesta' - 'subAceptada' - 'subRechazada' - 'pCliente')
    || jsonb_build_object('k', public.aramo_texto(it->>'k', 40), 'n', public.aramo_texto(it->>'n', 60), 'e', public.aramo_texto(it->>'e', 12),
         'u', public.aramo_texto(it->>'u', 12), 'nota', public.aramo_texto(it->>'nota', 120),
         'mad', case when it->>'mad' in ('hoy', 'semana', 'verde') then it->>'mad' else '' end);
  if jsonb_typeof(it->'pide') = 'object' then
    it := jsonb_set(it, '{pide}', jsonb_build_object('q', public.aramo_num(it#>>'{pide,q}'), 'u', public.aramo_texto(it#>>'{pide,u}', 12)));
  else
    it := it - 'pide';
  end if;
  return it;
end $$;

-- Precio y unidad de la tienda del pedido, en el mismo orden que usa la app (aramo-nube.js catalogo):
-- lista completa de esa tienda (listas, la guarda el Mostrador) → precio de esa tienda → precio
-- general → precio en la ficha de esa tienda → precio en la ficha general. Si el teléfono mandó
-- otro precio, queda anotado en pCliente.
create or replace function public.aramo_item_precio(it jsonb, t jsonb, tsuc jsonb, suc text) returns jsonb
language plpgsql immutable as $$
declare k text := it->>'k'; precio numeric; unidad text; q numeric := public.aramo_num(it->>'q');
begin
  if q is null or q <= 0 or q > 500 then raise exception 'Hay una cantidad que no es válida en el pedido.'; end if;
  precio := coalesce(public.aramo_num(t#>>array['listas', suc, k, 'p']), public.aramo_num(t#>>array['listas', suc, k]),
    public.aramo_num(tsuc#>>array['precios', k]), public.aramo_num(t#>>array['precios', k]),
    public.aramo_num(tsuc#>>array['prods', k, 'p']), public.aramo_num(t#>>array['prods', k, 'p']));
  unidad := t#>>array['listas', suc, k, 'u'];
  if precio is not null and precio > 0 and public.aramo_num(it->>'p') is distinct from precio then
    it := jsonb_set(it, '{p}', to_jsonb(precio)) || jsonb_build_object('pCliente', it->'p');
  end if;
  if coalesce(unidad, '') <> '' and it->>'u' is distinct from unidad then
    it := jsonb_set(it, '{u}', to_jsonb(unidad), true);
  end if;
  return it;
end $$;

-- ── Pedidos nuevos ──
create or replace function public.aramo_validar_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  t jsonb; tsuc jsonb; suc text; it jsonb; nuevo jsonb; items jsonb := '[]'::jsonb;
  corregidos int := 0; n int; cuando timestamptz; personal boolean := public.aramo_es_personal();
  tel text; pr jsonb; ok_premio jsonb; metodo text; desde timestamptz;
begin
  if NEW.id = '__tienda__' or coalesce(NEW.kind, 'order') <> 'order' then return NEW; end if;
  -- Un reintento del mismo pedido no se vuelve a revisar (la inserción no hace nada).
  if exists (select 1 from public.encargos where id = NEW.id) then return NEW; end if;
  if octet_length(NEW.data::text) > 65536 then raise exception 'El pedido es demasiado grande.'; end if;
  if jsonb_typeof(NEW.data->'items') is distinct from 'array' or jsonb_array_length(NEW.data->'items') = 0 then
    raise exception 'El pedido no tiene productos.';
  end if;
  if jsonb_array_length(NEW.data->'items') > 150 then raise exception 'El pedido tiene demasiados productos.'; end if;

  select data into t from public.encargos where id = '__tienda__';
  suc := coalesce(NEW.data->>'sucursal', NEW.sucursal, '');
  select e into tsuc from jsonb_array_elements(coalesce(t->'sucursales', '[]'::jsonb)) e where e->>'k' = suc limit 1;

  if not personal then
    if jsonb_array_length(coalesce(t->'sucursales', '[]'::jsonb)) > 0 and (tsuc is null or tsuc->>'activa' = 'false') then
      raise exception 'Esa tienda no está recibiendo pedidos.';
    end if;
    -- Máximo 5 pedidos por día (día de Costa Rica) por cuenta. Los semanales automáticos no cuentan.
    if NEW.owner_id is not null and coalesce(NEW.data->>'canal', '') <> 'suscripcion' then
      desde := date_trunc('day', now() at time zone 'America/Costa_Rica') at time zone 'America/Costa_Rica';
      select count(*) into n from public.encargos where owner_id = NEW.owner_id and id <> '__tienda__' and created_at >= desde;
      if n >= 5 then raise exception 'Ya hiciste 5 pedidos hoy, el máximo por día. Si necesitás algo más, escribile a la tienda.'; end if;
    end if;
    if jsonb_typeof(NEW.data->'cliente') is distinct from 'object' then NEW.data := NEW.data || '{"cliente":{}}'::jsonb; end if;
    if jsonb_typeof(NEW.data->'retiro') is distinct from 'object' then NEW.data := NEW.data || '{"retiro":{}}'::jsonb; end if;
    -- El teléfono es el de la cuenta verificada por SMS.
    if NEW.owner_id is not null then
      select regexp_replace(coalesce(phone, ''), '^\+?506', '') into tel from auth.users where id = NEW.owner_id;
      if coalesce(tel, '') <> '' then
        NEW.data := jsonb_set(NEW.data, '{cliente,tel}', to_jsonb(tel), true);
        NEW.owner_phone := tel;
      end if;
    end if;
    -- Siempre entra como nuevo y con pago pendiente; sin marcas de la tienda.
    metodo := coalesce(NEW.data#>>'{pago,metodo}', 'sinpe');
    if metodo not in ('sinpe', 'tarjeta', 'efectivo', 'link') then metodo := 'sinpe'; end if;
    NEW.data := (NEW.data - 'cobro' - 'totalFinal' - 'entregado' - 'borrado' - 'avisado' - 'avisadoAt' - 'waPendiente'
        - 'rating' - 'comprobante' - 'subacciones' - 'preciosCorregidos' - 'horaRevisar' - 'premioRechazado' - 'motivo' - 'v' - 'datosBorrados')
      || jsonb_build_object('estado', 'nuevo',
           'pago', jsonb_build_object('metodo', metodo, 'estado', 'pendiente', 'conCuanto', greatest(0, coalesce(public.aramo_num(NEW.data#>>'{pago,conCuanto}'), 0))),
           'log', jsonb_build_array(jsonb_build_object('t', now(), 's', 'nuevo', 'by', 'cliente', 'm', 'Pedido recibido')),
           'nota', public.aramo_texto(NEW.data->>'nota', 300),
           'sust', case when NEW.data->>'sust' in ('avisar', 'similar', 'quitar') then NEW.data->>'sust' else 'avisar' end);
    NEW.estado := 'nuevo';
    NEW.data := jsonb_set(NEW.data, '{cliente,nombre}', to_jsonb(coalesce(nullif(public.aramo_texto(NEW.data#>>'{cliente,nombre}', 60), ''), 'Cliente')), true);
    NEW.data := jsonb_set(NEW.data, '{retiro,placa}', to_jsonb(public.aramo_texto(NEW.data#>>'{retiro,placa}', 12)), true);
    if jsonb_typeof(NEW.data#>'{retiro,envio}') = 'object' then
      if public.aramo_num(NEW.data#>>'{retiro,envio,lat}') is null or abs(public.aramo_num(NEW.data#>>'{retiro,envio,lat}')) > 90
         or public.aramo_num(NEW.data#>>'{retiro,envio,lng}') is null or abs(public.aramo_num(NEW.data#>>'{retiro,envio,lng}')) > 180 then
        raise exception 'La ubicación de entrega no es válida.';
      end if;
      NEW.data := jsonb_set(NEW.data, '{retiro,envio,senas}', to_jsonb(public.aramo_texto(NEW.data#>>'{retiro,envio,senas}', 300)), true);
    end if;
    -- Premio 🍃: tiene que existir en el programa y la cuenta tiene que tener las hojas.
    pr := NEW.data->'premio';
    if jsonb_typeof(pr) = 'object' then
      select e into ok_premio from jsonb_array_elements(coalesce(t#>'{lealtad,premios}',
          '[{"k":"p1","n":"₡2.500 de descuento","hojas":50,"valor":2500},{"k":"p2","n":"₡6.000 de descuento","hojas":100,"valor":6000}]'::jsonb)) e
        where e->>'k' = pr->>'k' and public.aramo_num(e->>'hojas') = public.aramo_num(pr->>'hojas')
          and public.aramo_num(e->>'valor') = public.aramo_num(pr->>'valor') limit 1;
      if ok_premio is null or coalesce(t#>>'{lealtad,activa}', 'true') = 'false'
         or public.aramo_saldo_hojas(NEW.owner_id) < public.aramo_num(pr->>'hojas') then
        NEW.data := (NEW.data - 'premio') || jsonb_build_object('premioRechazado', true);
      else
        NEW.data := jsonb_set(NEW.data, '{premio}', jsonb_build_object('k', ok_premio->>'k', 'n', public.aramo_texto(ok_premio->>'n', 60),
          'hojas', public.aramo_num(ok_premio->>'hojas'), 'valor', public.aramo_num(ok_premio->>'valor')));
      end if;
    else
      NEW.data := NEW.data - 'premio';
    end if;
    NEW.data := jsonb_set(NEW.data, '{hojasX}', to_jsonb(case when t#>>'{lealtad,dobles}' = 'true' then 2 else 1 end), true);
  end if;

  -- Productos: limpios (clientes) y con el precio de la tienda (todos).
  for it in select * from jsonb_array_elements(NEW.data->'items') loop
    if not personal then it := public.aramo_item_cliente(it); end if;
    nuevo := public.aramo_item_precio(it, t, tsuc, suc);
    if nuevo ? 'pCliente' and not (it ? 'pCliente') then corregidos := corregidos + 1; end if;
    items := items || jsonb_build_array(nuevo);
  end loop;
  NEW.data := jsonb_set(NEW.data, '{items}', items);
  if corregidos > 0 then NEW.data := NEW.data || jsonb_build_object('preciosCorregidos', corregidos); end if;
  if not personal then NEW.data := jsonb_set(NEW.data, '{totalEst}', to_jsonb(public.aramo_total(NEW.data)), true); end if;

  -- Número de pedido sin repetir
  if coalesce(NEW.data->>'ref', '') = '' or exists (select 1 from public.encargos e
      where e.id <> '__tienda__' and e.data->>'ref' = NEW.data->>'ref' and e.created_at > now() - interval '120 days') then
    NEW.data := jsonb_set(NEW.data, '{ref}', to_jsonb(public.aramo_nuevo_ref()), true);
  end if;

  -- Hora de retiro: se marca si quedó en el pasado (reloj del teléfono mal) o demasiado lejos
  begin cuando := (NEW.data#>>'{retiro,at}')::timestamptz; exception when others then cuando := null; end;
  if cuando is null or cuando < now() - interval '30 minutes' or cuando > now() + interval '8 days' then
    NEW.data := NEW.data || jsonb_build_object('horaRevisar', true);
  end if;

  -- Lo que la nube corrigió le llega al teléfono como versión más nueva
  NEW.data := jsonb_set(NEW.data, '{updated}', to_jsonb(now()), true);
  return NEW;
end $$;
revoke all on function public.aramo_validar_pedido() from public, anon, authenticated;

drop trigger if exists aramo_validar_pedido on public.encargos;
create trigger aramo_validar_pedido before insert on public.encargos
  for each row execute function public.aramo_validar_pedido();

-- ── Cambios del cliente a su pedido ──
-- La nube arma el pedido nuevo a partir del guardado y solo aplica lo que el cliente puede hacer.
create or replace function public.aramo_guardar_cambio_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb := OLD.data; n jsonb := NEW.data; d jsonb := OLD.data; acc text; i int; it jsonb; ruta text;
  t jsonb; tsuc jsonb; suc text; viejo int; nuevo int; k int;
begin
  if OLD.id = '__tienda__' or coalesce(OLD.kind, 'order') <> 'order' then return NEW; end if;
  if current_setting('aramo.sistema', true) = '1' or auth.uid() is null or public.aramo_es_personal() then return NEW; end if;

  if o->>'estado' = 'nuevo' and n->>'estado' = 'cancelado' then
    d := d || jsonb_build_object('estado', 'cancelado', 'motivo', 'Lo canceló el cliente');
  end if;
  if n#>>'{pago,estado}' = 'reportado' and coalesce(o#>>'{pago,estado}', 'pendiente') in ('pendiente', 'reportado')
     and coalesce(d->>'estado', '') not in ('cancelado', 'entregado') then
    d := jsonb_set(jsonb_set(d, '{pago,estado}', '"reportado"'::jsonb, true), '{pago,reportado}', to_jsonb(now()), true);
  end if;
  if jsonb_typeof(n->'rating') = 'number' and (n->>'rating')::numeric in (1, 2, 3) then
    d := d || jsonb_build_object('rating', (n->>'rating')::int);
  end if;
  -- Comprobante: solo un archivo de su propia carpeta
  if jsonb_typeof(n->'comprobante') = 'object' and (n->'comprobante') is distinct from (o->'comprobante') then
    ruta := n#>>'{comprobante,path}';
    if ruta like auth.uid()::text || '/%' and position('..' in ruta) = 0 and length(ruta) < 200 then
      d := d || jsonb_build_object('comprobante', jsonb_build_object('path', ruta, 'nombre', public.aramo_texto(n#>>'{comprobante,nombre}', 80), 'subido', now()));
    end if;
  end if;
  -- Cambio propuesto por la tienda: aceptar o rechazar (se aplica lo que propuso la tienda)
  acc := n#>>'{subacciones,accion}';
  if acc in ('aceptar', 'rechazar') and (n->'subacciones') is distinct from (o->'subacciones') then
    i := floor(public.aramo_num(n#>>'{subacciones,i}'))::int;
    it := o->'items'->i;
    if i is not null and jsonb_typeof(it) = 'object' then
      if acc = 'aceptar' and jsonb_typeof(it->'subPropuesta') = 'object' then
        it := ((it || (it->'subPropuesta')) - 'subPropuesta') || jsonb_build_object('subAceptada', true, 'estado', '');
      elsif acc = 'rechazar' then
        it := (it - 'subPropuesta') || jsonb_build_object('subAceptada', false, 'subRechazada', true);
      end if;
      d := jsonb_set(d, array['items', i::text], it) || jsonb_build_object('subacciones', jsonb_build_object('i', i, 'accion', acc));
    end if;
  end if;
  -- Agregar productos mientras el pedido es nuevo: solo al final y con el precio de la tienda
  if acc = 'agregar' and o->>'estado' = 'nuevo' and jsonb_typeof(n->'items') = 'array' then
    viejo := jsonb_array_length(coalesce(o->'items', '[]'::jsonb)); nuevo := jsonb_array_length(n->'items');
    if nuevo > viejo and nuevo <= 150 then
      select data into t from public.encargos where id = '__tienda__';
      suc := coalesce(o->>'sucursal', OLD.sucursal, '');
      select e into tsuc from jsonb_array_elements(coalesce(t->'sucursales', '[]'::jsonb)) e where e->>'k' = suc limit 1;
      for k in viejo .. nuevo - 1 loop
        d := jsonb_set(d, '{items}', coalesce(d->'items', '[]'::jsonb)
          || jsonb_build_array(public.aramo_item_precio(public.aramo_item_cliente(n->'items'->k), t, tsuc, suc)));
      end loop;
      d := d || jsonb_build_object('subacciones', jsonb_build_object('accion', 'agregar'));
      d := jsonb_set(d, '{totalEst}', to_jsonb(public.aramo_total(d)), true);
    end if;
  end if;
  -- Aviso por WhatsApp: solo las marcas
  if n ? 'waPendiente' then d := d || jsonb_build_object('waPendiente', n->>'waPendiente' = 'true'); end if;
  if n->>'avisado' = 'true' and coalesce(o->>'avisado', 'false') <> 'true' then d := d || jsonb_build_object('avisado', true, 'avisadoAt', now()); end if;
  -- Confirmación explícita de la cotización: el cliente solo puede avanzar
  -- desde la fase que la tienda le envió.
  if o->>'fase' = 'confirmacion' and n->>'fase' = 'alistando' then
    d := d || jsonb_build_object('fase', 'alistando', 'confirmacion', n->'confirmacion');
  end if;

  d := d || jsonb_build_object('updated', now(), 'v', greatest(coalesce(public.aramo_num(o->>'v'), 0), coalesce(public.aramo_num(n->>'v'), 0)) + 1);
  NEW.data := d; NEW.estado := d->>'estado'; NEW.id := OLD.id; NEW.sucursal := OLD.sucursal;
  NEW.owner_id := OLD.owner_id; NEW.owner_phone := OLD.owner_phone; NEW.kind := OLD.kind;
  return NEW;
end $$;
revoke all on function public.aramo_guardar_cambio_cliente() from public, anon, authenticated;

drop trigger if exists aramo_guardar_cambio_cliente on public.encargos;
create trigger aramo_guardar_cambio_cliente before update on public.encargos
  for each row execute function public.aramo_guardar_cambio_cliente();

-- ── Ficha de la tienda: sin claves públicas y con registro de cada cambio ──
create table if not exists public.aramo_auditoria (
  id bigint generated always as identity primary key,
  quien uuid,
  cuando timestamptz not null default now(),
  que text not null,
  detalle jsonb not null default '{}'::jsonb
);
alter table public.aramo_auditoria enable row level security;
drop policy if exists "auditoria personal" on public.aramo_auditoria;
create policy "auditoria personal" on public.aramo_auditoria for select using (public.aramo_es_personal());
grant select on public.aramo_auditoria to authenticated;

create or replace function public.aramo_pagos_de(t jsonb) returns jsonb
language sql immutable as $$
  select jsonb_build_object('sinpe', t->'sinpe', 'linkTarjeta', t->'linkTarjeta', 'whatsapp', t->'whatsapp',
    'sucursales', (select coalesce(jsonb_agg(jsonb_build_object('k', s->'k', 'sinpe', s->'sinpe', 'whatsapp', s->'whatsapp')), '[]'::jsonb)
                   from jsonb_array_elements(coalesce(t->'sucursales', '[]'::jsonb)) s))
$$;

create or replace function public.aramo_proteger_tienda() returns trigger
language plpgsql security definer set search_path = public as $$
declare antes jsonb; claves text[];
begin
  if NEW.id <> '__tienda__' then return NEW; end if;
  -- Las claves del Mostrador nunca quedan en la ficha pública (el personal entra con SMS).
  NEW.data := NEW.data - 'acceso';
  if TG_OP = 'UPDATE' then antes := OLD.data; else antes := '{}'::jsonb; end if;
  select array_agg(k) into claves from (
    select key k from jsonb_each(NEW.data) where antes->key is distinct from value
    union select key from jsonb_each(antes) where not NEW.data ? key) x where k not in ('updated', 'listas');
  if claves is not null then
    insert into public.aramo_auditoria(quien, que, detalle) values (auth.uid(), 'ficha de la tienda',
      jsonb_build_object('cambios', claves, 'pagos_antes', public.aramo_pagos_de(antes), 'pagos_despues', public.aramo_pagos_de(NEW.data)));
  end if;
  return NEW;
end $$;
revoke all on function public.aramo_proteger_tienda() from public, anon, authenticated;
drop trigger if exists aramo_proteger_tienda on public.encargos;
create trigger aramo_proteger_tienda before insert or update on public.encargos
  for each row execute function public.aramo_proteger_tienda();
-- Si la ficha ya tenía claves guardadas, se quitan ahora.
update public.encargos set data = data - 'acceso' where id = '__tienda__' and data ? 'acceso';

-- ── Registro de visitas: tope de tamaño y de cantidad ──
create index if not exists aramo_eventos_anon_idx on public.aramo_eventos(anon_id, created_at desc);
create or replace function public.aramo_limitar_evento() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  NEW.tipo := left(regexp_replace(coalesce(NEW.tipo, ''), '[^a-zA-Z0-9_.-]', '', 'g'), 40);
  if NEW.tipo = '' then return null; end if;
  if octet_length(coalesce(NEW.data, '{}'::jsonb)::text) > 2048 then NEW.data := '{}'::jsonb; end if;
  select count(*) into n from public.aramo_eventos
    where anon_id is not distinct from NEW.anon_id and created_at > now() - interval '1 hour';
  if n >= 300 then return null; end if;
  select count(*) into n from public.aramo_eventos where created_at > now() - interval '1 minute';
  if n >= 3000 then return null; end if;
  return NEW;
end $$;
revoke all on function public.aramo_limitar_evento() from public, anon, authenticated;
drop trigger if exists aramo_limitar_evento on public.aramo_eventos;
create trigger aramo_limitar_evento before insert on public.aramo_eventos
  for each row execute function public.aramo_limitar_evento();

-- ── Comprobantes y fotos: tipo y tamaño; cada cliente puede borrar los suyos ──
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
  where id = 'aramo-comprobantes';
update storage.buckets set file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'aramo-productos';
drop policy if exists "comprobantes borrar propios" on storage.objects;
create policy "comprobantes borrar propios" on storage.objects for delete to authenticated
  using (bucket_id = 'aramo-comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Borrar datos personales de pedidos (cuenta borrada o pedidos viejos) ──
create or replace function public.aramo_sin_datos(d jsonb) returns jsonb
language sql immutable as $$
  select (((d - 'comprobante' - 'nota' - 'rating') #- '{retiro,envio,lat}' #- '{retiro,envio,lng}' #- '{retiro,envio,senas}' #- '{retiro,placa}')
    || jsonb_build_object('cliente', jsonb_build_object('nombre', 'Cliente', 'tel', ''), 'datosBorrados', now()))
$$;

-- "Borrar mi cuenta y mis datos" (derecho de supresión, Ley 8968). Los montos y productos de los
-- pedidos quedan sin nombre para la contabilidad de la tienda.
create or replace function public.aramo_borrar_mis_datos() returns integer
language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid(); n int;
begin
  if yo is null then raise exception 'Se requiere iniciar sesión'; end if;
  if public.aramo_es_personal() then raise exception 'Una cuenta del personal se borra desde Supabase.'; end if;
  perform set_config('aramo.sistema', '1', true);
  update public.encargos set data = public.aramo_sin_datos(data), owner_id = null, owner_phone = null, updated_at = now()
    where owner_id = yo and id <> '__tienda__';
  get diagnostics n = row_count;
  delete from public.aramo_direcciones where user_id = yo;
  delete from public.aramo_suscripciones where user_id = yo;
  delete from public.aramo_push_subscriptions where user_id = yo;
  update public.aramo_eventos set user_id = null where user_id = yo;
  delete from auth.users where id = yo;
  return n;
end $$;
revoke all on function public.aramo_borrar_mis_datos() from public, anon;
grant execute on function public.aramo_borrar_mis_datos() to authenticated;

-- Pedidos de hace más de 18 meses: quedan sin nombre, teléfono, ubicación ni notas.
create or replace function public.aramo_limpiar_viejos() returns integer
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform set_config('aramo.sistema', '1', true);
  update public.encargos set data = public.aramo_sin_datos(data), owner_phone = null, updated_at = now()
    where id <> '__tienda__' and coalesce(kind, 'order') = 'order' and created_at < now() - interval '18 months' and not (data ? 'datosBorrados');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.aramo_limpiar_viejos() from public, anon, authenticated;
do $$ begin
  if to_regnamespace('cron') is not null then
    execute $cron$select cron.schedule('aramo-limpiar-viejos', '15 3 * * *', 'select public.aramo_limpiar_viejos()')$cron$;
  end if;
exception when others then null;
end $$;

-- Hora de la nube, para que el Taller corrija un reloj de teléfono atrasado o adelantado.
create or replace function public.aramo_ahora() returns timestamptz
language sql stable as $$ select now() $$;
grant execute on function public.aramo_ahora() to anon, authenticated;

notify pgrst, 'reload schema';
