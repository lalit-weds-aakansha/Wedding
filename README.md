# Wedding Invitation Website (Marathi / Hindi / English)

A mobile-first wedding invitation built with React, TypeScript, Vite, Tailwind CSS v4 and Framer Motion.
It opens on a **Save-the-Date scratch card**, then continues to the full invitation (sunset hero, family, events, venue, RSVP, thank-you).

All sample content (Lalit & Aakansha, Trombay venues) lives in **one file**: [`src/config/wedding.ts`](src/config/wedding.ts).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then builds to dist/
npm run preview    # serves the production build locally
```

## Opening story (cinematic, scene by scene)

The site opens with a painted storybook sequence (about 56 s, on every visit, with no skip button; it ends on the "Explore Our Invitation" screen, where a **Replay animation** button plays it again). All artwork is layered SVG, and **all text and photos come from your content**: names, parents, date, venue, events and dress codes from `src/config/wedding.ts`, couple photos from `public/images/couple/`.

1. **Mountain road** (0-11 s): sky, clouds, mountains and hills appear, birds cross, the road draws itself, the invitation card floats in with the monogram, wax seal, names, date and venue, and the flower-decorated car drives the whole road to its end, shrinking until it is gone, with a synthesised engine sound that fades into the distance (browsers need a tap first, so a "Tap for sound" hint shows while the car drives; the code is `src/lib/carSound.ts`). The camera then magnifies into the card, which becomes the formal invitation.
2. **Formal invitation card**: laid out like the template: a tall paper card with postage-stamp perforations over the mountain scene, a gold Ganesha line icon with your blessing line, a tree stamp with a gold seal, and the names in script with the families under them. All wording is yours.
3. **Storybook garden**: a big old tree with the four event pictures hanging from it in gold frames, fairy lights and a stone path. The camera glides to one hanging photo and zooms in; that photo grows into the next scene.
4. **Mehendi** (blush room) -> **Sangeet** (night stage) -> **Haldi** (yellow carnival) -> **Wedding** (flowered mandap), each with an oval event card (title, date, time, venue, dress code) and the scene artwork. A garden scene links each pair.
5. The Wedding scene carries its own oval card; a few seconds later the story hands over by itself to the page's first screen with the "Explore Our Invitation" button (the hero shows the finished mountain scene; it does not replay). "Find your photos" and the gift QR live further down the invitation (`gift.enabled` and `photos.showLink` in the config).

**Scene artwork.** `opening.sceneArt` in the config picks it: `"frames"` (default) uses the picture files in `public/images/story/`: `mehendi`, `sangeet`, `haldi` and `wedding` (one full-screen scene each, in the story) plus `prewedding` (hangs in the tree as an extra frame). They are 1024 x 1536 portraits supplied by you; replace a file with another picture of the same name to change it. `"painted"` uses the built-in painted scenes.
**Timing.** Each event scene stays about 8 s (card readable for roughly 5 s), the formal card about 7 s; the closing card stays until the guest taps. The closing card also has **Find your photos** (opens `/photos`) and **Wedding Gift** (the UPI QR, payee and "Pay with UPI app" in a sheet).

**Music.** `public/music/wedding_invitation_reference_audio.mp3` starts by itself, fading in, the moment the car engine sound has faded out (about 9 seconds in), and plays on through the whole site; it never restarts while guests scroll or switch sections. A **Music On / Off** button sits at the top right (it also mutes the car engine); set `music.showControl: false` in the config to hide it. Where a browser blocks sound until a first touch, the song starts on the visitor's first tap or key press instead, but never before the engine has finished. The car's engine sound plays in the first scene.
**Motion and sound.** The story always plays its animation, even if the visitor's device has "reduce motion" on (set `opening.respectReducedMotion: true` in the config to honour that setting instead: visitors then get still scenes with soft fades, and accessibility guidance recommends this). There is no "play animation" button. The car's engine sound tries to start by itself; browsers block page sound until the first tap or key press, so where that applies it starts on the visitor's first touch (there is no hint button).
When `respectReducedMotion` is true, reduced motion shows each scene still with soft fades (about 7 s each). A direct link to a section also skips it.
Files: `src/components/story/` (timeline, scenes, cards), `src/components/scene/` (mountain scene artwork), `src/components/ScenicHero.tsx`, `src/components/CountdownSection.tsx`. In development, `/?scenePreview=garden|blush|night|carnival|mandap` shows one scene and `/?storyAt=17` freezes the story at a moment.

## Languages

A toggle at the top left switches **English (default) / हिन्दी / मराठी**. The choice is remembered on that device.
You can share a link in a specific language: `https://your-site/?lang=mr` or `?lang=hi`.

