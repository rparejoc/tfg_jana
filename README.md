# Family Trip

Proyecto base en **Vue 3 + Vite**.

## Requisitos

- Node.js 18+
- npm 9+

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Variables de entorno

La aplicación mantiene Firebase para autenticación y Firestore, y usa Supabase Storage mediante `@supabase/supabase-js` para las fotos de los viajes:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_SUPABASE_PHOTOS_BUCKET=trip-photos
```

El bucket configurado en `VITE_SUPABASE_PHOTOS_BUCKET` debe permitir las operaciones de subida y borrado que realiza el cliente, y debe ser público para que las URLs guardadas en Firestore se puedan mostrar directamente en la galería.

### Políticas de Supabase Storage para subidas desde el cliente

Las fotos se suben directamente desde el navegador con la clave anónima de Supabase usando el cliente oficial `@supabase/supabase-js`. Si el bucket tiene RLS activo y no existe una política de inserción para el rol `anon`, Supabase responderá con `400 Bad Request` al `POST /storage/v1/object/...` aunque el bucket sea público. Para este proyecto, añade políticas equivalentes a las siguientes en Supabase SQL Editor si quieres permitir que el cliente suba y elimine fotos en `trip-photos`:

```sql
create policy "Allow client photo uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'trip-photos');

create policy "Allow client photo deletes"
on storage.objects
for delete
to anon
using (bucket_id = 'trip-photos');
```

Si cambias `VITE_SUPABASE_PHOTOS_BUCKET`, cambia también el valor de `bucket_id` en las políticas.

