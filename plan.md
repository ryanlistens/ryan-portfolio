# Visual & Gameplay Quality Plan — Mullet Pro

## Design Philosophy

This game is a canvas-rendered 2D arcade game at 700×500 logical pixels. Every visual element is procedurally drawn — no sprite sheets, no WebGL. This means quality comes from **thoughtful use of canvas primitives**: arcs, bezier curves, gradients, and compositing. The goal is not photorealism — it's **polished, readable, satisfying pixel-scale art** with proper proportions, consistent sizing, and smooth animations.

The overhaul targets three pillars:
1. **Readability** — every element must be legible on mobile (360px-wide screens)
2. **Consistency** — all characters share a proportion system; all signs clip their text
3. **Polish** — curved shapes replace flat rectangles; gradients replace flat fills

---

## What's Been Done

### Bugs Fixed
- **Level 6 pipe NPC state reset**: `level5.npcPipes` now fully resets when entering Level 6, preventing carryover crack timers from causing instant pipe bursts in the employee pipe room
- **Clone follower + hallway boss interaction**: Clone now avoids the boss's patrol zone (stays 65px clear) and absorbs boss bullets as a shield for the player, preventing the game-breaking scenario of traveling with the clone past the hallway cloning boss
- **Acid burst array cleared** on level transition to prevent ghost animations

### Player Sprites Redesigned
Both `drawMulletPro()` and `drawBaldManager()` have been rebuilt from scratch:
- **Oval heads** using `ctx.ellipse()` instead of `fillRect` squares
- **Proper facial features**: round eyes with irises/pupils/highlights, curved eyebrows, shaped noses and mouths
- **Mullet Pro**: flowing hair using bezier curves with gradient shading, burgundy leather jacket with V-neck collar, shaped shoulders, belt with gold buckle, tapered jeans, rounded boots
- **Bald Manager**: polished dome with radial gradient shine, crisp white dress shirt with lapels, burgundy tie with knot detail, pocket square, tailored black trousers, polished oxford shoes
- **Shared animation system**: both sprites use stroke-based arms with `lineCap: 'round'`, walk cycle drives arm swing, consistent shadow at y+36
- **Consistent proportions**: both characters occupy the same footprint (~30px wide, ~66px tall) with heads at the same relative position

### Font & Label Bleeding Fixed
- All PIPETECH signs now clip text within sign boundaries using `ctx.clip()`
- DOC PRINTER, 3D PRINTER, AUTO-WRENCH labels have properly sized dark backgrounds
- CLONE tag widened from 36px to 44px with smaller bounded font
- Direction prompts (HALLWAY →, ← PIPE ROOM, FURNACE →) use `scaledFont` with `bounded: true` to prevent mobile overflow
- "GLOBAL LEADER IN PIPE DREAMS" tagline reduced from 10px unbounded to 8px bounded

### Mobile Text Readability
- Email UI (Pmail) headers and body text use `scaledFont()` for proper mobile scaling
- Letter UI fallback text uses `scaledFont()` with serif family
- Detective note canvas fallback text uses `scaledFont()` for all lines
- Instruction bars ("ACTION TO CLOSE") use scaled fonts

### Death Sequence Shortened
- Acid burst melt animation reduced from 2.5s to 1.4s
- Cleanup/removal reduced from 4.0s to 2.2s
- Total death→reset time cut by ~45%

---

## What Still Needs Work

### Priority 1: NPC Sprite Consistency ✓ COMPLETE

All boss characters and NPCs now use curved shapes, stroke-based arms, oval heads, and consistent proportions.

**Completed:**
- `drawNPC()`: Pipe managers — round ellipse heads, proper eyes with iris/pupil, alert bubble with background
- `drawBoss()`: Level 5 boss — complete rewrite with oval head, shaped torso, stroke-based arms with lineCap:'round', cigar in hand with smoke wisps, gold chain, tapered tie, rounded shoes. Shadow at y+36.
- `drawCEO()`: Final boss — complete rewrite across all 4 facing directions (left/right/forward/back). Oval weathered head with wrinkle lines, jowls, deep-set eyes with bags, gray slicked hair, charcoal power suit with pinstripes/lapels/pocket square, dark red tie, stroke-based arms with gold watch/ring, cigar in mouth with smoke, rounded shoes. Gun overlay rewritten with stroke-based arm.
- `drawDeadCEO()`: Rewritten with ellipse body, stroke-based limbs, oval head, rounded cigar
- Cloning room boss (inline): Rewritten with oval head, shaped red shirt torso, stroke-based arms, rounded steel-toe boots, hard hat on top
- Hallway cloning boss (inline): Same curved treatment as cloning room boss — consistent appearance across both locations
- `drawCloneFollower()`: Shaped torso with quadraticCurveTo, stroke-based arms, ellipse shoes

**Design constraint met**: All NPCs now share consistent foot position (~y+36 shadow) and proportional heads.

### Priority 2: Remaining Sign & Label Quality ✓ COMPLETE (2026-07 remaster)

- Level 6 pipe-room large-format PIPETECH sign: text clipped to sign face
- `drawNuclearAssemblyBridge()` factory sign: both normal and detective-mode
  text clipped to the plate
