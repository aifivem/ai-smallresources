import {
  cache,
  callAction,
  entityFromNetId,
  onServerEvent,
  Points,
} from "@aifivem/lib/client";
import { oneArg, readId } from "@aifivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/small";
import { content, FALLBACK, onSettings } from "./settings";

/** Flip an overturned vehicle back onto its wheels: a target option (prompt without a target script). */
const points = new Points();
let added = false;

function apply(): void {
  const on = content.settings.flipVehicle;
  if (on === added) return;
  added = on;
  if (!on) return points.clear();
  points.addVehicle("flip", {
    label: Locale("FLIP_TARGET"),
    icon: "car",
    radius: 2,
    preferTarget: true,
    canShow: (vehicle) =>
      cache.vehicle === false &&
      vehicle !== 0 &&
      Math.abs(GetEntityRoll(vehicle)) >= 70,
    onPressed: (vehicle) =>
      callAction(
        EVENTS.flip,
        [NetworkGetNetworkIdFromEntity(vehicle)],
        FALLBACK,
      ),
  });
}
apply();
onSettings(apply);

/** The server picked this client as the vehicle's owner: only the owner can move it. */
onServerEvent(EVENTS.flipped, { args: oneArg(readId) }, (netId) => {
  const vehicle = entityFromNetId(netId, 2);
  if (vehicle) SetVehicleOnGroundProperly(vehicle);
});
