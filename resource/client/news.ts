import {
  attachProp,
  cache,
  Keybind,
  player as localPlayer,
  playerPed,
  PlayerState,
  stateString,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { HOLD_STATE, NEWS_ITEMS } from "common/items";
import { binoculars } from "./items";

/**
 * News camera, microphone and boom: the server writes what a player holds into their state; every client puts a local
 * prop in that player's hand, the holder also plays the animation. Holding the camera, H opens the news view.
 */
class NewsGear {
  private readonly props = new Map<number, number>();
  private held: string | null = null;

  /** Puts the held item's prop in a player's hand (by server id), or takes it away. */
  async apply(serverId: number, item: string | null): Promise<void> {
    const old = this.props.get(serverId);
    if (old) DeleteObject(old);
    this.props.delete(serverId);
    const ped = playerPed(serverId);
    const mine = serverId === cache.serverId;
    if (mine) {
      if (this.held) ClearPedTasks(cache.ped);
      if (binoculars.active) binoculars.close();
      this.held = item;
    }
    const gear = item ? NEWS_ITEMS[item] : undefined;
    if (!gear || !ped) return;
    const [ox, oy, oz, rx, ry, rz] = gear.offset;
    const prop = await attachProp(gear.model, {
      ped,
      bone: gear.bone,
      offset: { x: ox, y: oy, z: oz },
      rotation: { x: rx, y: ry, z: rz },
      rotationOrder: 0,
    });
    if (!prop) return;
    this.props.set(serverId, prop);
    if (mine)
      await localPlayer.playAnim(gear.dict, gear.clip, {
        blendIn: 1.0,
        blendOut: -1,
        flag: 50,
      });
  }

  view(): void {
    if (this.held !== "newscam") return;
    if (binoculars.active) binoculars.close();
    else binoculars.open(true);
  }
}

const gear = new NewsGear();
new PlayerState(HOLD_STATE, stateString).onChange((serverId, item) => {
  void gear.apply(serverId, item ?? null);
});
new Keybind({
  name: "smallresources_newsview",
  description: Locale("KEYBIND_NEWS_VIEW"),
  defaultKey: "H",
  onPressed: () => gear.view(),
});
