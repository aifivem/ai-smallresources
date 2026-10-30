import {
  AdminPanel,
  inventory,
  onClientCallback,
  onClientEvent,
  online,
  resourceExport,
} from "@aicore-fivem/lib/server";
import { asArgs } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import {
  EVENTS,
  FIREWORKS,
  HOLD_STATE,
  NEWS_ITEMS,
  readSettings,
  readTeleports,
} from "common/small";
import { smallSchema } from "./schema";

const core = resourceExport("ai-core");
const panel = new AdminPanel(smallSchema);
/** Panel content, parsed again after every change. */
const content = {
  settings: readSettings(panel.get("settings")),
  teleports: readTeleports(panel.get("teleports")),
};
panel.onChange(
  "settings",
  () => (content.settings = readSettings(panel.get("settings"))),
);
panel.onChange(
  "teleports",
  () => (content.teleports = readTeleports(panel.get("teleports"))),
);

const fail = (error: string) => ({ ok: false as const, error });
const pos = (source: number) => {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  return { x, y, z };
};
const dist = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** A tackle reaches the target only when both stand within 3 m. */
onClientEvent(
  EVENTS.tackle,
  {
    args: ([target]) =>
      asArgs(
        typeof target === "number" && Number.isInteger(target) ? target : null,
      ),
    rate: { count: 1, windowMs: 3000 },
  },
  (source, target) => {
    if (
      !content.settings.tackle ||
      target === source ||
      !GetPlayerName(String(target))
    )
      return;
    if (dist(pos(source), pos(target)) <= 3) emitNet(EVENTS.tackled, target);
  },
);

onClientCallback(
  EVENTS.teleport,
  {
    args: ([id, end]): [string, "from" | "to"] | null =>
      typeof id === "string" && (end === "from" || end === "to")
        ? [id, end]
        : null,
    lock: true,
  },
  (source, id, end) => {
    const teleport = content.teleports.get(id);
    if (!teleport || dist(pos(source), teleport[end]) > 3)
      return fail("SMALL_ERR_FAR");
    if (
      teleport.job &&
      !(core.GetJobs(source) ?? []).some((m) => m.job === teleport.job)
    )
      return fail("SMALL_ERR_JOB");
    const to = end === "from" ? teleport.to : teleport.from;
    const ped = GetPlayerPed(String(source));
    SetEntityCoords(ped, to.x, to.y, to.z, false, false, false, false);
    SetEntityHeading(ped, to.heading);
    return { ok: true };
  },
);

/** Fireworks waiting for their placing progress; the show goes to everyone within 400 m. */
const placing = new Map<
  number,
  { token: number; item: string; startedAt: number }
>();
let nextToken = 0;

onClientCallback(
  EVENTS.fireworkPlaced,
  {
    args: ([token]) => asArgs(typeof token === "number" ? token : null),
    lock: true,
  },
  (source, token) => {
    const place = placing.get(source);
    if (!place || place.token !== token) return fail("SMALL_ERR_FAR");
    placing.delete(source);
    if (
      Date.now() - place.startedAt < 2400 ||
      !inventory.removeItem(source, place.item, 1)
    )
      return fail("SMALL_ERR_FAR");
    const p = pos(source);
    for (const player of getPlayers())
      if (dist(pos(Number(player)), p) <= 400)
        emitNet(
          EVENTS.firework,
          Number(player),
          p.x,
          p.y,
          p.z - 0.9,
          place.item,
        );
    return { ok: true };
  },
);

function registerItems(): void {
  inventory.registerUsableItem("binoculars", (source: number) => {
    if (content.settings.binoculars) emitNet(EVENTS.binoculars, source);
    return false;
  });
  // News items toggle what the player holds; every client attaches the prop from the player state.
  for (const item of Object.keys(NEWS_ITEMS))
    inventory.registerUsableItem(item, (source: number) => {
      const state = Player(source).state;
      state.set(HOLD_STATE, state[HOLD_STATE] === item ? false : item, true);
      return false;
    });
  for (const item of Object.keys(FIREWORKS))
    inventory.registerUsableItem(item, (source: number) => {
      if (
        !content.settings.fireworks ||
        GetVehiclePedIsIn(GetPlayerPed(String(source)), false)
      )
        return false;
      const token = ++nextToken;
      placing.set(source, { token, item, startedAt: Date.now() });
      emitNet(EVENTS.fireworkPlace, source, token);
      return false;
    });
}
registerItems();

/** AFK kick: a loaded player who has not moved for the panel's minutes (admins are never kicked). */
const still = new Map<
  number,
  { x: number; y: number; z: number; since: number }
>();
setInterval(() => {
  const minutes = content.settings.afkMinutes;
  if (minutes <= 0) return still.clear();
  const now = Date.now();
  for (const source of online.sources()) {
    const p = pos(source);
    const last = still.get(source);
    if (!last || dist(last, p) > 1) {
      still.set(source, { ...p, since: now });
      continue;
    }
    if (
      now - last.since < minutes * 60_000 ||
      Boolean(IsPlayerAceAllowed(String(source), "ai.admin"))
    )
      continue;
    still.delete(source);
    DropPlayer(String(source), Locale("SMALL_AFK_KICK", minutes));
  }
}, 60_000);

on("playerDropped", () => {
  const source = Number(globalThis.source);
  still.delete(source);
  placing.delete(source);
});
