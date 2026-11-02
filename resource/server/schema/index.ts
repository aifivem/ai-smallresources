import type { PanelSchema } from "@aifivem/shared";
import { discordFile, discordTab } from "./discord";
import { elevatorsFile, elevatorsTab } from "./elevators";
import {
  blipsFile,
  blipsTab,
  densityZonesFile,
  densityZonesTab,
} from "./mapRecords";
import { mooringsFile, mooringsTab } from "./moorings";
import { seatsFile, seatsTab } from "./seats";
import { settingsFile, settingsTab } from "./settings";
import { teleportsFile, teleportsTab } from "./teleports";
import { weaponsFile, weaponsTab } from "./weapons";

/** ai-smallresources' panel: feature switches, weapon rules, teleports, elevators, boat moorings, the seats on world objects, density zones, map blips and Discord Rich Presence. */
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
    weapons: weaponsFile,
    densityZones: densityZonesFile,
    blips: blipsFile,
  },
  tabs: [
    settingsTab,
    weaponsTab,
    teleportsTab,
    elevatorsTab,
    mooringsTab,
    seatsTab,
    densityZonesTab,
    blipsTab,
    discordTab,
  ],
};
