import {
  cache,
  EntityState,
  notify,
  Points,
  progress,
  stateBoolean,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { MOOR_RANGE } from "common/places";
import { EVENTS, VEHICLE_STATE } from "common/small";
import { answered } from "./feedback";
import { content, onContent, onSettings } from "./settings";

const moored = new EntityState(VEHICLE_STATE.moored, stateBoolean);
const BOAT_CLASS = 14;
const boats = (GetAllVehicleModels() as string[]).filter(
  (model) => GetVehicleClassFromName(model) === BOAT_CLASS,
);

const isMoored = (boat: number) =>
  NetworkGetEntityIsNetworked(boat) &&
  moored.get(NetworkGetNetworkIdFromEntity(boat)) === true;

/** A mooring within reach of the boat (the server checks the same distance). */
function nearMooring(boat: number): boolean {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(boat, false);
  return content.moorings.some(
    (m) =>
      Math.hypot(m.point.x - x, m.point.y - y, m.point.z - z) <= MOOR_RANGE,
  );
}

/** Boat rope: tie a boat floating near a dock mooring so it stays put, untie it again. */
const points = new Points();
function rebuild(): void {
  points.clear();
  if (!content.settings.boatRope || !content.moorings.length) return;
  const onFoot = () => cache.vehicle === false && !IsPedSwimming(cache.ped);
  const common = { models: boats, vehicles: true, icon: "anchor", radius: 4 };
  points.addModel("moor", {
    ...common,
    label: Locale("MOOR_TIE"),
    canShow: (boat) => onFoot() && !isMoored(boat) && nearMooring(boat),
    onPressed: (boat) => use(boat, false),
  });
  points.addModel("unmoor", {
    ...common,
    label: Locale("MOOR_UNTIE"),
    canShow: (boat) => onFoot() && isMoored(boat),
    onPressed: (boat) => use(boat, true),
  });
}

async function use(boat: number, untie: boolean): Promise<void> {
  if (!NetworkGetEntityIsNetworked(boat)) return;
  const done = await progress({
    label: Locale(untie ? "MOOR_UNTYING" : "MOOR_TYING"),
    duration: 3000,
    anim: {
      dict: "anim@scripted@heist@ig9_control_tower@male@",
      clip: "loop",
      flag: 1,
    },
  });
  if (!done) return;
  const netId = NetworkGetNetworkIdFromEntity(boat);
  if (
    answered(
      await triggerServerCallback(EVENTS.moor, [netId]).catch(() => null),
    )
  )
    notify(Locale(untie ? "MOOR_UNTIED" : "MOOR_TIED"), "success");
}

rebuild();
onContent("moorings", rebuild);
onSettings(rebuild);
