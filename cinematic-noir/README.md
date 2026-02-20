# Cinematic Noir — Story-First Game Dev

A **scene-based cinematic game** framework for developing story, dialogue, and mechanics in real time. Edit content files, refresh the browser, test immediately. No build step.

**Vibe:** Mobile LA Noire × Cohen Brothers script × breathing atmosphere. Player-paced. Tight mise en scène.

---

## Quick Start

1. **Run the game:**
   ```bash
   # From project root, serve the cinematic-noir folder
   python -m http.server 8080 --directory cinematic-noir
   # Or: npx serve cinematic-noir
   ```
2. Open `http://localhost:8080` in a browser (or your phone on the same network).
3. Tap the title screen to begin.

---

## Workflow: Write → Refresh → Test

### Add or Edit a Scene

1. Create `story/scenes/your_scene.json`:
   ```json
   {
     "id": "office",
     "title": "YOUR OFFICE",
     "setting": "Dust in the window light. The phone never stops.",
     "background": "https://example.com/your-bg.jpg",
     "exits": [
       { "id": "street", "label": "EXIT", "target": "street", "area": [2, 18, 15, 18] }
     ],
     "hotspots": [
       { "id": "desk", "area": [30, 25, 40, 30], "look_dialogue": "desk_description" }
     ],
     "npcs": [
       {
         "id": "secretary",
         "position": [60, 25],
         "default_dialogue": "secretary_intro"
       }
     ]
   }
   ```
2. Add `"office"` to `story/index.json` → `scenes` array.
3. Add an exit in another scene that targets `"office"`.
4. Refresh the game.

### Add or Edit Dialogue

1. Create `story/dialogue/your_dialogue.json`:
   ```json
   [
     { "speaker": "NARRATOR", "text": "The desk is crowded with files. One folder has no label." },
     { "speaker": "YOU", "text": "What's in here?" }
   ]
   ```
2. Reference it from a scene (hotspot `look_dialogue`, npc `default_dialogue`).
3. Refresh the game.

### Set Flags When Dialogue Ends

When the player finishes a dialogue block, you can set flags that change NPC behavior:

In `story/index.json`:
```json
"dialogue_flags": {
  "bartender_intro": ["has_mickey_info", "has_card"],
  "secretary_intro": ["knows_about_meeting"]
}
```

In your scene, use `state_dialogue` to switch dialogue by flag:
```json
"state_dialogue": {
  "has_mickey_info": "vivian_progress",
  "default": "vivian_intro"
}
```

---

## File Structure

```
cinematic-noir/
├── index.html           # Game engine + renderer
├── README.md
└── story/
    ├── index.json       # Title, start scene, scene list, dialogue flags
    ├── style.yaml       # Visual direction (reference; future use)
    ├── characters.yaml  # Character definitions (reference; future use)
    ├── scenes/
    │   ├── street.json
    │   └── bar.json
    └── dialogue/
        ├── vivian_intro.json
        ├── bartender_intro.json
        ├── car.json
        └── ...
```

---

## Area Coordinates

`area` is `[left%, bottom%, width%, height%]` — percentages of the scene. Example: `[50, 20, 10, 15]` = 50% from left, 20% from bottom, 10% wide, 15% tall.

---

## Vignettes & Style Notes

- **story/style.yaml** — Edit for mise en scène, palette, pacing. (Engine will read this in a future pass.)
- **Vignettes** — Short atmospheric beats: add as small dialogue blocks (e.g. `vignette_rain.json`) and trigger from hotspots or scene entry.

---

## Next Steps

- Add **office** and **hotel** scenes.
- Add **Room 214** crime scene.
- Implement **case notes** panel (load from `story/case_notes.json`).
- Add **inventory** UI.
- Optional: **3D** via Three.js for key scenes.