* English text and all data: `src/config/wedding.ts`
* Hindi and Marathi text (names, parents, events, venues, buttons, form): `src/config/translations.ts`
  (if you change a name or venue in `wedding.ts`, update the matching Hindi/Marathi lines too)

## Save-the-Date scratch card

Settings (`saveTheDate` in `wedding.ts`):

| Setting | Meaning |
|---|---|
| `enabled` | `false` skips the card and opens straight on the invitation |
| `photo` | **Your couple photo.** Default is a *placeholder illustration*. Put your file in `public/images/save-the-date/` and set the path |
| `photoPosition` | CSS crop position, e.g. `"50% 30%"` keeps faces higher |
| `scratchThreshold` | How much must be scratched (0.2 – 0.9) before the rest dissolves automatically |
| `envelope.enabled` | Adds an envelope that opens before the card appears |

How it behaves: a real `<canvas>` scratch layer (mouse, touch and pen via pointer events; the page does not scroll while scratching).
Past the threshold the rest fades away and the canvas is removed, so the photo can't be covered again. **Reveal all** and
**Skip to the invitation** are keyboard-accessible alternatives. Reduced-motion users get no fades or sparkles.
The first touch also starts the music (browsers only allow audio after a tap).

## Customise

* Names, dates, family, events, venues, wording, theme colours: `src/config/wedding.ts`
* Photos: put files in `public/images/` and reference them as `"/images/name.jpg"`.
  The hero, couple illustration, event icons and venue photo in `public/images/sunset/` are **sample pictures**: replace them.
  The venue photo is of a different place, so replace it with your real venue.
* Music: put an MP3 at `public/music/mangalyam.mp3` (or change `music.src`). A missing file hides the music button.
  Use only music you have the right to use.
* Sections: Our Story and Photo Gallery exist but are switched off (`story.enabled`, `gallery.enabled`).

## RSVP backend (needed to actually store responses)

With no endpoint configured the RSVP form runs in **demo mode** and tells the guest the response was **not saved**.
To store responses set an endpoint that accepts a JSON `POST`:

```bash
# .env.local (or your host's environment settings)
VITE_RSVP_ENDPOINT=https://script.google.com/macros/s/XXXX/exec
VITE_SITE_URL=https://your-wedding.vercel.app
```

The integration point is `src/lib/rsvp.ts`. Payload: `{ name, phone | email, attending, guests, events[], dietary, message, submittedAt }`.
A Google Apps Script that appends rows to a Sheet works well (deploy as a Web app, access "Anyone"). Never put secret keys in `VITE_*` variables: they are public.

## Share and deploy

Share buttons use the Web Share API where available, plus WhatsApp and copy-link. `localhost` links only work on your own computer.
To share with guests, deploy to a public HTTPS address (Vercel / Netlify / Cloudflare Pages: build `npm run build`, output `dist`) and set `VITE_SITE_URL`
so the WhatsApp preview image URL is absolute.

## Find your photos (guests get only the photos they appear in)

Guests scan a QR code, register with a selfie, and open a private link that shows **only wedding photos in which a face matched theirs**.
Zero matches means zero photos; errors show an error, never the album.

**How it works**

1. **Photos in.** From a Google Drive folder (section below) or uploaded by hand in `/admin`. A background indexer on the server finds every face in each photo, once, and stores the 128-number face templates with the photo's status and model version.
2. **Selfie.** The guest's phone downscales the selfie and sends it once to `/api/selfie`. The server finds the face with **the same model and preprocessing as the photos**, keeps only the template (for 15 minutes, in memory) and throws the image away. No face, several faces, or a too-small face is refused with a clear message.
3. **Matching** happens on the server, before anything is sent to a browser: a photo qualifies if at least one of its faces is within the distance limit of the guest's template. Each face in a group photo is compared independently.
4. **Gallery.** `GET /api/me/photos` is the only data source for the gallery and returns just the qualifying photos (ranked by strength). Photos that are pending or failed are never matched or shown; the guest only sees a note that N photos are still processing.

Files: `server/index.js` (API, matching), `server/faces.js` (face model), `server/indexer.js` (background indexing), `server/drive.js` (Google Drive), `src/photos/` (guest page `/photos`, results `/photos/me`, admin `/admin`).

**Run it locally**

```bash
npm install
npm run setup:models                       # only if server/models is missing: copies the face model files
npm run dev                                # the website, http://localhost:5173
ADMIN_PASSWORD="choose-a-strong-one" npm run server    # photo server, port 8787 (PowerShell: $env:ADMIN_PASSWORD="..."; npm run server)
```

