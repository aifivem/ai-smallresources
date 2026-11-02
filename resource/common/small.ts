import { bool, int, record } from "@aifivem/lib/shared";
import { type Area, EMERGENCY_AREAS, readAreaList } from "./areas";
import { type FeatureSettings, readFeatureSettings } from "./features";

/** ai-smallresources' contracts and panel settings. No natives. */

export const EVENTS = {
  /** Client -> server: (targetServerId) tackle the player in front. */
  tackle: "ai-smallresources:tackle",
  /** Server -> tackled player: () fall down. */
  tackled: "ai-smallresources:client:tackled",
  /** Callback: (teleportId, end: "from" | "to") -> { ok, to: Vec4 } the other end, the client teleports there. */
  teleport: "ai-smallresources:teleport",
  /** Callback: (elevatorId, from, to) -> { ok, to: Vec4 } ride from one floor index to another (the client teleports). */
  elevator: "ai-smallresources:elevator",
  /** Server -> player: () the binoculars item was used. */
  binoculars: "ai-smallresources:client:binoculars",
  /** Server -> players nearby: (x, y, z, item) a firework item goes off there. */
  firework: "ai-smallresources:client:firework",
  /** Callback: () -> { ok } pick up the nearest player, or put the carried one down. */
  carry: "ai-smallresources:carry",
  /** Server callback to the player asked: (carrierName) -> boolean they agree to be carried. */
  carryAsk: "ai-smallresources:client:carryAsk",
  /** Server -> player: (token) write a page of the notepad. */
  noteWrite: "ai-smallresources:client:noteWrite",
  /** Callback: (token, text) -> { ok } tear the written page off as a note item. */
  noteSave: "ai-smallresources:noteSave",
  /** Server -> player: (text) read a note item. */
  noteRead: "ai-smallresources:client:noteRead",
  /** Callback: (netId) -> { ok } moor the boat at the nearest mooring, or untie it. */
  moor: "ai-smallresources:moor",
  /** Server -> player: (air: number | null) the dive gear is on with this many seconds of air, or off (null). */
  diveGear: "ai-smallresources:client:diveGear",
  /** Client -> server: (air) seconds of air left in the worn tank (every 10 s underwater and at 0). */
  diveAir: "ai-smallresources:diveAir",
  /** Server callback to the player: () -> { swimming, underwater } before putting on the gear or refilling. */
  diveWater: "ai-smallresources:client:diveWater",
  /** Client -> server: (netId, mode | null) push a vehicle (`PushMode`), or stop. */
  push: "ai-smallresources:push",
  /** Callback: (netId) -> { ok } flip the overturned vehicle back onto its wheels after a progress bar. */
  flip: "ai-smallresources:flip",
  /** Server -> the vehicle's owner: (netId) put it back on its wheels. */
  flipped: "ai-smallresources:client:flipped",
  /** Server callback to the player: () -> boolean the player is inside an interior or below the ground. */
  unstuckCheck: "ai-smallresources:client:unstuckCheck",
  /** Server -> player: (x, y, z, heading) `/unstuck` finished, go there. */
  unstuck: "ai-smallresources:client:unstuck",
} as const;

/** Player state keys (server written): who a player carries, who carries them (server ids). */
export const CARRY_STATE = { carrying: "aiCarrying", carriedBy: "aiCarriedBy" };
/** Vehicle state keys (server written): the plate under a fake one, a boat tied to a mooring. */
export const VEHICLE_STATE = {
  realPlate: "aiRealPlate",
  moored: "aiMoored",
  /** How a vehicle is pushed (`PushMode`); its owner's client moves it. */
  push: "aiPush",
};
/** GlobalState key: no ambient peds or traffic anywhere (exports `SetNpcDisabled` / `IsNpcDisabled`). */
export const NPC_DISABLED = "aiNpcDisabled";

/** A pushed vehicle: pushed from the front (it rolls back) or the back, wheels turned left, right or straight. */
export type PushMode = "f" | "fl" | "fr" | "b" | "bl" | "br";
const PUSH_MODES: readonly string[] = ["f", "fl", "fr", "b", "bl", "br"];
export const readPushMode = (v: unknown): PushMode | undefined =>
  typeof v === "string" && PUSH_MODES.includes(v) ? (v as PushMode) : undefined;
/** Items the features use. */
export const ITEMS = {
  fakePlate: "fakeplate",
  notepad: "notepad",
  note: "note",
  divingGear: "diving_gear",
  divingFill: "diving_fill",
};
/** Longest note text. */
export const NOTE_MAX = 500;

