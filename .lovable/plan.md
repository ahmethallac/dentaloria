
Title: Correct the clinic gallery to a single horizontal image rail

What went wrong
- The current implementation interpreted “single slider” as “one image visible at a time.”
- In `src/pages/ClinicDetail.tsx`, each slide is `w-full snap-center`, which forces a one-photo-per-view carousel.
- That is not aligned with your requirement. What you want is:
  - one gallery component
  - all images in the same horizontal row
  - equal-sized cards
  - sideways scrolling by drag/swipe/keyboard
  - no desktop click action
  - mobile tap opens fullscreen viewer

What I will change
1. Replace the current full-width slide structure
- Remove the `w-full snap-center` single-image carousel behavior.
- Render the gallery as a horizontal rail of repeated, same-size image cards.
- Each card will use a fixed responsive width and a consistent aspect ratio so all images look uniform.

2. Keep one horizontal slider, not multiple views
- Structure:
  - outer scroll container
  - inner flex row
  - repeated image cards
- This makes the gallery read as one clean horizontal strip instead of a carousel showing one image at a time.

3. Preserve premium, stable image sizing
- Use a fixed container ratio for every card.
- Use `object-cover` on all gallery images.
- Ensure no card changes size based on source image dimensions.
- Keep the rail visually balanced with the left column and not oversized.

4. Interaction behavior
- Desktop:
  - mouse drag to scroll
  - trackpad / wheel horizontal scroll support remains natural
  - keyboard left/right arrows scroll the rail
  - no click interaction on images
- Mobile:
  - touch swipe scroll works naturally
  - tapping an image opens fullscreen
  - fullscreen keeps arrows + close button + image counter

5. Improve scroll behavior
- Keep smooth horizontal scrolling.
- Use snap behavior only if it helps polish without making the rail feel rigid; otherwise relax it so scrolling feels more natural.
- Ensure the container is focusable for keyboard navigation.

6. Clean up mobile fullscreen trigger logic
- Desktop clicks will do nothing.
- Mobile taps will open the fullscreen viewer from the tapped image.
- Fullscreen viewer will remain consistent and independent from the gallery rail layout.

Files to update
- `src/pages/ClinicDetail.tsx`
  - replace the current “single-image slider” markup with a true horizontal image rail
  - update the card sizing classes
  - keep drag-scroll and keyboard behavior, adapted for a multi-image row
  - keep mobile fullscreen opening only on small screens
- `src/index.css` only if needed
  - optional small helper styles for scroll behavior/cursor polish
  - no broad redesign changes

Expected final result
- Multiple photos visible in one horizontally scrollable row
- All photos same size
- Clean modern “gallery rail” feel
- No lightbox on desktop
- Mobile tap-to-fullscreen still works
- No layout jumping, no mixed image sizes, no accidental one-photo carousel behavior

Acceptance criteria
- Desktop shows several images across the rail, not one full-width image
- Dragging with the mouse scrolls horizontally
- Arrow keys move the gallery when focused/hovered
- Mobile swipe scrolls the rail
- Mobile tap opens fullscreen viewer with arrows and close button
- All gallery cards stay visually consistent in size and ratio
