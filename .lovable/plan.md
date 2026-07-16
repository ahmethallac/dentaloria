## Goal
Add a Videos section (YouTube + Instagram links) to the clinic detail page, and restyle the main photo gallery so both use the same 3-per-row (desktop) / 2-per-row (mobile) horizontally-scrollable layout with arrow navigation.

## 1. Database (single migration)

Create `clinic_videos`:
- `id uuid pk`, `clinic_id uuid fk clinics`, `video_url text`, `provider text` (`youtube` | `instagram`), `provider_id text` (video/reel id), `thumbnail_url text` (nullable, filled for YouTube), `sort_order int default 0`, `created_at`, `updated_at`.
- GRANTs for `authenticated`, `service_role`, and `anon SELECT` (public page reads).
- RLS: public read; owning clinic (via `clinics.user_id`) + admins can insert/update/delete.
- `updated_at` trigger.

## 2. URL parsing helper (`src/lib/videoUtils.ts`)
Pure functions:
- `parseVideoUrl(url)` → `{ provider, id, embedUrl, thumbnailUrl }` or `null`.
- YouTube: match `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/shorts/`, `youtube.com/embed/`. Embed: `https://www.youtube.com/embed/{id}`. Thumb: `https://img.youtube.com/vi/{id}/hqdefault.jpg`.
- Instagram: match `instagram.com/(reel|p|tv)/{id}`. Embed: `https://www.instagram.com/{type}/{id}/embed`. Thumb: `null` (rendered via iframe).

## 3. Clinic panel — `ClinicVideosManager.tsx`
Mounted in `ClinicInfoTab.tsx` directly under `ClinicImagesManager` (i.e. between Images and Treatments so it mirrors the public order).
- Input field + "Add video" button. Validates URL with `parseVideoUrl`; rejects unsupported links with a toast.
- Inserts row into `clinic_videos` with parsed provider/id/thumbnail.
- Grid of existing videos with 9:16 preview (thumbnail for YouTube, iframe preview for Instagram), delete button, drag-free reorder via up/down arrows updating `sort_order`.

## 4. Public clinic page (`src/pages/ClinicDetail.tsx`)

### Shared horizontal-scroller component (new, in-file or `HorizontalMediaRow.tsx`)
- Props: `items`, `renderItem`, `itemsPerViewDesktop=3`, `itemsPerViewMobile=2`.
- Renders `flex overflow-x-auto snap-x snap-mandatory scrollbar-hide`; each child sized `basis-1/2 md:basis-1/3` with gap.
- Left/right chevron buttons (styled like existing gallery arrows) shown only when `scrollWidth > clientWidth`; each click scrolls by one page (`clientWidth`).

### Photo gallery restyle
Replace the current full-width snap slider (lines ~667‑742) with the new scroller:
- Each tile: rounded, `aspect-video` (photos keep landscape 16:9), `object-cover`.
- Click opens the existing fullscreen lightbox at that index (reuse `fullscreenIdx` flow).
- Remove the dot indicator + mobile "Full Screen" overlay (arrow nav + click-to-open replaces them).

### New Videos section
- Fetched with the clinic (extend `getClinicById` in `src/lib/services.ts` to include `clinic_videos(*)` ordered by `sort_order, created_at`).
- Rendered directly below the photo gallery, before the About cluster.
- Uses the same `HorizontalMediaRow` but with `aspect-[9/16]` tiles.
- Tile content:
  - YouTube → `<img src={thumbnailUrl}>` + centered play icon; click opens lightbox `<iframe>` embed.
  - Instagram → `<iframe src={embedUrl}>` sized to 9:16 with `pointer-events-none` overlay so the whole tile is clickable; click opens same lightbox with full iframe.
- Lightbox: reuse shadcn `Dialog` with a max-width card containing the iframe at `aspect-[9/16]` (fallback to `aspect-video` for horizontal YouTube in fullscreen — kept 9:16 in the grid per requirement, expanded in the modal for watchability).

### Tab bar
Keep existing tabs; the "Photos" tab already anchors to Before & After — no change to tab order requested. Videos section is not a tab (user didn't ask for one) but scrolls naturally between gallery and About.

## 5. Types & data plumbing
- Regenerate Supabase types after migration (automatic).
- Extend the `Clinic` type consumers in `ClinicDetail.tsx` to read `clinic_videos`.

## Technical notes
- Instagram embeds require the third-party script only for full interactivity, but the `/embed` iframe renders standalone reel playback without it, which is sufficient for a preview + click-to-open experience.
- YouTube thumbnail URL is deterministic from the video id, so no API call is needed at save time.
- All new UI uses existing design tokens (no hard-coded colors).

## Out of scope
- Uploading raw video files.
- TikTok / Vimeo / other providers (can be added later by extending `parseVideoUrl`).
