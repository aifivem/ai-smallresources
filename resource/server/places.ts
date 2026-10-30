import { onClientCallback, resourceExport } from "@aicore-fivem/lib/server";
import type { Vec4 } from "@aicore-fivem/lib/shared";
import { EVENTS } from "common/small";
import { content, dist, fail, pos } from "./content";

const core = resourceExport("ai-core");

const hasJob = (source: number, job: string) =>
  !job || (core.GetJobs(source) ?? []).some((m) => m.job === job);

function moveTo(source: number, to: Vec4): void {
  const ped = GetPlayerPed(String(source));
  SetEntityCoords(ped, to.x, to.y, to.z, false, false, false, false);
  SetEntityHeading(ped, to.heading);
}

onClientCallback(
  EVENTS.teleport,
  {
    args: ([id, end]): [string, "from" | "to"] | null =>
      typeof id === "string" && (end === "from" || end === "to")
        ? [id, end]
        : null,
    lock: true,
  },
  (source, id, end) => {
    const teleport = content.teleports.get(id);
    if (!teleport || dist(pos(source), teleport[end]) > 3)
      return fail("SMALL_ERR_FAR");
    if (!hasJob(source, teleport.job)) return fail("SMALL_ERR_JOB");
    moveTo(source, end === "from" ? teleport.to : teleport.from);
    return { ok: true };
  },
);

/** An elevator ride: the player stands at the floor they ride from; the floor they go to may need a job. */
onClientCallback(
  EVENTS.elevator,
  {
    args: ([id, from, to]): [string, number, number] | null =>
      typeof id === "string" &&
      Number.isInteger(from) &&
      Number.isInteger(to) &&
      typeof from === "number" &&
      typeof to === "number"
        ? [id, from, to]
        : null,
    lock: true,
  },
  (source, id, from, to) => {
    const elevator = content.elevators.get(id);
    const start = elevator?.floors[from];
    const floor = elevator?.floors[to];
    if (!start || !floor || from === to || dist(pos(source), start.point) > 3)
      return fail("SMALL_ERR_FAR");
    if (!hasJob(source, floor.job)) return fail("SMALL_ERR_JOB");
    moveTo(source, floor.point);
    return { ok: true };
  },
);
