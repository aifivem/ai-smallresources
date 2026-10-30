import { callAction, fadeOut, player, Points } from "@aicore-fivem/lib/client";
import { isRecord, vec4 } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/small";
import { content, FALLBACK, onTeleports } from "./settings";

/** Runs a move action behind a fade: the server checks it and answers the target, the client teleports there. */
export async function moveBy(name: string, args: unknown[]): Promise<void> {
  await fadeOut(300);
  const reply = await callAction(name, args, FALLBACK);
  if (!reply || !isRecord(reply.to)) return DoScreenFadeIn(300);
  const to = vec4(reply.to, { x: 0, y: 0, z: 0, heading: 0 });
  await player.teleport(to, { heading: to.heading });
}

/** A point at both ends of every teleport; the player goes to the other end behind a fade. */
const points = new Points();
function rebuild(): void {
  points.clear();
  for (const teleport of content.teleports.values())
    for (const end of ["from", "to"] as const)
      points.add(`tp:${teleport.id}:${end}`, {
        coords: teleport[end],
        label: Locale("SMALL_PROMPT_TELEPORT", teleport.label),
        icon: "location-dot",
        radius: 1.5,
        interval: 400,
        onPressed: () => moveBy(EVENTS.teleport, [teleport.id, end]),
      });
}

rebuild();
onTeleports(rebuild);
