import {
  entityCoords,
  EntityState,
  inventory,
  isNear,
  nearestVehicleTo,
  notify,
  onClientCallback,
  progressFor,
  randomPlate,
  stateBoolean,
  stateString,
  vehicleFromNet,
  vehicleKeys,
} from "@aicore-fivem/lib/server";
import { distance, fail, oneArg, readId } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { MOOR_RANGE } from "common/places";
import { EVENTS, ITEMS, VEHICLE_STATE } from "common/small";
import { content } from "./content";

const realPlate = new EntityState(VEHICLE_STATE.realPlate, stateString);
const moored = new EntityState(VEHICLE_STATE.moored, stateBoolean);

const plateOf = (vehicle: number) => GetVehicleNumberPlateText(vehicle).trim();

/** How long fitting or taking off a plate takes (counted after 90 % of it). */
const PLATE_MS = 6000;

/**
 * Fake plate: fitted on a vehicle the player has the keys to (the real plate kept in the vehicle's state), taken off
 * again by anyone with the item in hand, which comes back. The key holder gets keys for the plate the vehicle shows.
 */
inventory.registerUsableItem(ITEMS.fakePlate, (source) => {
  if (!content.settings.fakePlate) return false;
  const ped = GetPlayerPed(String(source));
  const vehicle = GetVehiclePedIsIn(ped, false)
    ? 0
    : nearestVehicleTo(source, 3);
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
onClientCallback(
  EVENTS.moor,
  { args: oneArg(readId), lock: true },
  (source, netId) => {
    const boat = vehicleFromNet(netId);
    if (
      !content.settings.boatRope ||
      !boat ||
      GetVehicleType(boat) !== "boat" ||
      !isNear(source, entityCoords(boat), 6)
    )
      return fail("SMALL_ERR_FAR");
    const driver = GetPedInVehicleSeat(boat, -1);
    if (driver && driver !== GetPlayerPed(String(source)))
      return fail("MOOR_ERR_DRIVEN");
    if (moored.get(boat) === true) {
      FreezeEntityPosition(boat, false);
      moored.set(boat, undefined);
      return { ok: true };
    }
    const at = entityCoords(boat);
    let inReach = false;
    for (const m of content.moorings.values())
      if (distance(m.point, at) <= MOOR_RANGE + 2) inReach = true;
    if (!inReach) return fail("MOOR_ERR_FAR");
    FreezeEntityPosition(boat, true);
    moored.set(boat, true);
    return { ok: true };
  },
);
