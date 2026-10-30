import { AdminWorld } from "@aicore-fivem/lib/client";
import { readElevators, readMoorings, readTeleports } from "common/places";
import { readSeats } from "common/seats";
import { readSettings } from "common/small";

const FILES = ["settings", "teleports", "elevators", "moorings", "seats"];
type File = "settings" | "teleports" | "elevators" | "moorings" | "seats";

/** The panel files every client module reads; `onContent(file)` handlers run after each change of that file. */
const world = new AdminWorld(FILES);
const read = {
  settings: () => readSettings(world.get("settings")),
  teleports: () => readTeleports(world.get("teleports")),
  elevators: () => readElevators(world.get("elevators")),
  moorings: () => readMoorings(world.get("moorings")),
  seats: () => readSeats(world.get("seats")),
};
export const content = {
  settings: read.settings(),
  teleports: read.teleports(),
  elevators: read.elevators(),
  moorings: read.moorings(),
  seats: read.seats(),
};
const handlers = new Map<File, Array<() => void>>();

for (const file of FILES as File[])
  world.onChange(file, () => {
    Object.assign(content, { [file]: read[file]() });
    for (const handler of handlers.get(file) ?? []) handler();
  });

export const onContent = (file: File, handler: () => void) =>
  handlers.set(file, [...(handlers.get(file) ?? []), handler]);
export const onSettings = (handler: () => void) =>
  onContent("settings", handler);
export const onTeleports = (handler: () => void) =>
  onContent("teleports", handler);
