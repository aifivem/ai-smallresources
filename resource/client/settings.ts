import { AdminWorld } from "@aicore-fivem/lib/client";
import { readDiscord } from "common/discord";
import { readMooring } from "common/places";
import { readSeat } from "common/seats";
import { readSettings } from "common/small";

const FILES = [
  "settings",
  "teleports",
  "elevators",
  "moorings",
  "seats",
  "discord",
];
type File =
  "settings" | "teleports" | "elevators" | "moorings" | "seats" | "discord";

/** The panel files every client module reads (kept current by the panel's views); `onContent(file)` runs after a change. */
export const world = new AdminWorld(FILES);
const settings = world.view("settings", readSettings);
const discord = world.view("discord", readDiscord);
export const content = {
  get settings() {
    return settings.value;
  },
  get discord() {
    return discord.value;
  },
  moorings: world.records("moorings", readMooring),
  seats: world.records("seats", readSeat),
};

export const onContent = (file: File, handler: () => void) =>
  world.onChange(file, handler);
export const onSettings = (handler: () => void) =>
  onContent("settings", handler);

/** The refusal shown when a reply is missing. */
export const FALLBACK = { fallback: "SMALL_ERR_FAR" };
