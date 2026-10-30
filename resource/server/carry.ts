import {
  coordsOf,
  Cooldowns,
  isNear,
  nearestPlayerTo,
  onCharacter,
  onClientCallback,
  online,
  PlayerState,
  stateBoolean,
  stateNumber,
  triggerClientCallback,
} from "@aicore-fivem/lib/server";
import { fail } from "@aicore-fivem/lib/shared";
import { CORE, PLAYER_BAGS } from "@aicore-fivem/shared";
import { CARRY_STATE, EVENTS } from "common/small";
import { content } from "./content";

const carrying = new PlayerState(CARRY_STATE.carrying, stateNumber);
const carriedBy = new PlayerState(CARRY_STATE.carriedBy, stateNumber);
const dead = new PlayerState(PLAYER_BAGS.dead, stateBoolean);
const cuffed = new PlayerState(PLAYER_BAGS.cuffed, stateBoolean);
const REACH = 2;
const ASK_MS = 10_000;
/** After a declined ask the carrier waits this long before asking anyone again. */
const ASK_COOLDOWN_MS = 30_000;
const asks = new Cooldowns();

/** Who carries whom; a pair is written into both player states (each client plays its own part). */
class Carries {
  /** Carried players who agreed (they may get down themselves). */
  private readonly agreed = new Set<number>();
  private readonly asking = new Set<number>();

  busy(source: number): boolean {
    return (
      carrying.get(source) !== undefined ||
      carriedBy.get(source) !== undefined ||
      this.asking.has(source)
    );
  }

  start(carrier: number, target: number, agreed: boolean): void {
    carrying.set(carrier, target);
    carriedBy.set(target, carrier);
    if (agreed) this.agreed.add(target);
  }

  /** Ends the pair `source` is part of; a carried player gets down only when they agreed to be carried. */
  stop(source: number, asCarried = false): boolean {
    const target = carrying.get(source);
    const carrier = carriedBy.get(source);
    if (target !== undefined) this.end(source, target);
    else if (carrier !== undefined && (!asCarried || this.agreed.has(source)))
      this.end(carrier, source);
    else return false;
    return true;
  }

  async ask(carrier: number, target: number): Promise<boolean> {
    this.asking.add(carrier).add(target);
    const name = online.name(carrier);
    const answer = await triggerClientCallback(
      EVENTS.carryAsk,
      target,
      [name],
      ASK_MS,
    ).catch(() => false);
    this.asking.delete(carrier);
    this.asking.delete(target);
    return answer === true;
  }

  private end(carrier: number, target: number): void {
    carrying.set(carrier, undefined);
    carriedBy.set(target, undefined);
    this.agreed.delete(target);
  }
}
const carries = new Carries();

/** The nearest player within reach who is free and on foot. */
const nearestFree = (source: number): number | null =>
  nearestPlayerTo(
    source,
    REACH,
    (other) =>
      !carries.busy(other) &&
      !GetVehiclePedIsIn(GetPlayerPed(String(other)), false),
  );

/**
 * Carry: the same action picks the nearest player up or puts them down (a carried player who agreed gets down with
 * it too). A player who is downed or cuffed is picked up at once; anyone else is asked first.
 */
onClientCallback(
  EVENTS.carry,
  async (source) => {
    if (carries.stop(source, true)) return { ok: true };
    if (!content.settings.carry || carries.busy(source))
      return fail("CARRY_ERR_NONE");
    if (GetVehiclePedIsIn(GetPlayerPed(String(source)), false))
      return fail("CARRY_ERR_NONE");
    const target = nearestFree(source);
    if (target === null) return fail("CARRY_ERR_NONE");
    const helpless = dead.get(target) === true || cuffed.get(target) === true;
    if (!helpless) {
      if (!asks.ready(source)) return fail("CARRY_ERR_WAIT");
      if (!(await carries.ask(source, target))) {
        asks.start(source, ASK_COOLDOWN_MS);
        return fail("CARRY_ERR_DECLINED");
      }
    }
    if (
      carries.busy(source) ||
      carries.busy(target) ||
      !isNear(source, coordsOf(target), REACH + 1)
    )
      return fail("CARRY_ERR_NONE");
    carries.start(source, target, !helpless);
    return { ok: true };
  },
  { lock: true },
);

// Leaving (drop, logout) ends the pair the player is part of.
onCharacter({ unloaded: (source) => void carries.stop(source) });
// A carrier who goes down drops the player.
on(CORE.playerDiedEvent, (source: unknown) => {
  if (typeof source === "number" && carrying.get(source) !== undefined)
    carries.stop(source);
});
