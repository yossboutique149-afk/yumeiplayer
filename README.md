# YUMEIKA — THE MUSIC UNIVERSE

Official music universe of **Yumei (ka)Waii**: catálogo oficial de Spotify y YouTube,
archivo de letras con traducción/romanización/análisis, perfiles oficiales y un panel
de administración privado.

## Stack

- **Cliente:** React 18 + Vite 6 (`src/main.jsx`, `src/style.css`)
- **Servidor:** Express (`server.js`) que sirve la API y el build de `dist/`
- **Datos:** archivos JSON en `data/` (`catalog.json`, `lyrics.json`)

## Instalación

```bash
npm install
cp .env.example .env    # completa las credenciales
```

Variables de entorno (`.env` local o *Settings → Environment variables* en AppJet):

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto del servidor (por defecto `3001`). |
| `ADMIN_PASSWORD` | Obligatoria para abrir el panel de administración. Sin ella el panel responde 503. |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Sincronización del catálogo de Spotify. |
| `SPOTIFY_ARTIST_ID` | Por defecto `4rvqZA6szL4nbRkoN7soB1`. |
| `YOUTUBE_API_KEY` | Sincronización de vídeos del canal. |
| `YOUTUBE_CHANNEL_ID` | Por defecto `UCx9lIvfBGqQOjy--SpFHnsA`. |
| `DATA_DIR` | Opcional: carpeta de los JSON (por defecto `./data`). |

`.env` está en `.gitignore`: nunca se publica.

## Ejecución

```bash
npm run dev     # API en :3001 + Vite en http://localhost:5173
npm run build   # genera dist/
npm start       # servidor de producción en http://localhost:3001
```

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Estado del servicio. |
| `GET` | `/api/config` | Qué integraciones están configuradas. |
| `GET` | `/api/catalog` | Álbumes de Spotify y vídeos de YouTube guardados. |
| `GET` | `/api/lyrics` | Letras guardadas. |
| `POST` | `/api/auth` | Valida la contraseña de administración. |
| `POST` | `/api/sync` | Sincroniza el catálogo oficial (admin). |
| `POST` | `/api/lyrics` | Crea o actualiza una letra (admin). |
| `DELETE` | `/api/lyrics/:id` | Elimina una letra (admin). |

Las rutas de administración requieren la cabecera `x-admin-password`.

## Perfiles oficiales

- Spotify: <https://open.spotify.com/artist/4rvqZA6szL4nbRkoN7soB1>
- YouTube: <https://youtube.com/channel/UCx9lIvfBGqQOjy--SpFHnsA>

El reproductor usa los reproductores oficiales embebidos de Spotify y YouTube: no
descarga ni simula audio.

## Notas de seguridad y despliegue

- La autenticación del panel es una contraseña compartida con límite de intentos
  (10 cada 10 minutos) y comparación en tiempo constante. Es adecuada para uso
  personal; para un panel multiusuario conviene sustituirla por OAuth.
- El plan gratuito de hosting no incluye disco persistente: los JSON viven en el
  sistema de archivos del contenedor y se reinician al redesplegar. Para conservar
  catálogo y letras de forma permanente usa `DATA_DIR` sobre un volumen persistente
  (Starter o Pro) o una base de datos.
