## Architecture
- Business rules (intervals, pricing, time zone, validation) live in `src/domain/` as pure TS without React/three — UI only calls them, so rules stay in one place and are unit-tested.
- Bookings go through the `BookingRepository` interface in `src/data/bookingRepository.ts` (currently localStorage demo) so a server backend can replace it without UI changes.
- Times are stored as UTC ms and converted to the lot time zone only for input/display.
- The 3D scene is lazy-loaded behind ClientOnly with `frameloop="demand"`; the list view is a full alternative and the fallback when WebGL fails.