Open `/admin`, log in, upload photos or connect Drive. Open `/photos` on a phone-sized window to register as a guest.

**Deploy.** This needs a Node host (Railway, Render, Fly.io, a VPS), not a static host. `npm run build`, then `node server/index.js` with the variables below; it serves the website and the API together.
Photos and the database live in `server/data/`: attach persistent storage there (or set `DATA_DIR`). The face model runs on CPU (TensorFlow.js WASM): about 0.3 to 1.5 s per photo, 512 MB RAM is enough. The server does the face work, so guests' phones download no model.

| Variable | Meaning | Default |
|---|---|---|
| `ADMIN_PASSWORD` | Required. Password for `/admin` (admin is disabled without it) | none |
| `MATCH_THRESHOLD` | Distance limit; lower is stricter. See Calibration before changing | `0.44` |
| `RETENTION_DAYS` | Guest face templates and links are deleted after this many days | `90` |
| `PORT`, `DATA_DIR` | Port and storage folder | `8787`, `server/data` |
| `QUIET=1` | Silence the diagnostic log lines | off |

### Calibration (why 0.44)

The model gives a distance between two faces: smaller means more similar. The limit was chosen by measurement with this exact model, not guessed. `node scripts/calibrate.mjs` reproduces it on labelled faces (identities were clustered with the model and then **verified by eye**; `tests/fixtures/identities.json`):

| Distance limit | Wrong-person pairs accepted | Same-person pairs found |
|---|---|---|
| 0.40 | 0 / 930 | 61% |
| **0.44 (default)** | **0 / 930** | **74%** |
| 0.48 | 0 / 930 | 84% |
| 0.50 | 2 / 930 | 89% |
| 0.55 | 32 / 930 | 97% |

Different people were never closer than about 0.46 to 0.49, so 0.44 keeps a safety margin: precision first, at the cost of missing some photos (extreme expressions and angles, small faces). On a real album a guest usually appears in many photos, so per-photo recall is higher than per-pair: in a browser test with a real bride selfie, 22 of her 25 photos were returned and **0** photos of anyone else.
The numbers come from one wedding (5 identities, 41 labelled faces). Treat 0.44 as a calibrated starting point and re-run `scripts/calibrate.mjs` on your own album if you can label a few people. The admin slider only allows 0.36 to 0.52 and warns above 0.46.

### Diagnostics

* `/admin` → Google Drive → **Diagnostics**: Drive images discovered, indexed, failed (with the exact reason), faces per photo, model version.
* `/admin` → Guests → **Why?**: every candidate photo for a guest with its distance and the decision (match or rejected). Face data itself is never shown.
* Server log lines (no names, no face data): `[selfie] faceDetected=…`, `[index] photo=… status=indexed faces=…`, `[match] guest=… threshold=… passed=… best=…`, `[drive] discovered=… new=… changed=…`.

### Tests

`npm test` starts the real server with a fake Google Drive and the real face model, and checks: Person A's selfie returns only photos of A (including an A+B group photo, excluding B-only and stranger photos); an unrelated selfie returns zero; a selfie with no face is refused; an inaccessible Drive folder gives an actionable error; pending, failed and download-restricted photos are never returned; one guest cannot see another's photos by changing a token or id; old-pipeline guests are not matched; diagnostics hide secrets. The private sample photos are not in the repo: put them in `./_test-photos` (or set `TEST_PHOTOS_DIR`). Without them the tests skip and say so.

**Getting the best matches**
* Works best with clear, front-facing faces. Blur, profile views, sunglasses and faces under 60 px in the photo are weaker or skipped. Guests can add up to 3 selfies (different angles) when registering.
* A selfie should be a close-up of just the guest. A screenshot, a group photo or a tiny face is refused.
* In the Photos tab you can open a photo, remove a wrong match or add a guest by hand. Removed matches stay removed.
* Review matches before sending links: face matching can be wrong, and a wrong match shows a guest someone else's photo.

**Sending photos to guests.** The Guests tab has a WhatsApp button per guest that opens a chat with their link already written (you press send). Automatic sending would need a WhatsApp Business or SMS account, which this project does not include.