export interface Settings extends FeatureSettings {
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
  /** No police, ambulance, fire or army vehicles and peds from GTA's population, none at all in `emergencyAreas`. */
  noEmergencySpawns: boolean;
  emergencyAreas: Area[];
  noAircraft: boolean;
  noPoliceAudio: boolean;
  quietAmbience: boolean;
  noGarbageTrucks: boolean;
  noIdleCam: boolean;
  noStealth: boolean;
  sprintIndoors: boolean;
  noAutoHelmet: boolean;
  keepProps: boolean;
  noActionMode: boolean;
  noPistolWhip: boolean;
  noCoverPeek: boolean;
  noCriticalHits: boolean;
  noBunnyHop: boolean;
  noPickups: boolean;
  noVehicleRewards: boolean;
  noMouseSteer: boolean;
  noAirControl: boolean;
  /** An open hood or trunk breaks off above this speed (km/h) or once the body is damaged. */
  breakDoors: boolean;
  breakDoorsSpeed: number;
  /** NPC melee damage (fists, bats, knives) in percent of GTA's normal. */
  npcMelee: boolean;
  npcMeleeDamage: number;
  /** Ambient population in percent of GTA's normal (100 = untouched). */
  pedDensity: number;
  scenarioDensity: number;
  trafficDensity: number;
  parkedDensity: number;
  tackle: boolean;
  point: boolean;
  handsUp: boolean;
  ragdoll: boolean;
  carry: boolean;
  sit: boolean;
  antiPeek: boolean;
  /** Minutes without moving before a player is kicked (0 = off). */
  afkMinutes: number;
  binoculars: boolean;
  fireworks: boolean;
  notepad: boolean;
  diveGear: boolean;
  /** Seconds of air a full tank holds (spent only underwater). */
  diveAir: number;
  /** Seconds putting the gear on or taking it off takes. */
  diveWearSeconds: number;
  /** Seconds refilling the tank takes. */
  diveFillSeconds: number;
}

export function readSettings(raw: unknown): Settings {
  const v = record(raw);
  const percent = (value: unknown, fallback: number) =>
    int(value, fallback, 0, 100);
  return {
    ...readFeatureSettings(v),
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
    noEmergencySpawns: bool(v.noEmergencySpawns, true),
    emergencyAreas: readAreaList(v.emergencyAreas, EMERGENCY_AREAS),
    noAircraft: bool(v.noAircraft, true),
    noPoliceAudio: bool(v.noPoliceAudio, true),
    quietAmbience: bool(v.quietAmbience, true),
    noGarbageTrucks: bool(v.noGarbageTrucks, true),
    noIdleCam: bool(v.noIdleCam, true),
    noStealth: bool(v.noStealth, true),
    sprintIndoors: bool(v.sprintIndoors, true),
    noAutoHelmet: bool(v.noAutoHelmet, true),
    keepProps: bool(v.keepProps, true),
    noActionMode: bool(v.noActionMode, true),
    noPistolWhip: bool(v.noPistolWhip, true),
    noCoverPeek: bool(v.noCoverPeek, true),
    noCriticalHits: bool(v.noCriticalHits, false),
    noBunnyHop: bool(v.noBunnyHop, true),
    noPickups: bool(v.noPickups, true),
    noVehicleRewards: bool(v.noVehicleRewards, true),
    noMouseSteer: bool(v.noMouseSteer, true),
    noAirControl: bool(v.noAirControl, true),
    breakDoors: bool(v.breakDoors, true),
    breakDoorsSpeed: int(v.breakDoorsSpeed, 30, 5, 300),
    npcMelee: bool(v.npcMelee, true),
    npcMeleeDamage: int(v.npcMeleeDamage, 35, 0, 500),
    pedDensity: percent(v.pedDensity, 80),
    scenarioDensity: percent(v.scenarioDensity, 80),
    trafficDensity: percent(v.trafficDensity, 80),
    parkedDensity: percent(v.parkedDensity, 80),
    tackle: bool(v.tackle, true),
    point: bool(v.point, true),
    handsUp: bool(v.handsUp, true),
    ragdoll: bool(v.ragdoll, true),
    carry: bool(v.carry, true),
    sit: bool(v.sit, true),
    antiPeek: bool(v.antiPeek, true),
    afkMinutes: int(v.afkMinutes, 20, 0, 600),
    binoculars: bool(v.binoculars, true),
    fireworks: bool(v.fireworks, true),
    notepad: bool(v.notepad, true),
    diveGear: bool(v.diveGear, true),
    diveAir: int(v.diveAir, 100, 10, 3600),
    diveWearSeconds: int(v.diveWearSeconds, 5, 1, 60),
    diveFillSeconds: int(v.diveFillSeconds, 5, 1, 60),
  };
}
