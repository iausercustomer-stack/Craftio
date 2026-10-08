# Kala Nidhi — React + Supabase

A simple artisan studio for SIH26090. The interface uses warm craft-inspired colors, readable text, and three views: Overview, My catalog, and Add a product.

## 1. Preview immediately (no Supabase needed)

Install Node.js LTS. Extract the ZIP to its own folder, then open **that folder** in VS Code. `package.json` and `vite.config.js` should be directly inside it.

Open **Terminal → New Terminal** and run:

```powershell
npm ci
npm run dev
```

Open the exact local URL printed in the terminal, usually `http://localhost:5173`. Keep the terminal running. Do not double-click `index.html`; the React source needs the Vite server.

Without real Supabase credentials, the app is visibly marked **Demo mode — saved on this browser**. It loads three fictional sample listings. You can add photos, Hindi and English stories, search, and remove products. Changes remain after refreshing the same browser. Clearing browser storage removes these demo changes.

## 2. Connect your own Supabase project

1. Open your Supabase project.
2. Open **SQL Editor**, paste all of `supabase-schema.sql`, and click **Run**. This creates profiles, products, a product-images bucket, and ownership policies. If you have the original Kala Nidhi schema, it also adds `hindi_description` and `image_path`. Read the comments before running it in a shared existing project: it replaces the original public-read profile/product policies with owner-only access.
3. In **Storage**, confirm the `product-images` bucket is public. Product photos are public by URL; profile and product rows are available to the signed-in owner.
4. Find the Project URL and **anon/public** key (or publishable key) in your Supabase project settings.
5. In your VS Code terminal run:

```powershell
Copy-Item .env.example .env.local
```

6. Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Use only a public browser key. Never put a service-role or secret server key here. Frontend environment variables are visible in the built website.

7. Stop the development server with **Ctrl+C**, then restart it:

```powershell
npm run dev
```

8. Click **Sign in / Sign up**, then **Create an account**. Enter your name, craft, village/town, email, and password. If email confirmation is enabled, confirm the email before signing in.

The cloud version uses Supabase Auth, profiles, product records, and Storage. Products are saved only after you sign in. It never silently saves cloud listings as local demo data. Demo listings are separate from the cloud account.

If email confirmation sends you to the wrong place, set the development Site URL and permitted redirect URL in Supabase Auth settings to the actual Vite local URL.

## 3. Features

- Dashboard shows the artisan's name, product count, average price, recent products, and a photography tip.
- Catalog searches names, craft categories, English descriptions, and Hindi text.
- Add-product form shows a live preview, a photo brightness slider, and separate English/Hindi descriptions.
- JPG/PNG/WebP photos up to 8 MB are resized to at most 1200px and saved as adjusted JPEGs. In demo mode the saved photo is a persistent data URL, not a temporary browser object URL.
- Pricing: cost = materials + hours × hourly rate + packing. The suggested range is cost plus 20–50%. The artisan can enter a different final price; that chosen value is saved.
- Hindi dictation uses browser speech recognition when available. It requests microphone permission and puts recognized text in the editable Hindi field. Support depends on the browser and recognition service; it can require internet access. Typed Hindi always works.
- Removing a listing asks for confirmation. Cloud removal also attempts to remove its stored photo.
- Error and loading states are visible. Incorrect Supabase configuration cannot leave a blank screen.

## 4. What is basic/prototype functionality?

This is a mini project, not an AI marketplace service. Brightness adjustment is ordinary browser image processing. Voice transcription depends on the browser's speech recognition service. There is no automatic translation, background segmentation, live marketplace comparison, or guaranteed price appraisal. Marketplace exporting is outside this brief. Demo mode uses this browser only, not Supabase.

## 5. Beginner-friendly files

| File | Purpose |
| --- | --- |
| `src/App.jsx` | Views, product form, authentication, Supabase actions |
| `src/helpers.js` | Demo records, photo processing, storage and price helpers |
| `src/style.css` | Responsive styling |
| `src/supabase.js` | Public Supabase client configuration |
| `src/main.jsx` | React entry point and visible error fallback |
| `vite.config.js` | React plugin; enables the correct JSX runtime |
| `supabase-schema.sql` | Database setup and row-level security |
| `.env.example` | Environment variable names |

React components are kept in one main file to make this mini project easy to follow. There is no custom backend or routing framework.

## 6. Build for production

```powershell
npm run build
npm run preview
```

Open the preview URL printed in the terminal. `dist/` contains the production build. Use an HTTP server to preview it; do not double-click its `index.html`.

## Photo credits

The demo product photos are local copies of Unsplash photos by photo ID: `1590874103328-eac38a683ce7`, `1578500494198-246f612d3b3d`, and `1603006905003-be475563bc59`. Demo listing names and stories are fictional sample content. The Kala Nidhi brand image comes from the supplied original project.

## Verification of this delivery

- Production build: passed.
- Development and production pages: both rendered without browser runtime errors.
- Demo creation: passed with a photo upload, 120% brightness, English and Hindi text, a calculated range, and a manually chosen final price.
- Reload: saved photo, title, final price, and Hindi text survived.
- Catalog search, removal cancellation/confirmation, and empty result state: passed.
- Phone viewport (390 × 844): checked overview and product form; no horizontal overflow, and navigation targets were at least 44px high.
- Supabase sign-in/database/storage were implemented but not tested against a live project because no project credentials were configured. Real microphone transcription was not tested.

English and Hindi fonts and demo photos are included locally, so these assets do not need external requests during preview. Open font licenses are included under `public/fonts/`.
