import { Blips } from "@aifivem/lib/client";
import { RecordObjects } from "@aifivem/lib/shared";
import { readMapBlip } from "common/mapRecords";
import { content, onSettings, world } from "./settings";

/** Map blips of the Blips tab: one blip per record, rebuilt per edit; none while the switch is off. */
const blips = new Blips();
const objects = new RecordObjects(world, "blips", readMapBlip, (id, blip) => {
  if (!content.settings.mapBlips) return;
  blips.add(id, {
    coords: blip.point,
    label: blip.label,
    ...blip.style,
    shortRange: blip.shortRange,
  });
  return () => blips.remove(id);
});

let on = content.settings.mapBlips;
onSettings(() => {
  if (on === content.settings.mapBlips) return;
  on = content.settings.mapBlips;
  objects.rebuildAll();
});