- `drawLevel6EmployeeLobby()` PIPETECH logo + tagline: clipped to sign plate

### Priority 3: Environmental Props ✓ COMPLETE (2026-07 remaster)

All done via a shared `pathRoundRect()` helper (hand-rolled rounded-rect path
for wide browser support):
- `drawComputer()`: rounded bezel + chassis, gradient screen with glare sweep,
  status LED, paper slot
- `drawWaterCooler()`: cylindrical jug with curved shoulders, horizontal
  glass gradient, water-line ripple, curved highlight
- `drawOfficePlant()`: side-lit terracotta gradient + gentle per-leaf idle sway
- `drawBlueFuton()`: rounded tufted cushions with fabric gradients, contact
  shadow, rounded armrest rolls and throw pillow
- `drawTableDesk()`: rounded gradient top, tapered legs, rubber feet,
  elliptical contact shadow

### Priority 4: Room Atmosphere ✓ COMPLETE (2026-07 remaster)

Implemented as a global post-pass — `applyRoomAtmosphere()` (called from all
three drawScene paths: levels 1-4 tail, level 5 block, level 6 block, always
under full-screen UIs). Per-room moods in `ATMOS_MOODS`, keyed by
`currentAtmosMood()`:
- **industrial** (pipe rooms): cool blue-grey tint, overhead wash
- **corporate** (hallways/lobby): warm fluorescent wash
- **office** (PM offices): desk-lamp warmth
- **furnace**: amber tint + animated firelight flicker
- **cloning**: green horror tint + slow pulsing glow
- **luxury** (marble/entryway/CEO office): golden light
- **techBlue** (megacomputer/bridge): monitor blue cast
- **underbelly**: near-dark grime + failing-bulb flicker
- **hell**: ember red breathing overlay
Every mood adds floor depth shading + a cached edge vignette. Cost is 3-5
gradient/flat fills per frame; all static gradients cached in
`_atmosGradCache`.

### Priority 5: UI Polish ✓ COMPLETE (2026-07 remaster)

- **Holster UI**: tooled-leather panel with stitched border, recessed slot
  pockets, radial icon halo
- **Safe UI**: vault-steel plate with machined rivets, recessed code window,
  glass-sheen code slots, beveled push-buttons with selection halo
- **Elevator UI**: brushed brass-trimmed panel, corner screws, backlit amber
  floor-indicator display, rounded call buttons with gold halo
- **Keypad UI**: backlit keys with cyan underglow, convex key-cap sheen,
  glowing digits; ESC/?/CLR share the treatment
- **HUD (DOM)**: gradient bar, glow-tinted heart/money counters

### Priority 6: One light model across every sprite ✓ COMPLETE (2026-07 remaster)

Individually hand-shading ~90 draw functions would have produced ~90 slightly
different ideas about where the light is. Instead there is now a single house
shading model — `shadeSprite()` — and every character and prop sprite goes
through it, so the whole cast and set are lit from the same direction.

**How it works.** The sprite draws into a pooled offscreen buffer (`ctx` is
redirected for the duration), then three passes are composited with
`source-atop` so they touch only the sprite's own pixels and never the room
behind it:
1. **Key light** — warm, top-left, falling off to a cool shadow at lower-right
2. **Rim light** — cool blue down the lit edge
3. **Grounding** — darkening where the sprite meets the floor
   (`opts.ground: 0` for wall-mounted signage and held items, which have no
   floor contact; reduced for bodies lying down)

**Covered (24 sprites):** `drawMulletPro`, `drawBaldManager`, `drawCEO`,
`drawNPC`, `drawBoss`, `drawCloningBoss`, `drawCloneFollower`,
`drawMutantPlayer`, `drawMulletProAsPM`, `drawPipeManagerBack`,
`drawSkeletonPlayer`, `drawBackViewPlayerOnLadder`, `drawRecliningBoss`,
`drawDeadCEO`, `drawDeadCloningBoss`, `drawStepLadder`, `drawToolCabinet`,
`drawMarkerBoard`, `draw3DPrinter`, `drawGhostGun`, `drawWrenchGun`,
`drawRevolver`, `drawPipeWrench`, `drawHeldDoc`.

**Deliberately excluded:** `drawHellMeltPlayer` (self-illuminated — a fire
glow must not be re-lit), `drawWrenchProjectile` (fast-moving, too small to
read form), HUD/UI widgets, and room backgrounds, which the
`applyRoomAtmosphere()` pass already handles.

**Performance.** Buffers are pooled by power-of-two size tier so each is
allocated once rather than resized per sprite; gradients are cached per tier
and box size; the buffer resolution is capped at 2x dpr. Measured cost is
+1–4ms per frame in the heaviest rooms, and real `requestAnimationFrame`
pacing stays at a 16.7ms median / 17.6ms p95 in level 1 pipe, level 5 pipe and
the level 6 cloning room — no dropped frames.

### Priority 7: One ground plane, one face ✓ COMPLETE (2026-07 remaster)