**Privacy and consent (important).** Face data is biometric:
* Guests tick a consent box that explains what happens. The selfie is sent once over HTTPS to be analysed **in memory and discarded**; only the numeric template, name and phone are stored, for `RETENTION_DAYS`. Nothing is written to disk from the selfie.
* A guest can delete their data at any time from their photos page; you can delete guests and photos in `/admin` and clear everything (type DELETE).
* Result links contain a private 192-bit token. Anyone with a link sees that guest's photos, so guests should not share it. Photo responses are `private, no-store`, and no endpoint accepts a guest id, name or phone number in place of the token.
* Guests who registered with the earlier browser-side version are never matched; they see a message asking them to register again.
* Check your local rules (for example India's DPDP Act, EU GDPR) and tell your guests. Use HTTPS in production. Keep `RETENTION_DAYS` in `src/photos/GuestApp.tsx` in step with the server setting.

## Google Drive as the photo source

The server can read the photographer's Google Drive folder (including nested sub-folders), queue every new or changed image, and match guests against it. The photos stay in Drive: guests see them streamed through this server, and only a guest's own matches are ever served. Nothing is copied to this server.

**How it behaves**

1. **Refresh** lists the folder with the Drive API (pagination, nested folders, JPEG/PNG/WebP only) and remembers each image's checksum. New image: queued. Changed image: queued again and its old matches dropped. Removed image: forgotten. Unchanged: skipped, so nothing is re-processed for each guest or each refresh.
2. The **background indexer** downloads each queued image with the authenticated API (by file ID, never by a public URL), finds its faces and stores them. It works on the server, so you can close the admin page. Temporary Drive problems are retried automatically with a delay (3 attempts); permanent ones (not found, no permission, download disabled, not an image) are marked **failed** with the exact reason, and "Retry failed" requeues them. "No faces" is a valid result, separate from a failure.
3. An optional `DRIVE_SYNC_MINUTES` refreshes the folder on a timer.

**What you must set up (a share link alone is not enough for the API)**

1. In Google Cloud Console create a project and enable the **Google Drive API** (free).
2. Create a **service account** (IAM → Service accounts) and add a **JSON key**. Treat the key like a password.
3. In Drive, share the photographer's folder with the service account's e-mail address (`name@project.iam.gserviceaccount.com`) as **Viewer**. Also ask the owner to leave "Viewers can download" on, or those files fail with a clear message.
4. Give the server the key and start it:

```
GOOGLE_SERVICE_ACCOUNT_FILE=/secure/path/key.json     # or GOOGLE_SERVICE_ACCOUNT_JSON='{...}'
ADMIN_PASSWORD=choose-a-strong-one
DRIVE_SYNC_MINUTES=10        # optional
DRIVE_FOLDER_ID=...          # optional: or set the folder in /admin
npm run server
```

5. `/admin` → Google Drive: paste the folder link, **Save & verify**, then **Refresh from Drive**. Watch the progress bar.

The key stays on the server (never sent to a browser, never logged) and gets read-only access (`drive.readonly`) to what you shared with it. Errors are shown as actionable text ("not found or not shared with the service account", "share the folder with its e-mail address", "downloading is disabled for this file", "Google busy, will retry").

**Costs.** The Drive API and service accounts are free within Google's default quotas. You pay only for the Node host. The face model runs on that host's CPU, so there is no per-image cloud-vision fee.

**Not verified against real Google.** All Drive behaviour above was tested against a fake Drive that mimics the v3 API (signature check, pagination, nested folders, 403/404, restricted downloads), not against Google itself. Try your real folder once before the event. Shortcuts to folders and Google-native files (Docs, Photos albums) are ignored.

**Try the Drive screens without credentials.** `node scripts/mock-drive.mjs <folder-with-jpgs>` starts the fake Drive and prints the environment variables to point the server at it.

**Limits.** Matching is probabilistic: look-alikes can match and people can be missed. "Match %" is a ranking score, not a probability. Statues and posters with faces can be indexed as faces (they do not match real people at the default limit). Folders over `DRIVE_MAX_FILES` (20,000) are cut off. The first request after a server restart loads the face model (a few seconds).

## Structure

```
src/config/wedding.ts        all content and settings
src/config/translations.ts   Hindi / Marathi text
src/lib/i18n.tsx             language provider (toggle, ?lang=, remembers choice)
src/components/
  SaveTheDate.tsx  ScratchCard.tsx  cardArt.ts  LaceFrame.tsx  Envelope.tsx
  WeddingHero.tsx  InvitationSection.tsx  WeddingEvents.tsx  EventDetail.tsx
  VenueSection.tsx  RSVPForm.tsx  WeddingFooter.tsx  Header.tsx  LanguageToggle.tsx  MusicPlayer.tsx
src/photos/                  guest photo pages, photographer (admin) page
server/index.js              photo server (API, matching, serves the built site)
server/faces.js  indexer.js  drive.js   face model, background indexer, Google Drive client
server/models/               face-recognition model weights
tests/  scripts/             automated tests (npm test), calibration and fake-Drive tools
```
