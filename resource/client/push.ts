import {
  cache,
  every,
  fuel,
  Keybind,
  medical,
  nearestVehicle,
  player,
  TickLoop,
} from "@aifivem/lib/client";
import { Locale } from "common";
import { EVENTS, type PushMode } from "common/small";
import { content } from "./settings";

const DICT = "missfinale_c2ig_11";
const CLIP = "pushcar_offcliff_m";
/** Hand bone the pusher hangs on. */
const BONE = 6286;
const LEFT = 34;
const RIGHT = 35;

/** A broken (engine at or below the panel's health) or empty vehicle without a driver, of a class that can be pushed. */
function pushable(vehicle: number): boolean {
  const s = content.settings;
  const engine = GetVehicleEngineHealth(vehicle);
  return (
    IsVehicleSeatFree(vehicle, -1) &&
    !s.pushBlockedClasses.includes(GetVehicleClass(vehicle)) &&
    ((engine >= 0 && engine <= s.pushEngineHealth) || fuel.get(vehicle) < 3)
  );
}

const netOf = (vehicle: number) => NetworkGetNetworkIdFromEntity(vehicle);

/** The local player pushing: hangs on the vehicle with the animation, A / D turn the wheels, Shift held keeps going. */
class Pusher {
  private vehicle = 0;
  private front = false;
  private steer: "" | "l" | "r" = "";
  private owner = -1;
  private readonly frame = new TickLoop(() => this.tick());
  private readonly watch = every(500, () => this.check(), {
    active: false,
    name: "pushCheck",
  });

  async start(): Promise<void> {
    const ped = cache.ped;
    if (
      this.vehicle ||
      !content.settings.vehiclePush ||
      cache.vehicle !== false ||
      medical.isDead() ||
      IsPedRagdoll(ped)
    )
      return;
    const vehicle = nearestVehicle(3, { filter: pushable });
    if (!vehicle || IsEntityAttachedToEntity(ped, vehicle)) return;
    const [vx = 0, vy = 0] = GetEntityCoords(vehicle, false);
    const [px = 0, py = 0] = GetEntityCoords(ped, false);
    const [fx = 0, fy = 0] = GetEntityForwardVector(vehicle);
    const front =
      Math.hypot(vx - px + fx, vy - py + fy) <
      Math.hypot(vx - px - fx, vy - py - fy);
    const [min = []] = GetModelDimensions(GetEntityModel(vehicle));
    const [, minY = 0, minZ = 0] = min;
    AttachEntityToEntity(
      ped,
      vehicle,
      GetPedBoneIndex(ped, BONE),
      0,
      front ? -minY + 0.1 : minY - 0.3,
      minZ + 1,
      0,
      0,
      front ? 180 : 0,
      false,
      false,
      false,
      true,
      0,
      true,
    );
    this.vehicle = vehicle;
    this.front = front;
    this.steer = "";
    this.owner = NetworkGetEntityOwner(vehicle);
    this.send();
    this.frame.set(true);
    this.watch.set(true);
    await player.playAnim(DICT, CLIP, { flag: 35, blendIn: 2, blendOut: -8 });
  }

  stop(): void {
    const vehicle = this.vehicle;
    if (!vehicle) return;
    this.vehicle = 0;
    this.frame.set(false);
    this.watch.set(false);
    DetachEntity(cache.ped, false, false);
    StopAnimTask(cache.ped, DICT, CLIP, 2);
    if (DoesEntityExist(vehicle)) emitNet(EVENTS.push, netOf(vehicle), null);
  }

  private send(): void {
    const mode: PushMode = `${this.front ? "f" : "b"}${this.steer}`;
    emitNet(EVENTS.push, netOf(this.vehicle), mode);
  }

  private tick(): void {
    if (!shiftKey.isPressed || cache.vehicle !== false) return this.stop();
    const steer = IsDisabledControlPressed(0, LEFT)
      ? "l"
      : IsDisabledControlPressed(0, RIGHT)
        ? "r"
        : "";
    if (steer === this.steer) return;
    this.steer = steer;
    this.send();
  }

  private check(): void {
    const vehicle = this.vehicle;
    if (
      !DoesEntityExist(vehicle) ||
      !pushable(vehicle) ||
      medical.isDead() ||
      IsPedRagdoll(cache.ped)
    )
      return this.stop();
    // A new owner client moves it from now on: the server sets the state again for it.
    const owner = NetworkGetEntityOwner(vehicle);
    if (owner === this.owner) return;
    this.owner = owner;
    this.send();
  }
}

const pusher = new Pusher();

const keyChanged = () => {
  if (useKey.isPressed && shiftKey.isPressed) void pusher.start();
};
const useKey = new Keybind({
  name: "smallresources_push",
  description: Locale("KEYBIND_PUSH"),
  defaultKey: "E",
  onPressed: keyChanged,
});
const shiftKey = new Keybind({
  name: "smallresources_push_hold",
  description: Locale("KEYBIND_PUSH_HOLD"),
  defaultKey: "LSHIFT",
  onPressed: keyChanged,
  onReleased: () => pusher.stop(),
});
