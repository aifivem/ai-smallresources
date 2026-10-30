import { fadeOut, loadLocaleTexts, notify, Points, triggerServerCallback } from "@aicore-fivem/lib/client";
import { record, sleep } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/small";
import { content, onTeleports } from "./settings";

const texts = loadLocaleTexts();

/** A point at both ends of every teleport; the server moves the player to the other end behind a fade. */
const points = new Points();
function rebuild(): void {
  points.clear();
  for (const teleport of content.teleports.values())
    for (const end of ["from", "to"] as const)
      points.add(`tp:${teleport.id}:${end}`, { coords: teleport[end], label: Locale("SMALL_PROMPT_TELEPORT", teleport.label), icon: "location-dot", radius: 1.5, interval: 400, onPressed: () => use(teleport.id, end) });
}

async function use(id: string, end: "from" | "to"): Promise<void> {
  await fadeOut(300);
  const result = record(await triggerServerCallback(EVENTS.teleport, [id, end]).catch(() => null));
  if (result.ok !== true) {
    const key = typeof result.error === "string" ? result.error : "SMALL_ERR_FAR";
    notify(texts[key] ?? key, "error");
  } else await sleep(500);
  DoScreenFadeIn(300);
}

rebuild();
onTeleports(rebuild);
