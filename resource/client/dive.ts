import {
  attachProp,
  cache,
  every,
  onServerCallback,
  onServerEvent,
  onStop,
  playerPed,
  PlayerState,
  stateBoolean,
  TickLoop,
} from "@aicore-fivem/lib/client";
import { readInt } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { DIVE_PROPS, DIVE_STATE } from "common/items";
import { EVENTS } from "common/small";

/** Breathing time GTA gives with scuba on; the air count, not GTA, ends it. */
const SCUBA_SECONDS = 2000;

/**
 * Dive gear: every client puts a local tank and mask on each player whose state says so; the wearer breathes
 * underwater while the tank has air, spends one second of air per second underwater and reports it every 10 s.
 */
class DiveGear {
  private readonly props = new Map<number, number[]>();
  private worn = false;
  private air = 0;
  private label = "";
  private readonly breath = every(1000, () => this.tick(), {
    active: false,
    name: "dive",
  });
  private readonly text = new TickLoop(() => this.draw());

  /** Puts the gear on a player (by server id) or takes it off. */
  async dress(serverId: number, on: boolean): Promise<void> {
    for (const prop of this.props.get(serverId) ?? []) DeleteObject(prop);
    this.props.delete(serverId);
    const ped = playerPed(serverId);
    if (!on || !ped) return;
    const made: number[] = [];
    this.props.set(serverId, made);
    for (const gear of DIVE_PROPS) {
      const [ox, oy, oz, rx, ry, rz] = gear.offset;
      const prop = await attachProp(gear.model, {
        ped,
        bone: gear.bone,
        offset: { x: ox, y: oy, z: oz },
        rotation: { x: rx, y: ry, z: rz },
      });
      // Taken off while the model loaded.
      if (this.props.get(serverId) !== made) {
        if (prop) DeleteObject(prop);
        return;
      }
      if (prop) made.push(prop);
    }
  }

  /** The server put the gear on with `air` seconds, or took it off (null). */
  wear(air: number | null): void {
    this.worn = air !== null;
    this.setAir(air ?? 0);
    this.breath.set(this.worn);
    if (!this.worn) this.text.set(false);
    this.scuba(this.worn && this.air > 0, this.worn ? 1 : 50);
  }

  stop(): void {
    for (const serverId of this.props.keys()) void this.dress(serverId, false);
    if (this.worn) this.wear(null);
  }

  private setAir(air: number): void {
    this.air = air;
    this.label = Locale("DIVE_AIR", air);
  }

  /** Scuba on, or off with GTA's breath-hold time set to `seconds`. */
  private scuba(on: boolean, seconds: number): void {
    SetEnableScuba(cache.ped, on);
    SetPedMaxTimeUnderwater(cache.ped, on ? SCUBA_SECONDS : seconds);
  }

  private tick(): void {
    const under = IsPedSwimmingUnderWater(cache.ped);
    this.text.set(under);
    if (!under || this.air <= 0) return;
    this.setAir(this.air - 1);
    if (this.air === 0) {
      this.scuba(false, 1);
      emitNet(EVENTS.diveAir, 0);
    } else if (this.air % 10 === 0) emitNet(EVENTS.diveAir, this.air);
  }

  private draw(): void {
    SetTextFont(4);
    SetTextScale(0.45, 0.45);
    SetTextColour(255, 255, 255, 230);
    SetTextOutline();
    SetTextCentre(true);
    BeginTextCommandDisplayText("STRING");
    AddTextComponentSubstringPlayerName(this.label);
    EndTextCommandDisplayText(0.5, 0.93);
  }
}

const gear = new DiveGear();
new PlayerState(DIVE_STATE, stateBoolean).onChange((serverId, on) => {
  void gear.dress(serverId, on === true);
});
onServerEvent(
  EVENTS.diveGear,
  { args: ([air]) => [air == null ? null : readInt(air, 0, 3600)] as const },
  (air) => gear.wear(air),
);
onServerCallback(EVENTS.diveWater, () => ({
  swimming: IsPedSwimming(cache.ped),
  underwater: IsPedSwimmingUnderWater(cache.ped),
}));
onStop(() => gear.stop());
