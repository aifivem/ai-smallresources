import { AdminPanel } from "@aicore-fivem/lib/server";
import { readDiscord } from "common/discord";
import { readElevator, readMooring, readTeleport } from "common/places";
import { readSettings } from "common/small";
import { smallSchema } from "./schema";

export const panel = new AdminPanel(smallSchema);
const settings = panel.view("settings", readSettings);
const discord = panel.view("discord", readDiscord);
/** Panel content, kept current by the panel's views. */
export const content = {
  get settings() {
    return settings.value;
  },
  get discord() {
    return discord.value;
  },
  teleports: panel.records("teleports", readTeleport),
  elevators: panel.records("elevators", readElevator),
  moorings: panel.records("moorings", readMooring),
};