**Ground plane.** Every sprite was authored around its own idea of where the
feet sit relative to its anchor. Measured from rendered pixels across every
sprite and facing, the offsets ranged from **+29** (cloning boss) to **+51**
(CEO) — so `y` was not a depth coordinate, and two characters handed the same
`y` stood at visibly different depths. The clearest symptom was the nuclear
bridge: the player's shoes hung past the front edge of the deck into the void
while the clone follower beside him, on the identical `y`, stood correctly on
the walkway.

`FOOT_FIX` now brings every sprite onto one contract — the feet land exactly
`SPRITE_FOOT` (36px) below the anchor. Re-measured spread: **35–37**.

**Feet planted in motion.** A static offset isn't enough — the walk cycles
were adding their stride offset in *both* directions, so on alternate steps a
boot sank ~5px through the floor. The cloning boss and clone follower now lift
each foot off a *fixed* contact line and never push through it. Measured
across a full walk cycle, foot drift is **0px** for every animated character
(worst case was 4px).

**Faces.** The cast was split between two drawing languages: bosses and the
CEO had modelled eyes (sclera, iris, brow) while pipe managers, Mullet Pro,
the bald manager and the clone follower had flat black squares — which read as
tiles hovering in front of the face, with the cheek shading below them looking
like a shadow they cast. One shared `drawCharEyes()` now serves all of them:
socket recessed into the skin, white, tracking iris, catchlight keyed to the
same light as `shadeSprite`, and a brow. Pipe managers get a slow blink and
drifting gaze; their worried/pacing states pinch the brows.

**Cloning boss anatomy.** Forward view: torso was a plain rectangle with each
arm a bare plank butted against its outer edge in the same flat red — no
shoulder, no separation, so the silhouette collapsed into one slab with no
readable front or side. The chest now slopes from the neck and tucks at the
waist, arms hang from deltoid caps over the shoulder joint, and a seam divides
limb from chest. Side view: the front arm terminated mid-torso, leaving its
hand as a floating disc on the shirt; both arms now run down the body's edges
with hands clearing the hem at hip level.

**Not a bug, worth recording:** the clone follower measured 97px tall against a
pipe manager's 63px, which looked like a gross scale error. It isn't — the
extra 34px was its floating "CLONE"/"ARMED" text label being counted as part of
the sprite. Measuring the contiguous mass up from the feet gives 63px, matching
the pipe manager it was cloned from exactly.

### Verification

Headless Chromium smoke test: level 1 pipe room, level 5 pipe/furnace/office
rooms, level 6 cloning room/underbelly/CEO office, plus safe/keypad/elevator
UIs — zero page errors; script passes `node --check`.

Character geometry is measured, never assumed — `scratchpad/feet.cjs` re-derives
every foot offset and body height from rendered alpha, `walkfeet.cjs` samples
each character across a full walk cycle to catch feet leaving the ground plane,
and `sheet.cjs` renders a contact sheet with a ground line drawn under every
sprite.

Two automated checks guard the shading model — both with negative controls, so
a passing result means the check can actually fail:
- **Clip detection.** A probe re-renders every `shadeSprite` call into a
  measured buffer and flags any sprite whose artwork reaches the buffer edge.
  Run across 11 rooms and ~1,000 sprite draws with facings, held items, gun
  states and the NPC stress escalation cycled: no clipping. Shrinking every
  box by 26px makes all 13 reachable sprites report, confirming sensitivity.
- **Round-trip equivalence.** With the light model neutralised, routing a
  sprite through the offscreen buffer must match drawing it straight to the
  canvas — this catches clipping, resampling artefacts, and state leaking
  between sprites that share a pooled buffer. Worst case is 24 differing
  pixels out of 576,000, and an animation-only control (same render path
  snapped twice) accounts for all of the large ones.

Sprite bounding boxes were measured by rendering each function and taking its
alpha extents, not read off the source — the same render-first discipline used
for the dead detective.

### Future ideas

- Wet-floor reflections and steam particles in pipe rooms
- Ember particles in furnace rooms; depth fog in cloning room
- Heat shimmer post-effect near the furnace

---

## Technical Notes

### The scaledFont System
```js
scaledFont(size, weight, family, bounded)
```
- `bounded: true` — for text inside fixed-size containers (signs, labels). Uses 6px minimum, skips FONT_SCALE. Prevents overflow on mobile.
- `bounded: false` (default) — for floating UI text. Uses 8px minimum, applies FONT_SCALE (up to 1.5x on small viewports).
- **Rule**: Any text that sits on/in a fixed-width element MUST use `bounded: true`.

### Sprite Proportion Standard
All player-scale characters should follow:
- Shadow: `y + 36` from anchor
- Head center: `y - 18` to `y - 20` from anchor
- Shoulder width: ~28-30px
- Total height: ~66-68px
- Arms: stroke-based, `lineWidth: 5`, `lineCap: 'round'`

### Canvas Clipping for Signs
Any sign with text must:
1. Draw the sign background
2. `ctx.save()` + `ctx.beginPath()` + `ctx.rect(signBounds)` + `ctx.clip()`
3. Draw text
4. `ctx.restore()`

This prevents text from bleeding over sign edges regardless of font size or scaling.
