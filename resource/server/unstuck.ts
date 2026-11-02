import {
  addCommand,
  notify,
  onCharacter,
  PlayerMap,
  progressFor,
  triggerClientCallback,
} from "@aifivem/lib/server";
import { Locale } from "common";
import { EVENTS } from "common/small";
import { content } from "./content";

interface Window {
  /** `Date.now()` after which the command no longer works. */
  until: number;
  running: boolean;
}

/**
 * `/unstuck`: for a few minutes after a character loads, a player stuck in an interior or under the map waits through
 * a long progress bar and is taken to the panel's point. One use per load; the server keeps the window.
 */
class Unstuck {
  private readonly windows = new PlayerMap<Window>();
  /** Characters replayed after a restart get no window (they loaded long ago). */
  private live = false;

  constructor() {
    onCharacter({
      loaded: (source) => this.loaded(source),
      unloaded: (source) => this.windows.delete(source),
    });
    // Runs after onCharacter's replay of the already loaded characters.
    setImmediate(() => (this.live = true));
  }

  private loaded(source: number): void {
    const s = content.settings;
    if (!this.live || !s.unstuck) return;
    this.windows.set(source, {
      until: Date.now() + s.unstuckMinutes * 60_000,
      running: false,
    });
    notify(source, Locale("UNSTUCK_HINT", s.unstuckMinutes), "info", 15_000);
  }

  async use(source: number): Promise<void> {
    const s = content.settings;
    const window = this.windows.get(source);
    if (!s.unstuck) return;
    if (!window || Date.now() > window.until)
      return notify(
        source,
        Locale("UNSTUCK_ERR_LATE", s.unstuckMinutes),
        "error",
      );
    if (window.running) return;
    window.running = true;
    try {
      const stuck = await triggerClientCallback(
        EVENTS.unstuckCheck,
        source,
      ).catch(() => false);
      if (stuck !== true)
        return notify(source, Locale("UNSTUCK_ERR_NOT_STUCK"), "error");
      const done = await progressFor(source, {
        label: Locale("UNSTUCK_WAITING"),
        duration: s.unstuckSeconds * 1000,
        canCancel: true,
        disable: { move: true, car: true, combat: true },
      });
      if (!done) return notify(source, Locale("UNSTUCK_CANCELLED"), "error");
      // Used: the window closes for this load.
      if (this.windows.get(source) !== window) return;
      this.windows.delete(source);
      const p = content.settings.unstuckPoint;
      emitNet(EVENTS.unstuck, source, p.x, p.y, p.z, p.heading);
    } finally {
      window.running = false;
    }
  }
}

const unstuck = new Unstuck();
addCommand("unstuck", { help: Locale("CMD_UNSTUCK") }, (source) => {
  if (source > 0) void unstuck.use(source);
});
