import {
  coordsOf,
  isNear,
  isOnline,
  onClientEvent,
  online,
  PlayerMap,
} from "@aicore-fivem/lib/server";
import { distance, oneArg, readId, type Vec3 } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/small";
import { content } from "./content";

/** A tackle reaches the target only when both stand within 3 m. */
onClientEvent(
  EVENTS.tackle,
  { args: oneArg(readId), rate: { count: 1, windowMs: 3000 } },
  (source, target) => {
    if (!content.settings.tackle || target === source || !isOnline(target))
      return;
    if (isNear(source, coordsOf(target), 3)) emitNet(EVENTS.tackled, target);
  },
);

/** AFK kick: a loaded player who has not moved for the panel's minutes (admins are never kicked). */
const still = new PlayerMap<Vec3 & { since: number }>();
setInterval(() => {
  const minutes = content.settings.afkMinutes;
  if (minutes <= 0) return still.clear();
  const now = Date.now();
  for (const source of online.sources()) {
    const p = coordsOf(source);
    const last = still.get(source);
    if (!last || distance(last, p) > 1) {
      still.set(source, { ...p, since: now });
      continue;
    }
    if (
      now - last.since < minutes * 60_000 ||
      Boolean(IsPlayerAceAllowed(String(source), "ai.admin"))
    )
      continue;
    still.delete(source);
    DropPlayer(String(source), Locale("SMALL_AFK_KICK", minutes));
  }
}, 60_000);
