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

La aplicación mantiene Firebase para autenticación y Firestore, y usa Supabase Storage para las fotos de los viajes:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_SUPABASE_PHOTOS_BUCKET=trip-photos
```

El bucket configurado en `VITE_SUPABASE_PHOTOS_BUCKET` debe permitir las operaciones de subida y borrado que realiza el cliente, y debe ser público para que las URLs guardadas en Firestore se puedan mostrar directamente en la galería.
