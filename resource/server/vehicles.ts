import {
  EntityState,
  inventory,
  nearestVehicleTo,
  notify,
  onClientCallback,
  stateBoolean,
  stateString,
  vehicleKeys,
} from "@aicore-fivem/lib/server";
import { asArgs } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { MOOR_RANGE } from "common/places";
import { EVENTS, ITEMS, VEHICLE_STATE } from "common/small";
import { content, dist, entityPos, fail, pos } from "./content";

const realPlate = new EntityState(VEHICLE_STATE.realPlate, stateString);
const moored = new EntityState(VEHICLE_STATE.moored, stateBoolean);

const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";
const randomPlate = () =>
  [0, 1, 2, 3, 4, 5, 6, 7]
    .map((i) =>
      i >= 2 && i <= 4
        ? LETTERS[Math.floor(Math.random() * LETTERS.length)]
        : String(Math.floor(Math.random() * 10)),
    )
    .join("");
const plateOf = (vehicle: number) => GetVehicleNumberPlateText(vehicle).trim();

/** Plate work waiting for the player's progress: the vehicle and whether the fake plate comes off. */
const work = new Map<
  number,
  { token: number; vehicle: number; removing: boolean; startedAt: number }
>();
let nextToken = 0;

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
  const token = ++nextToken;
  work.set(source, { token, vehicle, removing, startedAt: Date.now() });
  emitNet(
    EVENTS.plateWork,
    source,
    token,
    NetworkGetNetworkIdFromEntity(vehicle),
    removing,
  );
  return false;
});

onClientCallback(
  EVENTS.plateDone,
  {
    args: ([token]) => asArgs(typeof token === "number" ? token : null),
    lock: true,
  },
  (source, token) => {
    const job = work.get(source);
    if (!job || job.token !== token) return fail("SMALL_ERR_FAR");
    work.delete(source);
    const { vehicle, removing } = job;
    if (
      Date.now() - job.startedAt < 5500 ||
      !DoesEntityExist(vehicle) ||
      dist(pos(source), entityPos(vehicle)) > 4 ||
      (realPlate.get(vehicle) !== undefined) !== removing
    )
      return fail("SMALL_ERR_FAR");
    const keyHolder = vehicleKeys.has(source, vehicle);
    let shown: string;
    if (removing) {
      shown = realPlate.get(vehicle) ?? plateOf(vehicle);
      realPlate.set(vehicle, undefined);
      if (inventory.canCarryItem(source, ITEMS.fakePlate, 1))
        inventory.addItem(source, ITEMS.fakePlate, 1);
    } else {
      if (!inventory.removeItem(source, ITEMS.fakePlate, 1))
        return fail("PLATE_ERR_NONE");
      realPlate.set(vehicle, plateOf(vehicle));
      shown = randomPlate();
    }
    SetVehicleNumberPlateText(vehicle, shown);
    if (keyHolder) vehicleKeys.give(source, shown, "temporary");
    return { ok: true };
  },
);

/** Boat rope: a boat within reach of a mooring is frozen in place; untying frees it. */
onClientCallback(
  EVENTS.moor,
  {
    args: ([netId]) => asArgs(typeof netId === "number" ? netId : null),
    lock: true,
  },
  (source, netId) => {
    const boat = NetworkGetEntityFromNetworkId(netId);
    if (
      !content.settings.boatRope ||
      !boat ||
      !DoesEntityExist(boat) ||
      GetVehicleType(boat) !== "boat" ||
      dist(pos(source), entityPos(boat)) > 6
    )
      return fail("SMALL_ERR_FAR");
    if (moored.get(boat) === true) {
      FreezeEntityPosition(boat, false);
      moored.set(boat, undefined);
      return { ok: true };
    }
    const at = entityPos(boat);
    if (!content.moorings.some((m) => dist(m.point, at) <= MOOR_RANGE + 2))
      return fail("MOOR_ERR_FAR");
    FreezeEntityPosition(boat, true);
    moored.set(boat, true);
    return { ok: true };
  },
);

on("playerDropped", () => work.delete(Number(globalThis.source)));
