import { ContentLoader } from "./engine/contentLoader.js";
import { Storage } from "./engine/storage.js";
import { StoryRuntime } from "./engine/storyRuntime.js";
import { World } from "./world/world.js";
import { CaseUi } from "./ui/caseUi.js";
import { DevUi } from "./ui/devUi.js";
import { DialogueUi } from "./ui/dialogueUi.js";
import { HudUi } from "./ui/hudUi.js";

const DEFAULT_SCENE_PATH = "./content/prologue.scene.json";

function $(sel) {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
}

async function boot() {
  const canvas = $("#c");

  const storage = new Storage("noir3d.v1");
  const content = new ContentLoader({ baseUrl: new URL(".", window.location.href).href });

  const hudUi = new HudUi({
    locEl: $("#loc"),
    objectiveTextEl: $("#objectiveText"),
  });

  const caseUi = new CaseUi({
    openBtn: $("#caseBtn"),
    panelEl: $("#casePanel"),
    closeBtn: $("#caseCloseBtn"),
    notesEl: $("#notes"),
  });

  const dialogueUi = new DialogueUi({
    rootEl: $("#dlg"),
    speakerEl: $("#dlg .speaker"),
    textEl: $("#dlg .text"),
    choicesEl: $("#dlg .choices"),
  });

  const world = new World({
    canvas,
    onHotspotInteract: (hotspotId) => runtime.interact(hotspotId),
    onEmptyClick: (hit) => runtime.onEmptyClick(hit),
  });

  const runtime = new StoryRuntime({
    storage,
    content,
    world,
    hudUi,
    dialogueUi,
    caseUi,
  });

  world.onEnemyDown = (enemyId) => runtime.onEnemyDown(enemyId);

  const devUi = new DevUi({
    rootEl: $("#dev"),
    reloadBtn: $("#reloadContentBtn"),
    restartBtn: $("#restartBtn"),
    msgEl: $("#devMsg"),
    sceneEl: $("#dbgScene"),
    beatEl: $("#dbgBeat"),
    onReload: async () => {
      await runtime.reloadContent();
    },
    onRestart: async () => {
      await runtime.restartScene();
    },
  });

  runtime.onDebugChanged = ({ sceneId, beatId }) => devUi.setDebug(sceneId, beatId);

  document.addEventListener("keydown", (e) => {
    if (e.key === "`" || e.key === "~") devUi.toggle();
  });

  const actionBtn = $("#actionBtn");
  actionBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    runtime.action();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "f" || e.key === "F") runtime.action();
  });

  await runtime.start(DEFAULT_SCENE_PATH);

  // Let UI own these keybinds so they can close even during dialogue.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (dialogueUi.isOpen()) dialogueUi.close();
      caseUi.close();
    }
    if (e.key === "n" || e.key === "N") caseUi.toggle();
  });
}

boot().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  alert(`Noir3D failed to boot:\n\n${err?.message || err}`);
});

