import { cache, Keybind, requestAnimDict, requestModel } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { HOLD_STATE, NEWS_ITEMS } from "common/small";
import { binoculars } from "./items";

/**
 * News camera, microphone and boom: the server writes what a player holds into their state; every client puts a local
 * prop in that player's hand, the holder also plays the animation. Holding the camera, H opens the news view.
 */
class NewsGear {
  private readonly props = new Map<number, number>();
  private held: string | null = null;

  async apply(player: number, item: string | null): Promise<void> {
    const old = this.props.get(player);
    if (old) DeleteObject(old);
    this.props.delete(player);
    const ped = GetPlayerPed(player);
    const mine = player === cache.playerId;
    if (mine) {
      if (this.held) ClearPedTasks(cache.ped);
      if (binoculars.active) binoculars.close();
      this.held = item;
    }
    const gear = item ? NEWS_ITEMS[item] : undefined;
    if (!gear || !ped) return;
    const model = await requestModel(gear.model).catch(() => 0);
    if (!model) return;
    const [x = 0, y = 0, z = 0] = GetEntityCoords(ped, false);
    const prop = CreateObject(model, x, y, z, false, false, false);
    const [ox, oy, oz, rx, ry, rz] = gear.offset;
    AttachEntityToEntity(prop, ped, GetPedBoneIndex(ped, gear.bone), ox, oy, oz, rx, ry, rz, true, true, false, true, 0, true);
    SetModelAsNoLongerNeeded(model);
    this.props.set(player, prop);
    if (mine) {
      const dict = await requestAnimDict(gear.dict);
      TaskPlayAnim(cache.ped, dict, gear.clip, 1.0, -1, -1, 50, 0, false, false, false);
    }
  }

  view(): void {
    if (this.held !== "newscam") return;
    if (binoculars.active) binoculars.close();
    else binoculars.open(true);
  }
}

const gear = new NewsGear();
AddStateBagChangeHandler(HOLD_STATE, "", (bagName: string, _key: string, value: unknown) => {
  const player = GetPlayerFromStateBagName(bagName);
  if (NetworkIsPlayerActive(player)) void gear.apply(player, typeof value === "string" ? value : null);
});
new Keybind({ name: "smallresources_newsview_H", description: Locale("KEYBIND_NEWS_VIEW"), defaultKey: "H", onPressed: () => gear.view() });
