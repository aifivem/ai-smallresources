import { menu, Points } from "@aicore-fivem/lib/client";
import { RecordObjects } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { readElevator, type Elevator } from "common/places";
import { EVENTS } from "common/small";
import { world } from "./settings";
import { moveBy } from "./teleports";

/** A point on every floor of every elevator; the menu lists the other floors, the server checks the ride. */
const points = new Points();
/** An edited elevator rebuilds only its own floor points. */
new RecordObjects(world, "elevators", readElevator, (id, elevator) => {
  elevator.floors.forEach((floor, index) =>
    points.add(`lift:${id}:${index}`, {
      coords: floor.point,
      label: Locale("ELEVATOR_PROMPT", elevator.label),
      icon: "elevator",
      radius: 1.5,
      onPressed: () => ride(elevator, index),
    }),
  );
  return () =>
    elevator.floors.forEach((_floor, index) =>
      points.remove(`lift:${id}:${index}`),
    );
});

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
  await moveBy(EVENTS.elevator, [elevator.id, from, Number(picked)]);
}
