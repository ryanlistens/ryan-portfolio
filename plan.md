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

### Priority 1: NPC Sprite Consistency

The pipe managers (`drawNPC`), boss characters, and the clone follower still use the old rectangular style. They need the same curved-shape treatment as the player sprites.

**Specific targets:**
- `drawNPC()` (line ~2195): Pipe managers in colored jumpsuits — need round heads, proper bodies
- `drawBoss()` (line ~1954): Early boss — needs proportional body, not blocky rectangles
- `drawCloneFollower()` (line ~13542): Red PM clone — already has curved hood but body is still rectangles
- `drawCEO()` (line ~17914): Final boss — most detailed NPC, needs polish pass
- Hallway cloning boss (inline at ~19839): Hard hat boss drawn inline — needs consistency with other bosses

**Design constraint**: All NPCs should share the same head height (~y-30 from anchor) and foot position (~y+36) as the player sprites. Currently some NPCs are taller/shorter than the player, which looks random.

### Priority 2: Remaining Sign & Label Quality

Signs that still need clip treatment:
- `drawLevel6MegacomputerRoom()` PIPETECH sign (line ~8608)
- `drawNuclearAssemblyBridge()` signs (line ~9970)
- `drawLevel6EmployeeLobby()` PIPETECH sign (line ~12101)
- `drawLevel6Entryway()` and `drawLevel6CEOOffice()` various labels
- Marker board schematic text (lines ~5953-6129) — very small text, needs to either be readable or removed

### Priority 3: Environmental Props

Props that would benefit from curved shapes:
- `drawComputer()`: Monitor should use rounded rect, not flat box
- `drawWaterCooler()`: Bottle should be more cylindrical
- `drawOfficePlant()`: Leaves should use bezier curves
- `drawBlueFuton()`: Cushions should be rounded
- `drawTableDesk()`: Rounded edges

### Priority 4: Room Atmosphere

Each room type should have a distinct visual mood:
- **Pipe rooms**: Industrial — overhead light cones, wet floor reflections, steam
- **Hallways**: Corporate — warm lighting, clean floors, door detail
- **Cloning room**: Sci-fi horror — green tint, pulsing lights, depth fog
- **Furnace rooms**: Hot — orange/amber glow, heat shimmer, ember particles
- **CEO office**: Luxury — warm golden lighting, rich textures
- **Underbelly**: Dark — minimal lighting, grimy atmosphere, broken fixtures

### Priority 5: UI Polish

- **Holster UI** weapon selection overlay — needs better weapon icons
- **Safe UI** combination dial — metallic rendering
- **Elevator UI** — floor indicator, better button panel
- **Keypad UI** — backlit keys

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
