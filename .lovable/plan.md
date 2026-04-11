

# Fix Gallery Interactions + Image Crop System

## Issues to Fix

### 1. Desktop drag scroll not working
The current `mousedown`/`mousemove` handler sets `el.scrollLeft` directly, but the container has `scroll-smooth` which fights the drag. Also, `pointer-events-none` on images blocks mouse events from bubbling properly.

### 2. Mobile swipe not working in gallery
The `snap-mandatory` combined with `scroll-smooth` and the drag handler interfere with native touch scrolling. Touch events need to work naturally without the mouse-drag handler intercepting them.

### 3. Mobile tap → fullscreen behavior
Currently tapping directly opens fullscreen. Instead: first tap shows a semi-transparent "Full Screen" button overlay on the image; tapping that button opens fullscreen.

### 4. Mobile fullscreen swipe navigation
The fullscreen viewer currently only has arrow buttons. Need to add touch-swipe support to navigate between images.

### 5. Fullscreen images inconsistent sizes
Currently using `max-h-full max-w-full object-contain` which makes each image a different size. Fix: use a fixed container with `aspect-video` and `object-cover` (or `object-contain` inside a fixed-dimension wrapper).

### 6. Image crop tool during clinic registration
Add a Facebook-style crop dialog in AddClinic.tsx and ClinicImagesManager.tsx. When images are selected, each opens in a crop modal with a fixed 16:9 frame. The user drags the image to choose the visible area, then confirms. This ensures all uploaded images have identical dimensions.

---

## Plan

### File: `src/pages/ClinicDetail.tsx`

**Gallery drag fix (desktop)**
- Remove `scroll-smooth` from the gallery container during drag (add it back on mouseup) so manual `scrollLeft` assignment works instantly.
- Remove `pointer-events-none` from images; use `draggable={false}` and `user-select: none` instead.
- Track drag distance; if minimal movement, treat as a tap (for mobile "Full Screen" button).

**Mobile swipe in gallery**
- Let native touch scrolling handle swipe (the `snap-mandatory` will snap to each image). Remove any touch interference from the drag handler. The drag handler should only handle mouse events.

**Mobile tap → "Full Screen" button**
- Add a `tappedImageIdx` state. On mobile tap (not drag), set it to show a semi-transparent overlay with a "Full Screen" button centered on that image.
- Tapping the button calls `setFullscreenIdx(idx)`.
- Tapping elsewhere or scrolling dismisses the overlay.

**Fullscreen swipe navigation**
- Add touch event handlers (`touchstart`, `touchmove`, `touchend`) on the fullscreen container. Track swipe direction and distance. On horizontal swipe > 50px threshold, navigate to next/prev image.

**Fullscreen consistent image sizes**
- Replace `max-h-full max-w-full object-contain p-4` with a fixed container: `w-full h-[80vh] flex items-center justify-center` containing an `aspect-video` div with `object-contain` or `object-cover`. All images render inside the same fixed box.

### File: `src/components/ui/ImageCropDialog.tsx` (new)
- A reusable crop dialog component.
- Props: `file: File`, `aspectRatio: number` (default 16/9), `onCrop: (croppedFile: File) => void`, `onCancel: () => void`.
- Uses an HTML canvas approach: load image, render it in a container with overflow hidden, let user drag to reposition, then crop to the fixed frame using canvas.
- No external library needed — pure CSS/JS with mouse/touch drag on the image within a fixed viewport.
- The crop frame is fixed (16:9); the image can be dragged and scaled within it.
- On confirm, draw the visible portion onto a canvas, export as JPEG blob, return as File.

### File: `src/pages/AddClinic.tsx`
- Modify `handleImageUpload`: instead of immediately adding files to state, push them into a queue.
- Process the queue one at a time: open `ImageCropDialog` for each file.
- On crop confirm, add the cropped file to `clinicImages` state.
- On cancel, skip that file.
- Show cropped previews in the existing grid.

### File: `src/components/clinic-panel/ClinicImagesManager.tsx`
- Same crop flow: when files are selected via the file input, open `ImageCropDialog` for each before uploading.

### File: `src/lib/imageUtils.ts`
- Keep existing optimization functions but they become secondary — the crop dialog produces already-sized output. The `optimizeClinicImages` function can still compress after cropping.

---

## Technical Details

**Crop dialog internals:**
- Load image into an `<img>` element inside a fixed-ratio container (`aspect-video`, max-width ~600px).
- Image is positioned absolutely, larger than the container. User drags to pan.
- Optional zoom slider (pinch-to-zoom on mobile).
- "Confirm" button crops via canvas: draw the visible region, export to blob at 1200×675 (16:9), quality 0.85.
- Result is a standardized File object with consistent dimensions.

**Gallery drag mechanics fix:**
- On `mousedown`: record start position, set a flag, temporarily remove `scroll-smooth` class.
- On `mousemove`: update `scrollLeft` directly (no smooth interpolation).
- On `mouseup`: re-add `scroll-smooth`, snap to nearest index.
- Touch events: do nothing custom — let browser handle native scroll + snap.

