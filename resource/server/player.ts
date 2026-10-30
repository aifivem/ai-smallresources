import { onClientEvent, online } from "@aicore-fivem/lib/server";
import { asArgs } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/small";
import { content, dist, pos } from "./content";

/** A tackle reaches the target only when both stand within 3 m. */
onClientEvent(
  EVENTS.tackle,
  {
    args: ([target]) =>
      asArgs(
        typeof target === "number" && Number.isInteger(target) ? target : null,
      ),
    rate: { count: 1, windowMs: 3000 },
  },
  (source, target) => {
    if (
      !content.settings.tackle ||
      target === source ||
      !GetPlayerName(String(target))
    )
      return;
    if (dist(pos(source), pos(target)) <= 3) emitNet(EVENTS.tackled, target);
  },
);

/** AFK kick: a loaded player who has not moved for the panel's minutes (admins are never kicked). */
const still = new Map<
  number,
  { x: number; y: number; z: number; since: number }
>();
setInterval(() => {
  const minutes = content.settings.afkMinutes;
  if (minutes <= 0) return still.clear();
  const now = Date.now();
  for (const source of online.sources()) {
    const p = pos(source);
    const last = still.get(source);
    if (!last || dist(last, p) > 1) {
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

on("playerDropped", () => still.delete(Number(globalThis.source)));
