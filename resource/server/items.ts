import {
  inventory,
  onClientCallback,
  PlayerState,
  stateString,
} from "@aicore-fivem/lib/server";
import { asArgs, logSafe } from "@aicore-fivem/lib/shared";
import { FIREWORKS, HOLD_STATE, NEWS_ITEMS } from "common/items";
import { EVENTS, ITEMS, NOTE_MAX } from "common/small";
import { content, dist, fail, pos } from "./content";

const hold = new PlayerState(HOLD_STATE, stateString);

/** Item actions waiting for the player's client (a progress, a dialog), one per player. */
class Pending {
  private readonly waiting = new Map<
    number,
    { token: number; item: string; startedAt: number }
  >();
  private next = 0;

  start(source: number, item: string): number {
    const token = ++this.next;
    this.waiting.set(source, { token, item, startedAt: Date.now() });
    return token;
  }

  /** The item of a pending action when the token matches and at least `minMs` passed; it ends the action. */
  take(source: number, token: number, minMs: number): string | null {
    const wait = this.waiting.get(source);
    if (!wait || wait.token !== token) return null;
    this.waiting.delete(source);
    return Date.now() - wait.startedAt >= minMs ? wait.item : null;
  }

  drop(source: number): void {
    this.waiting.delete(source);
  }
}
const fireworks = new Pending();
const notes = new Pending();

/** Fireworks: placed after the progress; the show goes to everyone within 400 m. */
onClientCallback(
  EVENTS.fireworkPlaced,
  {
    args: ([token]) => asArgs(typeof token === "number" ? token : null),
    lock: true,
  },
  (source, token) => {
    const item = fireworks.take(source, token, 2400);
    if (!item || !inventory.removeItem(source, item, 1))
      return fail("SMALL_ERR_FAR");
    const p = pos(source);
    for (const player of getPlayers())
      if (dist(pos(Number(player)), p) <= 400)
        emitNet(EVENTS.firework, Number(player), p.x, p.y, p.z - 0.9, item);
    return { ok: true };
  },
);

/** A written notepad page becomes a note item carrying the text. */
onClientCallback(
  EVENTS.noteSave,
  {
    args: ([token, text]): [number, string] | null =>
      typeof token === "number" && typeof text === "string" && text.trim()
        ? [token, text.trim().slice(0, NOTE_MAX)]
        : null,
    lock: true,
  },
  (source, token, text) => {
    if (!notes.take(source, token, 0) || !content.settings.notepad)
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
    emitNet(EVENTS.fireworkPlace, source, fireworks.start(source, item));
    return false;
  });
inventory.registerUsableItem(ITEMS.notepad, (source) => {
  if (content.settings.notepad)
    emitNet(EVENTS.noteWrite, source, notes.start(source, ITEMS.notepad));
  return false;
});
inventory.registerUsableItem(ITEMS.note, (source, used) => {
  const text = used.metadata.text;
  if (typeof text === "string" && text) emitNet(EVENTS.noteRead, source, text);
  return false;
});

on("playerDropped", () => {
  const source = Number(globalThis.source);
  fireworks.drop(source);
  notes.drop(source);
});
