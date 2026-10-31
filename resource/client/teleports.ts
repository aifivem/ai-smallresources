import {
  allows,
  callAction,
  fadeIn,
  fadeOut,
  onMembershipChange,
  player,
  Points,
} from "@aicore-fivem/lib/client";
import { isRecord, RecordObjects, vec4 } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { readTeleport } from "common/places";
import { EVENTS } from "common/small";
import { FALLBACK, world } from "./settings";

/** Runs a move action behind a fade: the server checks it and answers the target, the client teleports there. */
export async function moveBy(name: string, args: unknown[]): Promise<void> {
  await fadeOut(300);
  const reply = await callAction(name, args, FALLBACK);
  if (!reply || !isRecord(reply.to)) return fadeIn(300);
  const to = vec4(reply.to, { x: 0, y: 0, z: 0, heading: 0 });
  await player.teleport(to, { heading: to.heading });
}

/**
 * A point at both ends of every teleport (only for who passes its access rule); the player goes to the other end
 * behind a fade. An edited teleport rebuilds only its own points.
 */
const points = new Points();
new RecordObjects(world, "teleports", readTeleport, (id, teleport) => {
  for (const end of ["from", "to"] as const)
    points.add(`tp:${id}:${end}`, {
      coords: teleport[end],
      label: Locale("SMALL_PROMPT_TELEPORT", teleport.label),
      icon: "location-dot",
      radius: 1.5,
      interval: 400,
      canShow: () => allows(teleport.access),
      onPressed: () => moveBy(EVENTS.teleport, [id, end]),
    });
  return () => {
    points.remove(`tp:${id}:from`);
    points.remove(`tp:${id}:to`);
  };
});
onMembershipChange(() => points.refresh());
