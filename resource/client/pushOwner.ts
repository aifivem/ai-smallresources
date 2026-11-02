import {
  cache,
  entityFromNetId,
  EntityState,
  TickLoop,
} from "@aifivem/lib/client";
import { type PushMode, readPushMode, VEHICLE_STATE } from "common/small";

const pushState = new EntityState(VEHICLE_STATE.push, readPushMode);

/** The client that owns a pushed vehicle moves it (GTA lets only the owner drive an entity). */
class PushedVehicle {
  private vehicle = 0;
  private netId = 0;
  private speed = 0;
  /** `TaskVehicleTempAction` of the turned wheels (reference values), 0 = straight. */
  private turn = 0;
  private readonly frame = new TickLoop(() => this.tick());

  changed(netId: number, mode: PushMode | undefined): void {
    const vehicle = mode ? entityFromNetId(netId, 2) : 0;
    if (!vehicle || NetworkGetEntityOwner(vehicle) !== cache.playerId) {
      if (netId === this.netId) this.end();
      return;
    }
    this.vehicle = vehicle;
    this.netId = netId;
    this.speed = mode?.startsWith("f") ? -1 : 1;
    this.turn = mode?.endsWith("l") ? 11 : mode?.endsWith("r") ? 10 : 0;
    this.frame.set(true);
  }

  private end(): void {
    this.vehicle = 0;
    this.netId = 0;
    this.frame.set(false);
  }

  private tick(): void {
    const vehicle = this.vehicle;
    if (
      !DoesEntityExist(vehicle) ||
      NetworkGetEntityOwner(vehicle) !== cache.playerId
    )
      return this.end();
    if (this.turn) TaskVehicleTempAction(cache.ped, vehicle, this.turn, 1);
    SetVehicleForwardSpeed(vehicle, this.speed);
    if (HasEntityCollidedWithAnything(vehicle))
      SetVehicleOnGroundProperly(vehicle);
  }
}

const pushed = new PushedVehicle();
pushState.onChange((netId, mode) => pushed.changed(netId, mode));
