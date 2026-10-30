import { AdminPanel } from "@aicore-fivem/lib/server";
import { readElevators, readMoorings, readTeleports } from "common/places";
import { readSettings } from "common/small";
import { smallSchema } from "./schema";

export const panel = new AdminPanel(smallSchema);
/** Panel content, parsed again after every change. */
export const content = {
  settings: readSettings(panel.get("settings")),
  teleports: readTeleports(panel.get("teleports")),
  elevators: readElevators(panel.get("elevators")),
  moorings: readMoorings(panel.get("moorings")),
};
panel.onChange(
  "settings",
  () => (content.settings = readSettings(panel.get("settings"))),
);
panel.onChange(
  "teleports",
  () => (content.teleports = readTeleports(panel.get("teleports"))),
);
panel.onChange(
  "elevators",
  () => (content.elevators = readElevators(panel.get("elevators"))),
);
panel.onChange(
  "moorings",
  () => (content.moorings = readMoorings(panel.get("moorings"))),
);

export const fail = (error: string) => ({ ok: false as const, error });
export const pos = (source: number) => {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  return { x, y, z };
};
export const entityPos = (entity: number) => {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(entity);
  return { x, y, z };
};
export const dist = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
