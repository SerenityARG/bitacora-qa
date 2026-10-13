# Bitácora QA · versión web

La misma Bitácora QA, pero como página propia en internet. La página se publica gratis en **GitHub Pages** y los datos (revisiones, capturas y stickers propios) se guardan en **Supabase**, con tu propio usuario y contraseña.

> Antes de empezar: tu información de trabajo va a quedar guardada en Supabase, un servicio externo. Confirma con tu líder o con el área de sistemas que está permitido.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La bitácora |
| `shim.js` | Conecta la bitácora con Supabase (no hace falta tocarlo) |
| `config.js` | Aquí pegas los datos de tu proyecto de Supabase |
| `supabase.sql` | Crea las tablas, el espacio para imágenes y las reglas de seguridad |

---

## Parte 1 · Crear la base de datos en Supabase

1. Entra a **supabase.com** y crea una cuenta (puedes usar tu cuenta de GitHub).
2. Da clic en **New project**.
   - **Name:** `bitacora-qa`
   - **Database Password:** inventa una y guárdala en un lugar seguro.
   - **Region:** la más cercana (por ejemplo *West US*).
   - Espera uno o dos minutos a que termine de crearse.
3. En el menú de la izquierda abre **SQL Editor** → **New query**.
4. Abre el archivo `supabase.sql` con el Bloc de notas, copia **todo**, pégalo y da clic en **Run**. Debe decir *Success*.
5. Ve a **Project Settings** (el engrane) → **API** y copia dos datos:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public** key (un texto largo que empieza con `eyJ…`)
6. Abre `config.js` con el Bloc de notas y reemplaza los dos valores:

   ```js
   window.BITACORA_CONFIG = {
     SUPABASE_URL: "https://abcd1234.supabase.co",
     SUPABASE_ANON_KEY: "eyJ…"
   };
   ```

   Guarda el archivo.

> La *anon key* puede estar visible en la página: así está diseñada. Lo que protege tus datos son las reglas de `supabase.sql`, que hacen que cada usuario solo vea lo suyo. **Nunca** pegues ahí la *service_role key*.

## Parte 2 · Publicar la página con GitHub Desktop

1. Abre **GitHub Desktop** → **File** → **New repository…**
   - **Name:** `bitacora-qa`
   - **Local path:** donde quieras guardarlo (por ejemplo `Documentos\GitHub`)
   - Da clic en **Create repository**.
2. En GitHub Desktop da clic en **Show in Explorer**. Se abre la carpeta del repositorio.
3. Copia ahí los 4 archivos: `index.html`, `shim.js`, `config.js` y `supabase.sql` (este `LEEME.md` también, si quieres).
4. Regresa a GitHub Desktop. Vas a ver los archivos en la lista de cambios.
   - Abajo a la izquierda, en **Summary**, escribe: `Bitácora QA`
   - Da clic en **Commit to main**.
5. Da clic en **Publish repository**.
   - **Desmarca** "Keep this code private". GitHub Pages gratis solo funciona con repositorios públicos. El código queda visible, pero tus revisiones no, porque viven en Supabase protegidas por tu contraseña.
   - Da clic en **Publish repository**.
6. Da clic en **View on GitHub** (se abre el navegador).
7. En GitHub: **Settings** → **Pages** (menú izquierdo).
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` y carpeta `/ (root)` → **Save**
8. Espera uno o dos minutos y recarga. Arriba aparece la dirección de tu página, algo como:
   `https://TU-USUARIO.github.io/bitacora-qa/`

## Parte 3 · Conectar la dirección con Supabase y crear tu usuario

1. En Supabase: **Authentication** → **URL Configuration**.
   - **Site URL:** pega la dirección de tu página de GitHub Pages → **Save**.
2. Abre tu página, escribe tu correo y una contraseña (mínimo 8 caracteres) y da clic en **Crear mi cuenta**.
3. Te llega un correo de Supabase: da clic en el enlace para confirmar.
4. Regresa a la página y da clic en **Entrar**.
5. **Importante:** para que nadie más pueda crear cuentas en tu bitácora, en Supabase ve a **Authentication** → **Sign In / Providers** (en algunas versiones está en **Settings**) y desactiva **Allow new users to sign up**.

¡Listo! Ya puedes abrir la bitácora desde cualquier computadora o desde tu celular.

---

## Cómo actualizar la página después

Si te paso una versión nueva de `index.html`:

1. Reemplaza el archivo en la carpeta del repositorio.
2. En GitHub Desktop escribe un resumen (por ejemplo `Nuevos stickers`) → **Commit to main** → **Push origin**.
3. En uno o dos minutos la página ya está actualizada. Tus datos no se tocan.

## Si algo no funciona

| Lo que ves | Qué revisar |
|---|---|
| La página se queda en blanco | Que `config.js` tenga tu URL y tu anon key entre comillas |
| "Correo o contraseña incorrectos" | Que hayas confirmado tu cuenta con el enlace del correo |
| El enlace del correo abre una página que no existe | El **Site URL** de la Parte 3 |
| "No se pudo guardar" | Que hayas corrido `supabase.sql` completo y diga *Success* |
| No se suben las imágenes | Que exista el bucket **evidencias** en **Storage** (lo crea `supabase.sql`) |

## Límites del plan gratis de Supabase

- 500 MB de base de datos y 1 GB para imágenes. Para una bitácora personal alcanza para años.
- Si pasas una semana sin abrir la bitácora, Supabase "pausa" el proyecto. Tus datos no se borran: entra a supabase.com y da clic en **Restore project**.
