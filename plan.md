# Visual Overhaul Plan — Mullet Pro

## Context
- Single file: `game.html` (~25K lines)
- 74 draw functions, ~10K canvas API calls, 347 font assignments
- Fixed 700×500 logical game area with DPR-aware canvas sizing
- All rendering is canvas-based (no WebGL)

---

## Phase 1: Scaling & Readability Foundation

### 1A. Responsive Font System
Create a font scale helper that adjusts based on canvas-to-viewport ratio:
```js
function scaledFont(size, weight, family) {
    // On small screens (canvas CSS-scaled down), bump minimum sizes
    const minSize = Math.max(size, 8); // no font below 8px logical
    return `${weight} ${minSize}px ${family}`;
}
```
- Replace the ~50 instances of fonts ≤7px with minimum 8px
- Add a global `FONT_SCALE` multiplier for HUD/UI text (labels, signs, status readouts)
- Keep artistic micro-text (like tiny sign labels) at their sizes but ensure they're at least 6px

### 1B. Line Width Minimums
- Replace `lineWidth = 0.5` instances (lines 1194, 2061, 2976) with minimum 1px
- Ensure stress cracks, detail lines ≥1px for mobile visibility

### 1C. DPR Consistency Fix
- Line 159: `const dpr` captured once — make it reactive to orientation changes
- Audit the dual setTransform calls at lines 15819/15847 vs the scale at 17657 to ensure no double-scaling

---

## Phase 2: Cloning Room Redesign (Primary Target)

`drawLevel6CloningRoom()` at line 11334 — the branch namesake.

### Current State
- Dark industrial room with production pipeline: Slurpee tanks → Fertilizer → Contact manifold → Fetal tanks → Centrifuge → Conveyor → Hatchery
- Good structural concept but visually flat — lots of `fillRect` boxes, minimal depth/lighting

### Improvements
1. **Ambient lighting**: Add a subtle overhead industrial light cone effect (radial gradient from ceiling lights casting visible pools of light on the floor)
2. **Tank depth**: Replace flat fillRect tank bodies with rounded-corner paths + multi-stop gradients that simulate cylindrical curvature
3. **Liquid effects**: Improve fluid animations in tanks — add surface meniscus, refraction highlights, more organic bubble paths
4. **Fetal silhouettes**: Upgrade from simple circles to recognizable curled-up figures with visible limbs, using semi-transparent layered rendering
5. **Hatchery entrance**: Add depth fog effect, dim red volumetric glow leaking from opening, animated steam/vapor particles
6. **Conveyor belt**: Add proper belt texture (metallic slats), rolling animation, side rails with bolts
7. **Floor reflections**: Wet industrial floor with subtle reflections of overhead elements
8. **Color grading**: Apply a subtle green-tinted overlay to the entire room for sci-fi horror atmosphere
9. **Equipment labels**: Ensure all label fonts (currently 6-8px monospace) are readable; raise to minimum 8px

---

## Phase 3: Character Sprites

### 3A. Mullet Pro (drawMulletPro, line 1204)
- Add anti-aliased outlines (shadow stroke behind character)
- Improve mullet hair detail — more flowing shape with gradient
- Add subtle idle animation bobbing
- Improve held-item rendering (gun, document, wrench)

### 3B. Bald Manager (drawBaldManager, line 1372)
- Add reflective head highlight
- Improve suit detail (lapel, tie, pocket square)
- Better walk cycle silhouette

### 3C. Boss (drawBoss, line 1640)
- Upgrade from block shapes to more detailed body
- Add distinctive visual features (cigar glow, gold chain)

### 3D. CEO (drawCEO, line 16460)
- Most important NPC — needs most polish
- Add power suit details, commanding posture

### 3E. Clone Follower (drawCloneFollower, line 12339)
- Distinguish visually from regular NPCs with eerie glow/transparency

---

## Phase 4: Room-by-Room Visual Polish

### Level 5 Rooms
1. **Pipe Room** (drawLevel5PipeRoom, line 5477) — Add depth shadows under pipes, improve pipe metallic shading, add dripping condensation particles
2. **Hallway** (drawLevel5Hallway, line 5938) — Improve floor tile pattern, add flickering fluorescent light effect, wall scuff marks
3. **Furnace Room** (drawLevel5FurnaceRoom, line 6188) — Add heat shimmer distortion, ember particles, improved fire glow

