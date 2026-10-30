import {
  coordsOf,
  inventory,
  onClientCallback,
  PendingActions,
  playersNear,
  PlayerState,
  stateString,
} from "@aicore-fivem/lib/server";
import {
  fail,
  logSafe,
  oneArg,
  readId,
  readText,
} from "@aicore-fivem/lib/shared";
import { FIREWORKS, HOLD_STATE, NEWS_ITEMS } from "common/items";
import { EVENTS, ITEMS, NOTE_MAX } from "common/small";
import { content } from "./content";

const hold = new PlayerState(HOLD_STATE, stateString);

/** The firework's progress on the client (3 s; lib `PendingActions` wants 80% of it). */
const FIREWORK_MS = 3000;
/** Item actions waiting for the player's client (the firework progress, the note dialog), one per player each. */
const fireworks = new PendingActions<string>();
const notes = new PendingActions<string>({ minRatio: 0 });

/** Fireworks: placed after the progress; the show goes to everyone within 400 m (scope candidates). */
onClientCallback(
  EVENTS.fireworkPlaced,
  { args: oneArg(readId), lock: true },
  (source, token) => {
    const item = fireworks.take(source, token);
    if (!item || !inventory.removeItem(source, item, 1))
      return fail("SMALL_ERR_FAR");
    const p = coordsOf(source);
    for (const player of playersNear(source, 400))
      emitNet(EVENTS.firework, player, p.x, p.y, p.z - 0.9, item);
    return { ok: true };
  },
);

/** A written notepad page becomes a note item carrying the text. */
onClientCallback(
  EVENTS.noteSave,
  {
    args: ([token, text]): [number, string] | null => {
      const id = readId(token);
      const note = readText(text, NOTE_MAX);
      return id !== null && note !== null ? [id, note] : null;
    },
    lock: true,
  },
  (source, token, text) => {
    if (!notes.take(source, token) || !content.settings.notepad)
      return fail("NOTE_ERR_FAILED");
    if (!inventory.hasItem(source, ITEMS.notepad))
      return fail("NOTE_ERR_FAILED");
    const metadata = { text, description: logSafe(text, 60) };
    if (!inventory.canCarryItem(source, ITEMS.note, 1, metadata))
      return fail("NOTE_ERR_FULL");
    return inventory.addItem(source, ITEMS.note, 1, metadata)
      ? { ok: true }
      : fail("NOTE_ERR_FAILED");
  },
);

inventory.registerUsableItem("binoculars", (source) => {
  if (content.settings.binoculars) emitNet(EVENTS.binoculars, source);
  return false;
});
// News items toggle what the player holds; every client attaches the prop from the player state.
for (const item of Object.keys(NEWS_ITEMS))
  inventory.registerUsableItem(item, (source) => {
    hold.set(source, hold.get(source) === item ? undefined : item);
    return false;
  });
for (const item of Object.keys(FIREWORKS))
  inventory.registerUsableItem(item, (source) => {
    if (
      !content.settings.fireworks ||
      GetVehiclePedIsIn(GetPlayerPed(String(source)), false)
    )
      return false;
    emitNet(
      EVENTS.fireworkPlace,
      source,
      fireworks.start(source, item, FIREWORK_MS),
    );
    return false;
  });
inventory.registerUsableItem(ITEMS.notepad, (source) => {
  if (content.settings.notepad)
    emitNet(EVENTS.noteWrite, source, notes.start(source, ITEMS.notepad, 0));
  return false;
});
inventory.registerUsableItem(ITEMS.note, (source, used) => {
  const text = used.metadata.text;
  if (typeof text === "string" && text) emitNet(EVENTS.noteRead, source, text);
  return false;
});
