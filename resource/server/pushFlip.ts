import {
  entityCoords,
  EntityState,
  isNear,
  notify,
  onClientCallback,
  onClientEvent,
  progressFor,
  vehicleNearPlayer,
} from "@aifivem/lib/server";
import { fail, oneArg, readId } from "@aifivem/lib/shared";
import { Locale } from "common";
import { EVENTS, readPushMode, VEHICLE_STATE } from "common/small";
import { content } from "./content";

const pushState = new EntityState(VEHICLE_STATE.push, readPushMode);
/** The vehicle's owner client re-reads the state when it changes hands mid-push: a cleared then set value. */
const HANDOVER_MS = 100;

/**
 * Vehicle push: the pusher asks for a mode (or null to stop); the vehicle state carries it and the client that owns the
 * vehicle moves it. A vehicle with a driver is never pushed.
 */
onClientEvent(
  EVENTS.push,
  {
    args: ([netId, mode]) => {
      const id = readId(netId);
      const parsed = mode == null ? null : readPushMode(mode);
      return id !== null && parsed !== undefined ? [id, parsed] : null;
    },
    rate: { count: 20, windowMs: 1000 },
  },
  (source, netId, mode) => {
    const vehicle = vehicleNearPlayer(source, netId, { metres: 8 });
    if (!vehicle) return;
    if (mode === null) return pushState.set(vehicle, undefined);
    if (!content.settings.vehiclePush || GetPedInVehicleSeat(vehicle, -1))
      return;
    // The same value set again replicates nothing: a handover (new owner) clears it first.
    if (pushState.get(vehicle) === mode) {
      pushState.set(vehicle, undefined);
      setTimeout(() => {
        if (DoesEntityExist(vehicle)) pushState.set(vehicle, mode);
      }, HANDOVER_MS);
      return;
    }
    pushState.set(vehicle, mode);
  },
);

/** Tipped 70 degrees or more (pitch or roll: the server's rotation order differs from the client's). */
function isOverturned(vehicle: number): boolean {
  const [pitch = 0, roll = 0] = GetEntityRotation(vehicle);
  return Math.max(Math.abs(pitch), Math.abs(roll)) >= 70;
}

/**
 * Flip: a server-timed progress bar next to an overturned vehicle, then its owner client (it alone moves it) puts it
 * back on its wheels.
 */
onClientCallback(
  EVENTS.flip,
  { args: oneArg(readId), lock: true },
  async (source, netId) => {
    const vehicle = vehicleNearPlayer(source, netId, { metres: 4 });
    if (!content.settings.flipVehicle || !vehicle) return fail("SMALL_ERR_FAR");
    if (!isOverturned(vehicle)) return fail("FLIP_ERR_UPRIGHT");
    const done = await progressFor(source, {
      label: Locale("FLIP_FLIPPING"),
      duration: content.settings.flipSeconds * 1000,
      anim: { dict: "mini@repair", clip: "fixing_a_ped", flag: 1 },
      face: entityCoords(vehicle),
      canCancel: true,
      disable: { move: true, car: true, combat: true },
    });
    // A cancelled bar ends quietly.
    if (!done) return { ok: true };
    if (!DoesEntityExist(vehicle) || !isNear(source, entityCoords(vehicle), 5))
      return fail("SMALL_ERR_FAR");
    if (!isOverturned(vehicle)) return { ok: true };
    const owner = NetworkGetEntityOwner(vehicle);
    emitNet(EVENTS.flipped, owner > 0 ? owner : source, netId);
    notify(source, Locale("FLIP_DONE"), "success");
    return { ok: true };
  },
);
