# Noir3D prototype (content-driven scenes + beats)

This folder is a **3D, scene/beat-driven prototype** intended for writing story and testing pacing/interaction as you go.

## Run locally

Because the prototype loads JSON via `fetch()`, you should run it from a local web server (not `file://`).

From the repo root:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/noir3d/`

## Authoring workflow

- Edit **scene structure / beats / shots / sets** in `noir3d/content/prologue.scene.json`
- Edit **dialogue** in `noir3d/content/prologue.dialogue.json`
- In-game, press **`~`** to open the dev panel, then click **Reload content**

## Scene JSON shape

`*.scene.json` is a single scene package:

- **`id`**: scene identifier
- **`startBeat`**: first beat id
- **`dialoguePath`**: JSON file containing dialogue nodes
- **`shots`**: named camera shots
- **`sets`**: named 3D “sets” (simple procedural geometry right now)
- **`beats`**: story beats that wire camera/location/objectives + interactions

### Sets

A set is currently a small list of primitive objects:

- `type`: `box` | `neon` | `prop` | `character` | `enemy`
- `position`, `rotation`, `size`, `color`, `emissive`, `hp`, etc
- `hotspotId`: if present, the object becomes clickable and can be targeted by beat logic

### Beats

Each beat can declare:

- `set`: which set to load
- `shot`: which camera shot to play
- `location`: location card text
- `objective`: current objective text
- `hotspots`: mapping of `hotspotId -> { if, actions }` (or an array for conditional variants)
- `events`: beat-level event handlers (currently `enemyDown`)

### Actions (supported)

Beat actions are executed sequentially:

- `showDialogue` (`key`)
- `gotoBeat` (`beat`)
- `setShot` (`shot`)
- `setHotspotVisible` (`hotspot`, `visible`)
- `setObjective` (`text`)
- `addNote` (`text`)
- `setFlag` (`flag`, `value`)
- `addItem` (`item`)
- `wait` (`ms`)

## Combat stub

- Press the on-screen **Action** button (or **`F`**) to attack.
- Enemies are defined by set objects of `type: "enemy"` with `hp` + `enemyId`.
- When an enemy hits 0 HP, the current beat can react via:

```json
{
  "events": {
    "enemyDown": {
      "thug": [{ "type": "addNote", "text": "..." }]
    }
  }
}
```

