import {
  fadeOut,
  menu,
  Points,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { sleep } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import type { Elevator } from "common/places";
import { EVENTS } from "common/small";
import { answered } from "./feedback";
import { content, onContent } from "./settings";

/** A point on every floor of every elevator; the menu lists the other floors, the server moves the player. */
const points = new Points();
function rebuild(): void {
  points.clear();
  for (const elevator of content.elevators.values())
    elevator.floors.forEach((floor, index) =>
      points.add(`lift:${elevator.id}:${index}`, {
        coords: floor.point,
        label: Locale("ELEVATOR_PROMPT", elevator.label),
        icon: "elevator",
        radius: 1.5,
        onPressed: () => ride(elevator, index),
      }),
    );
}

async function ride(elevator: Elevator, from: number): Promise<void> {
  const picked = await menu({
    title: elevator.label,
    items: elevator.floors.map((floor, index) => ({
      id: String(index),
      label: floor.label,
      icon: index === from ? "location-dot" : "elevator",
      description: index === from ? Locale("ELEVATOR_HERE") : undefined,
      disabled: index === from,
    })),
  });
  if (picked === null) return;
  await fadeOut(300);
  const ok = answered(
    await triggerServerCallback(EVENTS.elevator, [
      elevator.id,
      from,
      Number(picked),
    ]).catch(() => null),
  );
  if (ok) await sleep(500);
  DoScreenFadeIn(300);
}

rebuild();
onContent("elevators", rebuild);
