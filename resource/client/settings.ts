import { AdminWorld } from "@aicore-fivem/lib/client";
import { readSettings, readTeleports } from "common/small";

/** The panel files every client module reads; `onSettings` handlers run after each change. */
const world = new AdminWorld(["settings", "teleports"]);
export const content = { settings: readSettings(world.get("settings")), teleports: readTeleports(world.get("teleports")) };
const settingsHandlers: Array<() => void> = [];
const teleportHandlers: Array<() => void> = [];

world.onChange("settings", () => {
  content.settings = readSettings(world.get("settings"));
  for (const handler of settingsHandlers) handler();
});
world.onChange("teleports", () => {
  content.teleports = readTeleports(world.get("teleports"));
  for (const handler of teleportHandlers) handler();
});

export const onSettings = (handler: () => void) => settingsHandlers.push(handler);
export const onTeleports = (handler: () => void) => teleportHandlers.push(handler);