### Level 6 Rooms
4. **Employee Pipe Room** (drawLevel6EmployeePipeRoom, line 5702) — Same pipe improvements as L5
5. **Pipe Room** (drawLevel6PipeRoom, line 7667) — Improved industrial atmosphere
6. **Megacomputer Room** (drawLevel6MegacomputerRoom, line 8156) — Add screen glow bleeding onto walls, blinking server lights, cable management detail
7. **Nuclear Assembly Bridge** (drawNuclearAssemblyBridge, line 8942) — Add danger atmosphere, radiation glow, depth perspective on bridge
8. **Employee Lobby** (drawLevel6EmployeeLobby, line 11137) — Corporate sterile lighting, polished floor reflections
9. **Furnace Room L6** (drawL6FurnaceRoom, line 12450) — Enhanced fire/heat effects
10. **Underbelly Hallway** (drawLevel6UnderbellyHallway, line 12790) — Grimy atmosphere, dripping water, broken lights
11. **Underbelly** (drawLevel6Underbelly, line 13050) — Dark, oppressive depth
12. **Entryway** (drawLevel6Entryway, line 13988) — First impression room, needs to set tone
13. **CEO Office** (drawLevel6CEOOffice, line 14094) — Luxury contrast, warm lighting, power atmosphere

### Office Rooms (drawOfficeRoom, line 6661)
- Improve furniture rendering (desks, chairs, plants)
- Add ambient office lighting (desk lamp pools)
- Better computer screen glow effects

---

## Phase 5: Environmental Props & Items

### Infrastructure
1. **CCTV Cameras** (line 4373) — Add lens flare, recording light, sweep animation
2. **Fluorescent Lights** (line 4500) — Flickering effect, tube detail, light pool on surfaces below
3. **Air Ducts** (line 4553) — Improve grime texture, add vent slats
4. **Industrial Fan** (line 4615) — Better blade rendering, motion blur when spinning
5. **Death Star Blast Door** (line 4778) — Improve sci-fi panel detail, add status lights, hydraulic pistons

### Furniture & Objects
6. **Water Cooler** (line 5116) — Add water bubble animation, light refraction
7. **Tool Cabinet** (line 5187) — Add drawer handles, tool silhouettes visible through glass
8. **Marker Board** (line 5237) — Improve handwriting style, add dry-erase smudges
9. **Computer** (line 3515) — Better screen content, keyboard detail
10. **3D Printer** (line 3558) — Add printing animation effects, layer detail
11. **Office Plant** (line 6472) — Better leaf shapes, pot detail
12. **Blue Futon** (line 6530) — Improve cushion rendering, fabric texture

### Weapons
13. **Ghost Gun** (line 3628) — Add ethereal glow, transparency effects
14. **Pipe Wrench** (line 3788) — Metallic reflection, weight feel
15. **Revolver** (line 3908) — Better barrel detail, cylinder rendering
16. **Wrench Gun** (line 3867) — Hybrid weapon visual clarity

---

## Phase 6: UI & HUD Polish

### In-Game UI
1. **Email UI** (line 15761) — Improve readability, better text layout
2. **Letter UI** (line 15816) — Paper texture, aged look
3. **Detective Note UI** (line 15844) — Handwritten feel, coffee stain
4. **Safe UI** (line 15941) — Metallic dial, combination mechanism detail
5. **Elevator UI** (line 16215) — Button panel, floor indicator
6. **Keypad UI** (line 16268) — Backlit keys, worn button marks
7. **Computer UI** (line 16397) — Terminal/DOS aesthetic, scan lines
8. **Portrait UI** (line 17136) — Frame detail, canvas texture
9. **Holster UI** (line 17269) — Quick-select weapon display

### HUD Elements
10. **Ammo Counter** (line 1114) — Cleaner display, icon for ammo type
11. **Held Doc indicator** (line 1151) — Better document icon
12. **Mute Indicator** (line 17160) — Cleaner speaker icon
13. **Holster Button** (line 17225) — Better touch target visibility

---

## Phase 7: Visual Effects & Atmosphere

1. **Particle system**: Add reusable particle emitter for dust motes, sparks, steam, embers
2. **Screen shake**: On explosions/impacts, add subtle canvas shake
3. **Vignette**: Subtle dark edges on rooms for cinematic framing
4. **Acid Burst** (line 17352) — Improve splatter effect, add glow
5. **Wrench Shatter** (line 3854) — Better fragment physics/rendering
6. **Death animation** — More impactful visual feedback

---

## Phase 8: Title & Menu Screens

1. **RT Presents screen** — Cinematic fade timing, better typography
2. **Title screen fallback** — When image doesn't load, improve the pipe-bar aesthetic
3. **Level cards** — Better transition effects, typography hierarchy
4. **Menu polish** — Consistent visual language with in-game aesthetic

---

## Implementation Strategy

- Work through phases sequentially (1→8)
- Within each phase, commit after each major subsection
- Test on the 700×500 canvas after each change — visual regression is the main risk
- The cloning room (Phase 2) gets the most attention as it's the branch focus
- Reuse patterns established in early rooms for consistency in later rooms
- Font/line-width fixes in Phase 1 propagate automatically to all rooms

## Estimated Commits
~15-20 commits across all phases, pushed to `claude/redesign-cloning-room-jl2eI`
