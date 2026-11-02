import {
  cache,
  groundZ,
  onServerCallback,
  onServerEvent,
  player,
} from "@aifivem/lib/client";
import { readFinite } from "@aifivem/lib/shared";
import { EVENTS } from "common/small";

/** Metres under the ground that count as fallen through the map. */
const UNDER_GROUND = 2;
/** The ground is searched from this high above the player. */
const PROBE_UP = 150;

/** `/unstuck` asks first: is the player inside an interior (MLO / IPL) or below the ground? */
onServerCallback(EVENTS.unstuckCheck, () => {
  const ped = cache.ped;
  if (GetInteriorFromEntity(ped) !== 0) return true;
  const { x, y, z } = player.coords();
  const ground = groundZ(x, y, z + PROBE_UP);
  return ground !== null && z < ground - UNDER_GROUND;
});

/** The server's `/unstuck` point after the progress bar. */
onServerEvent(
  EVENTS.unstuck,
  {
    args: ([x, y, z, heading]) => {
      const p = [x, y, z, heading].map(readFinite);
      const [px, py, pz, ph] = p;
      return px != null && py != null && pz != null && ph != null
        ? [px, py, pz, ph]
        : null;
    },
  },
  (x, y, z, heading) => player.teleport({ x, y, z }, { heading }),
);
