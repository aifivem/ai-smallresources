import type { PanelSchema } from "@aicore-fivem/shared";
import { discordFile, discordTab } from "./discord";
import { elevatorsFile, elevatorsTab } from "./elevators";
import { mooringsFile, mooringsTab } from "./moorings";
import { seatsFile, seatsTab } from "./seats";
import { settingsFile, settingsTab } from "./settings";
import { teleportsFile, teleportsTab } from "./teleports";

/** ai-smallresources' panel: feature switches, teleports, elevators, boat moorings, the seats on world objects and Discord Rich Presence. */
export const smallSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "sliders",
  files: {
    settings: settingsFile,
    teleports: teleportsFile,
    elevators: elevatorsFile,
    moorings: mooringsFile,
    seats: seatsFile,
    discord: discordFile,
  },
  tabs: [
    settingsTab,
    teleportsTab,
    elevatorsTab,
    mooringsTab,
    seatsTab,
    discordTab,
  ],
};
