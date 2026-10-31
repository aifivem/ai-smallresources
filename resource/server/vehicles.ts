import {
  entityCoords,
  EntityState,
  inventory,
  isNear,
  nearestVehicleTo,
  notify,
  onClientCallback,
  plateOf,
  progressFor,
  randomPlate,
  stateBoolean,
  stateString,
  vehicleFromNet,
  vehicleKeys,
  vehicleOf,
} from "@aicore-fivem/lib/server";
import { fail, nearestOf, oneArg, readId } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { MOOR_RANGE } from "common/places";
import { EVENTS, ITEMS, VEHICLE_STATE } from "common/small";
import { content } from "./content";

const realPlate = new EntityState(VEHICLE_STATE.realPlate, stateString);
const moored = new EntityState(VEHICLE_STATE.moored, stateBoolean);

/** How long fitting or taking off a plate takes (counted after 90 % of it). */
const PLATE_MS = 6000;

/**
 * Fake plate: fitted on a vehicle the player has the keys to (the real plate kept in the vehicle's state), taken off
 * again by anyone with the item in hand, which comes back. The key holder gets keys for the plate the vehicle shows.
 */
inventory.registerUsableItem(ITEMS.fakePlate, (source) => {
  if (!content.settings.fakePlate) return false;
  const vehicle = vehicleOf(source) ? 0 : nearestVehicleTo(source, 3);
  if (!vehicle) {
    notify(source, Locale("PLATE_ERR_NONE"), "error");
    return false;
  }
  const removing = realPlate.get(vehicle) !== undefined;
  if (!removing && !vehicleKeys.has(source, vehicle)) {
    notify(source, Locale("PLATE_ERR_KEYS"), "error");
    return false;
  }
  void plateWork(source, vehicle, removing);
  return false;
});

/** The plate work: the server-timed progress facing the vehicle, then the plate swap if nothing changed meanwhile. */
async function plateWork(
  source: number,
  vehicle: number,
  removing: boolean,
): Promise<void> {
  const done = await progressFor(source, {
    label: Locale(removing ? "PLATE_REMOVING" : "PLATE_FITTING"),
    duration: PLATE_MS,
    anim: {
      dict: "anim@amb@clubhouse@tutorial@bkr_tut_ig3@",
      clip: "machinic_loop_mechandplayer",
      flag: 1,
    },
    face: entityCoords(vehicle),
    minRatio: 0.9,
  });
  if (
    !done ||
    !DoesEntityExist(vehicle) ||
    !isNear(source, entityCoords(vehicle), 4) ||
    (realPlate.get(vehicle) !== undefined) !== removing
  )
    return;
  const keyHolder = vehicleKeys.has(source, vehicle);
  let shown: string;
  if (removing) {
    shown = realPlate.get(vehicle) ?? plateOf(vehicle);
    realPlate.set(vehicle, undefined);
    if (inventory.canCarryItem(source, ITEMS.fakePlate, 1))
      inventory.addItem(source, ITEMS.fakePlate, 1);
  } else {
    if (!inventory.removeItem(source, ITEMS.fakePlate, 1))
      return notify(source, Locale("PLATE_ERR_NONE"), "error");
    realPlate.set(vehicle, plateOf(vehicle));
    shown = randomPlate();
  }
  SetVehicleNumberPlateText(vehicle, shown);
  if (keyHolder) vehicleKeys.give(source, shown, "temporary");
  notify(
    source,
    Locale(removing ? "PLATE_REMOVED" : "PLATE_FITTED"),
    "success",
  );
}

/** Boat rope: a boat within reach of a mooring is frozen in place; untying frees it. Never a boat someone else drives. */
/** Why the player cannot tie or untie this boat now, or null. */
function moorRefusal(source: number, boat: number): string | null {
  if (
    !content.settings.boatRope ||
    !boat ||
    !DoesEntityExist(boat) ||
    GetVehicleType(boat) !== "boat" ||
    !isNear(source, entityCoords(boat), 6)
  )
    return "SMALL_ERR_FAR";
  const driver = GetPedInVehicleSeat(boat, -1);
  if (driver && driver !== GetPlayerPed(String(source)))
    return "MOOR_ERR_DRIVEN";
  if (moored.get(boat) === true) return null;
  const near = nearestOf(
    content.moorings.values(),
    entityCoords(boat),
    (m) => m.point,
    MOOR_RANGE + 2,
  );
  return near ? null : "MOOR_ERR_FAR";
}

onClientCallback(
  EVENTS.moor,
  { args: oneArg(readId), lock: true },
  async (source, netId) => {
    const boat = vehicleFromNet(netId);
    const refused = moorRefusal(source, boat);
    if (refused) return fail(refused);
    const untie = moored.get(boat) === true;
    const done = await progressFor(source, {
      label: Locale(untie ? "MOOR_UNTYING" : "MOOR_TYING"),
      duration: 3000,
      anim: {
        dict: "anim@scripted@heist@ig9_control_tower@male@",
        clip: "loop",
        flag: 1,
      },
      face: entityCoords(boat),
    });
    // A cancelled bar ends quietly.
    if (!done) return { ok: true };
    const again = moorRefusal(source, boat);
    if (again) return fail(again);
    if ((moored.get(boat) === true) !== untie) return { ok: true };
    FreezeEntityPosition(boat, !untie);
    moored.set(boat, untie ? undefined : true);
    notify(source, Locale(untie ? "MOOR_UNTIED" : "MOOR_TIED"), "success");
    return { ok: true };
  },
);
