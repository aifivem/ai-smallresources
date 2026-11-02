import { cache, Keybind, notify } from "@aifivem/lib/client";
import { waitFor } from "@aifivem/lib/shared";
import { Locale } from "common";
import { belted } from "./driving";
import { cuffed } from "./gestures/guards";
import { content } from "./settings";

/** GTA's shuffle task id (`CTaskInVehicleSeatShuffle`). */
const SHUFFLE_TASK = 165;

/** Driver <-> front passenger with a key, while `noShuffle` keeps GTA from doing it on its own. */
class SeatShuffle {
  private busy = false;

  async run(): Promise<void> {
    const vehicle = cache.vehicle;
    if (!content.settings.shuffleKey || this.busy || vehicle === false) return;
    if (cache.seat !== -1 && cache.seat !== 0) return;
    if (cuffed.get(cache.serverId) === true)
      return notify(Locale("SMALL_SHUFFLE_CUFFED"), "error");
    if (belted()) return notify(Locale("SMALL_SHUFFLE_BELTED"), "error");
    if (!IsVehicleSeatFree(vehicle, cache.seat === -1 ? 0 : -1)) return;
    this.busy = true;
    TaskShuffleToNextVehicleSeat(cache.ped, vehicle);
    await waitFor(
      () => (GetIsTaskActive(cache.ped, SHUFFLE_TASK) ? undefined : true),
      5000,
    ).catch(() => null);
    this.busy = false;
  }
}

const shuffle = new SeatShuffle();
new Keybind({
  name: "smallresources_shuffle",
  description: Locale("KEYBIND_SHUFFLE"),
  defaultKey: "O",
  onPressed: () => void shuffle.run(),
});
