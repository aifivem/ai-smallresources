import { isNear, onClientCallback, online } from "@aicore-fivem/lib/server";
import { fail, readInt, readText } from "@aicore-fivem/lib/shared";
import { EVENTS } from "common/small";
import { content } from "./content";

const hasJob = (source: number, job: string) =>
  !job || online.jobs(source).includes(job);

/** A teleport: the server checks the end the player stands at and answers the other one; the client teleports. */
onClientCallback(
  EVENTS.teleport,
  {
    args: ([id, end]): [string, "from" | "to"] | null => {
      const key = readText(id, 64);
      return key !== null && (end === "from" || end === "to")
        ? [key, end]
        : null;
    },
    lock: true,
  },
  (source, id, end) => {
    const teleport = content.teleports.get(id);
    if (!teleport || !isNear(source, teleport[end], 3))
      return fail("SMALL_ERR_FAR");
    if (!hasJob(source, teleport.job)) return fail("SMALL_ERR_JOB");
    return { ok: true, to: end === "from" ? teleport.to : teleport.from };
  },
);

/** An elevator ride: the player stands at the floor they ride from; the floor they go to may need a job. */
onClientCallback(
  EVENTS.elevator,
  {
    args: ([id, from, to]): [string, number, number] | null => {
      const key = readText(id, 64);
      const a = readInt(from, 0, 63);
      const b = readInt(to, 0, 63);
      return key !== null && a !== null && b !== null ? [key, a, b] : null;
    },
    lock: true,
  },
  (source, id, from, to) => {
    const elevator = content.elevators.get(id);
    const start = elevator?.floors[from];
    const floor = elevator?.floors[to];
    if (!start || !floor || from === to || !isNear(source, start.point, 3))
      return fail("SMALL_ERR_FAR");
    if (!hasJob(source, floor.job)) return fail("SMALL_ERR_JOB");
    return { ok: true, to: floor.point };
  },
);
