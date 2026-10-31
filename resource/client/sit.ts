import {
  cache,
  every,
  Keybind,
  keyHints,
  notify,
  player,
  Points,
  requestAnimDict,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { SEAT_TYPES, type SeatModel, type SeatPose } from "common/seats";
import { content, onContent, onSettings } from "./settings";

const HINT = "sit_getup";
const SCENARIO_TASK = GetHashKey("SCRIPT_TASK_START_SCENARIO_AT_POSITION");
/** Objects tipped over more than this (degrees, x plus y) are not sat on. */
const MAX_TILT = 20;

const hashOf = (model: string) =>
  /^-?\d+$/.test(model) ? Number(model) | 0 : GetHashKey(model);

/**
 * Sitting on world objects: the panel's seat list names the models and where on them a player sits; the nearest free
 * seat of the object is taken with its type's scenario or animation; the stand-up key (X) gets the player up. Its
 * own key, not the interaction key: that one goes to a focused target first, which is the seat just sat on.
 */
class Sitting {
  private byModel = new Map<number, SeatModel>();
  private pose: SeatPose | null = null;

  /** On a seat: X stands up then, so other X actions (hands up) skip it. */
  get seated(): boolean {
    return this.pose !== null;
  }
  private from: number[] = [];
  private readonly job = every(500, () => this.watch(), {
    active: false,
    name: "sit",
  });
  private readonly points = new Points();

  rebuild(): void {
    this.points.clear();
    this.byModel = new Map(
      [...content.seats.values()].map((s) => [hashOf(s.model), s]),
    );
    if (!content.settings.sit || !this.byModel.size) return;
    this.points.addModel("sit", {
      models: [...this.byModel.keys()],
      label: Locale("SIT_PROMPT"),
      icon: "chair",
      radius: 2,
      // Seats are everywhere: a prompt next to every bench would follow the player around (owner decision).
      preferTarget: true,
      canShow: () => !this.pose && cache.vehicle === false,
      onPressed: (entity) => this.sit(entity),
    });
  }

  async sit(entity: number): Promise<void> {
    const seat = this.byModel.get(GetEntityModel(entity));
    if (!seat || this.pose) return;
    const [rx = 0, ry = 0] = GetEntityRotation(entity, 2);
    if (Math.abs(rx) + Math.abs(ry) > MAX_TILT)
      return notify(Locale("SIT_ERR_TILT"), "error");
    const me = GetEntityCoords(cache.ped, false);
    let best: { at: number[]; heading: number; dist: number } | null = null;
    for (const offset of seat.seats) {
      const at = GetOffsetFromEntityInWorldCoords(
        entity,
        offset.x,
        offset.y,
        offset.z,
      );
      const [x = 0, y = 0, z = 0] = at;
      if (
        IsPositionOccupied(
          x,
          y,
          z,
          0.4,
          false,
          false,
          true,
          false,
          false,
          cache.ped,
          false,
        )
      )
        continue;
      const dist = Math.hypot(x - (me[0] ?? 0), y - (me[1] ?? 0));
      if (!best || dist < best.dist)
        best = {
          at,
          heading: (GetEntityHeading(entity) + offset.heading) % 360,
          dist,
        };
    }
    if (!best) return notify(Locale("SIT_ERR_TAKEN"), "error");
    const pose: SeatPose = SEAT_TYPES[seat.type];
    const [x = 0, y = 0, z = 0] = best.at;
    this.from = me;
    if (pose.kind === "scenario") {
      ClearPedTasks(cache.ped);
      TaskStartScenarioAtPosition(
        cache.ped,
        pose.name,
        x,
        y,
        z,
        best.heading,
        -1,
        false,
        seat.teleport || best.dist > 3,
      );
    } else {
      if (!(await requestAnimDict(pose.dict).catch(() => false))) return;
      await player.teleport(
        { x, y, z: z + pose.z },
        { heading: best.heading, fade: false },
      );
      player.freeze(true);
      await player.playAnim(pose.dict, pose.clip, {
        blendIn: 2,
        blendOut: 2,
        flag: 1,
      });
    }
    this.pose = pose;
    keyHints.show(HINT, {
      label: Locale("SIT_GETUP"),
      keybind: "smallresources_sit_getup",
      icon: "person-walking",
    });
    this.job.set(true);
  }

  stand(): void {
    const pose = this.pose;
    if (!pose) return;
    this.end();
    ClearPedTasks(cache.ped);
    if (pose.kind === "anim") {
      player.freeze(false);
      const [x = 0, y = 0, z = 0] = this.from;
      void player.teleport({ x, y, z: z - 1 }, { fade: false });
    }
  }

  /** The seat was left another way (walked off, a task replaced the scenario, ragdoll). */
  private watch(): void {
    const pose = this.pose;
    if (!pose) return;
    const left =
      pose.kind === "scenario"
        ? GetScriptTaskStatus(cache.ped, SCENARIO_TASK) === 7
        : !IsEntityPlayingAnim(cache.ped, pose.dict, pose.clip, 3);
    if (left) this.stand();
  }

  private end(): void {
    this.pose = null;
    this.job.set(false);
    keyHints.hide(HINT);
  }
}

export const sitting = new Sitting();
sitting.rebuild();
onContent("seats", () => sitting.rebuild());
onSettings(() => sitting.rebuild());
new Keybind({
  name: "smallresources_sit_getup",
  description: Locale("KEYBIND_SIT_GETUP"),
  defaultKey: "X",
  onPressed: () => sitting.stand(),
});
