import {
  inventory,
  isOnline,
  notify,
  onCharacter,
  onClientEvent,
  PlayerState,
  progressFor,
  resourceExport,
  stateBoolean,
  triggerClientCallback,
} from "@aicore-fivem/lib/server";
import { asArgs, int, isRecord, readInt } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { DIVE_STATE } from "common/items";
import { EVENTS, ITEMS } from "common/small";
import { content } from "./content";

/**
 * Dive gear (qbx_divegear): the gear item puts the tank and mask on or takes them off, the fill item refills the tank.
 * Air is seconds kept per character in ai-core's metadata; the wearer's client spends it underwater and reports it.
 */

const core = resourceExport("ai-core");
const diving = new PlayerState(DIVE_STATE, stateBoolean);
const META = "diveOxygen";
const ANIM = { dict: "clothingshirt", clip: "try_shirt_positive_d" };

const airOf = (source: number): number =>
  int(core.GetMeta(source, META), 0, 0, 3600);

/** The client's word on whether the player swims; null without an answer. */
async function waterOf(
  source: number,
): Promise<{ swimming: boolean; underwater: boolean } | null> {
  const answer = await triggerClientCallback(EVENTS.diveWater, source).catch(
    () => null,
  );
  return isRecord(answer)
    ? {
        swimming: answer.swimming === true,
        underwater: answer.underwater === true,
      }
    : null;
}

function takeOff(source: number): void {
  diving.set(source, undefined);
  emitNet(EVENTS.diveGear, source, null);
}

async function toggleGear(source: number): Promise<void> {
  const { diveWearSeconds } = content.settings;
  const bar = { duration: diveWearSeconds * 1000, anim: ANIM, canCancel: true };
  if (diving.get(source)) {
    const done = await progressFor(source, {
      ...bar,
      label: Locale("DIVE_TAKING_OFF"),
    });
    if (!done || !diving.get(source)) return;
    takeOff(source);
    notify(source, Locale("DIVE_TOOK_OFF"), "info");
    return;
  }
  if (airOf(source) <= 0)
    return notify(source, Locale("DIVE_ERR_EMPTY"), "error");
  const water = await waterOf(source);
  if (
    !water ||
    water.swimming ||
    GetVehiclePedIsIn(GetPlayerPed(String(source)), false)
  )
    return notify(source, Locale("DIVE_ERR_GROUND"), "error");
  const done = await progressFor(source, {
    ...bar,
    label: Locale("DIVE_PUTTING_ON"),
  });
  if (
    !done ||
    diving.get(source) ||
    !inventory.hasItem(source, ITEMS.divingGear)
  )
    return;
  diving.set(source, true);
  emitNet(EVENTS.diveGear, source, airOf(source));
}

async function refill(source: number): Promise<void> {
  const water = await waterOf(source);
  if (!water || water.underwater)
    return notify(source, Locale("DIVE_ERR_UNDERWATER"), "error");
  const { diveFillSeconds, diveAir } = content.settings;
  const done = await progressFor(source, {
    label: Locale("DIVE_FILLING"),
    duration: diveFillSeconds * 1000,
    anim: ANIM,
    canCancel: true,
  });
  if (!done || !inventory.removeItem(source, ITEMS.divingFill, 1)) return;
  core.SetMeta(source, META, diveAir);
  if (diving.get(source)) emitNet(EVENTS.diveGear, source, diveAir);
  notify(source, Locale("DIVE_FILLED"), "success");
}

inventory.registerUsableItem(ITEMS.divingGear, (source) => {
  if (content.settings.diveGear) void toggleGear(source);
  return false;
});
inventory.registerUsableItem(ITEMS.divingFill, (source) => {
  if (content.settings.diveGear) void refill(source);
  return false;
});

/** The wearer's client reports the air left; it can only go down. */
onClientEvent(
  EVENTS.diveAir,
  { args: ([air]) => asArgs(readInt(air, 0, 3600)) },
  (source, air) => {
    if (diving.get(source) && air < airOf(source))
      core.SetMeta(source, META, air);
  },
);

// A restart or character switch takes the gear off (the client's breathing ended with the resource).
onCharacter({
  loaded: (source) => {
    if (diving.get(source)) takeOff(source);
  },
  unloaded: (source) => {
    if (isOnline(source) && diving.get(source)) takeOff(source);
  },
});
