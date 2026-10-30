import { bool, int, record } from "@aicore-fivem/lib/shared";

/** ai-smallresources' contracts and panel settings. No natives. */

export const EVENTS = {
  /** Client -> server: (targetServerId) tackle the player in front. */
  tackle: "ai-smallresources:tackle",
  /** Server -> tackled player: () fall down. */
  tackled: "ai-smallresources:client:tackled",
  /** Callback: (teleportId, end: "from" | "to") -> { ok } go to the other end. */
  teleport: "ai-smallresources:teleport",
  /** Callback: (elevatorId, from, to) -> { ok } ride from one floor index to another. */
  elevator: "ai-smallresources:elevator",
  /** Server -> player: () the binoculars item was used. */
  binoculars: "ai-smallresources:client:binoculars",
  /** Server -> player: (token) place the firework (progress). */
  fireworkPlace: "ai-smallresources:client:fireworkPlace",
  /** Callback: (token) -> { ok } the firework is placed. */
  fireworkPlaced: "ai-smallresources:fireworkPlaced",
  /** Server -> players nearby: (x, y, z, item) a firework item goes off there. */
  firework: "ai-smallresources:client:firework",
  /** Callback: () -> { ok } pick up the nearest player, or put the carried one down. */
  carry: "ai-smallresources:carry",
  /** Server callback to the player asked: (carrierName) -> boolean they agree to be carried. */
  carryAsk: "ai-smallresources:client:carryAsk",
  /** Server -> player: (token, netId, removing) work on the plate of that vehicle (progress). */
  plateWork: "ai-smallresources:client:plateWork",
  /** Callback: (token) -> { ok } the plate work is done. */
  plateDone: "ai-smallresources:plateDone",
  /** Server -> player: (token) write a page of the notepad. */
  noteWrite: "ai-smallresources:client:noteWrite",
  /** Callback: (token, text) -> { ok } tear the written page off as a note item. */
  noteSave: "ai-smallresources:noteSave",
  /** Server -> player: (text) read a note item. */
  noteRead: "ai-smallresources:client:noteRead",
  /** Callback: (netId) -> { ok } moor the boat at the nearest mooring, or untie it. */
  moor: "ai-smallresources:moor",
} as const;

/** Player state keys (server written): who a player carries, who carries them (server ids). */
export const CARRY_STATE = { carrying: "aiCarrying", carriedBy: "aiCarriedBy" };
/** Vehicle state keys (server written): the plate under a fake one, a boat tied to a mooring. */
export const VEHICLE_STATE = { realPlate: "aiRealPlate", moored: "aiMoored" };
/** Items the features use. */
export const ITEMS = {
  fakePlate: "fakeplate",
  notepad: "notepad",
  note: "note",
};
/** Longest note text. */
export const NOTE_MAX = 500;

export interface Settings {
  seatbelt: boolean;
  /** km/h above which a crash throws the driver through the windscreen, without and with the belt. */
  ejectUnbelted: number;
  ejectBelted: number;
  cruise: boolean;
  crouch: boolean;
  noShuffle: boolean;
  noRadio: boolean;
  fakePlate: boolean;
  boatRope: boolean;
  noDispatch: boolean;
  hideHud: boolean;
  /** Ambient population in percent of GTA's normal (100 = untouched). */
  pedDensity: number;
  scenarioDensity: number;
  trafficDensity: number;
  parkedDensity: number;
  tackle: boolean;
  point: boolean;
  carry: boolean;
  sit: boolean;
  antiPeek: boolean;
  /** Minutes without moving before a player is kicked (0 = off). */
  afkMinutes: number;
  binoculars: boolean;
  fireworks: boolean;
  notepad: boolean;
}

export function readSettings(raw: unknown): Settings {
  const v = record(raw);
  const percent = (value: unknown, fallback: number) =>
    int(value, fallback, 0, 100);
  return {
    seatbelt: bool(v.seatbelt, true),
    ejectUnbelted: int(v.ejectUnbelted, 20, 0, 500),
    ejectBelted: int(v.ejectBelted, 160, 0, 500),
    cruise: bool(v.cruise, true),
    crouch: bool(v.crouch, true),
    noShuffle: bool(v.noShuffle, true),
    noRadio: bool(v.noRadio, false),
    fakePlate: bool(v.fakePlate, true),
    boatRope: bool(v.boatRope, true),
    noDispatch: bool(v.noDispatch, true),
    hideHud: bool(v.hideHud, true),
    pedDensity: percent(v.pedDensity, 80),
    scenarioDensity: percent(v.scenarioDensity, 80),
    trafficDensity: percent(v.trafficDensity, 80),
    parkedDensity: percent(v.parkedDensity, 80),
    tackle: bool(v.tackle, true),
    point: bool(v.point, true),
    carry: bool(v.carry, true),
    sit: bool(v.sit, true),
    antiPeek: bool(v.antiPeek, true),
    afkMinutes: int(v.afkMinutes, 20, 0, 600),
    binoculars: bool(v.binoculars, true),
    fireworks: bool(v.fireworks, true),
    notepad: bool(v.notepad, true),
  };
}
