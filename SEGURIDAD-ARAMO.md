# Puesta en marcha segura de ARAMO

1. En Supabase dejá **Phone** desactivado. La app usa **Authentication → Providers → Email** con correo y contraseña, sin proveedor SMS.
2. Pegá y ejecutá [supabase-encargos.sql](./supabase-encargos.sql) completo en **SQL Editor**. Después, en otra consulta, pegá y ejecutá [supabase-taller-validaciones.sql](./supabase-taller-validaciones.sql). Ese archivo revisa cada pedido nuevo en la nube:
   - precio de la tienda y no el del teléfono;
   - máximo 5 pedidos cada 10 minutos por cuenta;
   - número de pedido sin repetir;
   - hora de retiro dudosa marcada para revisar;
   - hora de la nube para corregir relojes corridos.
3. Abrí `APP.html`, entrá a **Mostrador → Más → Cuenta de personal**, creá o iniciá la cuenta con correo y copiá el UUID que aparece.
4. En SQL Editor agregá cada persona autorizada:

```sql
insert into public.aramo_staff(user_id, sucursal)
values ('UUID-DEL-USUARIO', 'todas'); -- o moravia / angeles
```

5. Ya con la sesión del personal, abrí **Mostrador → Precios** y guardá una vez, así la nube recibe la lista completa de precios de cada local. Hacé lo mismo cada vez que cambien los precios base del código.
6. Recargá Mostrador. Desde ese momento, clientes autenticados solo leen sus propios pedidos; el personal autorizado es quien puede leer pedidos, cambiar estados y editar la ficha de la tienda.

El SQL también crea las direcciones, comprobantes de SINPE, métricas, suscripciones semanales, políticas de Storage y la función de pedidos semanales. El envío de notificaciones con la app cerrada necesita configurar una clave pública VAPID y un proceso que envíe push a `aramo_push_subscriptions`; el service worker ya recibe esos avisos.

Revisá los textos de `privacidad.html` y `condiciones.html` con la persona responsable de la tienda antes de publicarlos: contienen un punto pendiente para razón social y contacto formal.
