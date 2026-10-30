import {
  cache,
  controls,
  menu,
  onCache,
  onServerCallback,
  optionalExport,
  PlayerState,
  requestAnimDict,
  stateNumber,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { CARRY_STATE, EVENTS } from "common/small";
import { answered } from "./feedback";
import { content, onSettings } from "./settings";

const CARRIER = {
  dict: "missfinale_c2mcs_1",
  clip: "fin_c2_mcs_1_camman",
  flag: 49,
};
const CARRIED = { dict: "nm", clip: "firemans_carry", flag: 33 };
/** What a carried player cannot do: move, sprint, jump, fight, aim, enter vehicles, take cover, weapon wheel. */
const CARRIED_CONTROLS = [
  21, 22, 23, 24, 25, 30, 31, 32, 33, 34, 35, 37, 44, 140, 141, 142, 143, 257,
  263, 264,
];

const carrying = new PlayerState(CARRY_STATE.carrying, stateNumber);
const carriedBy = new PlayerState(CARRY_STATE.carriedBy, stateNumber);

/**
 * Fireman's carry: the server pairs the players and writes both player states; each of the two clients plays its own
 * part (the carried one attaches itself to the carrier). The animation is put back when something interrupts it.
 */
class Carry {
  private anim: typeof CARRIER | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  async request(): Promise<void> {
    answered(
      await triggerServerCallback(EVENTS.carry).catch(() => null),
      "CARRY_ERR_NONE",
    );
  }

  async start(anim: typeof CARRIER, carrier?: number): Promise<void> {
    if (!(await requestAnimDict(anim.dict).catch(() => false))) return;
    this.anim = anim;
    if (carrier !== undefined) {
      const ped = GetPlayerPed(GetPlayerFromServerId(carrier));
      if (ped)
        AttachEntityToEntity(
          cache.ped,
          ped,
          0,
          0.27,
          0.15,
          0.63,
          0.5,
          0.5,
          0,
          false,
          false,
          false,
          false,
          2,
          false,
        );
      controls.disable("carried", CARRIED_CONTROLS);
    }
    this.play();
    this.timer ??= setInterval(() => this.play(), 500);
  }

  stop(): void {
    if (!this.anim) return;
    this.anim = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    controls.enable("carried");
    DetachEntity(cache.ped, true, false);
    ClearPedSecondaryTask(cache.ped);
    ClearPedTasks(cache.ped);
  }

  private play(): void {
    const a = this.anim;
    if (a && !IsEntityPlayingAnim(cache.ped, a.dict, a.clip, 3))
      TaskPlayAnim(
        cache.ped,
        a.dict,
        a.clip,
        8,
        -8,
        -1,
        a.flag,
        0,
        false,
        false,
        false,
      );
  }
}

const carry = new Carry();
carrying.onChange((serverId, target) => {
  if (serverId !== cache.serverId) return;
  if (target !== undefined) void carry.start(CARRIER);
  else carry.stop();
});
carriedBy.onChange((serverId, carrier) => {
  if (serverId !== cache.serverId) return;
  if (carrier !== undefined) void carry.start(CARRIED, carrier);
  else carry.stop();
});
// A carrier who gets into a vehicle puts the player down first.
onCache("vehicle", (vehicle) => {
  if (vehicle !== false && carrying.get(cache.serverId) !== undefined)
    void carry.request();
});

onServerCallback(EVENTS.carryAsk, async (name) => {
  const picked = await menu({
    title: Locale("CARRY_ASK", typeof name === "string" ? name : "?"),
    items: [
      { id: "yes", label: Locale("CARRY_ACCEPT"), icon: "check" },
      { id: "no", label: Locale("CARRY_DECLINE"), icon: "xmark" },
    ],
  });
  return picked === "yes";
});

// The radial wheel item while the feature is on and ai-radialmenu runs.
function radial(): void {
  const wheel = optionalExport("ai-radialmenu");
  if (!content.settings.carry) return wheel?.RemoveItem("carry");
  wheel?.AddItem({
    id: "carry",
    label: Locale("CARRY_RADIAL"),
    icon: "people-carry-box",
    onSelect: () => void carry.request(),
  });
}
radial();
onSettings(radial);
on("onClientResourceStart", (resource: string) => {
  if (resource === "ai-radialmenu") radial();
});
