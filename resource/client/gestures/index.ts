import {
  cache,
  Keybind,
  onCache,
  registerExport,
  TickLoop,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { content } from "../settings";
import { sitting } from "../sit";
import { helpless, mine } from "./guards";
import { HandsUp } from "./handsUp";
import { Pointing } from "./pointing";

/** Ragdoll while the key is held: GTA's ragdoll kept alive every frame. */
const ragdoll = new TickLoop(() => {
  const ped = cache.ped;
  if (cache.vehicle !== false || helpless()) return ragdoll.set(false);
  SetPedRagdollForceFall(ped);
  ResetPedRagdollTimer(ped);
  SetPedToRagdoll(ped, 1000, 1000, 3, false, false, false);
});

const pointing = new Pointing(() => hands.down());
const hands = new HandsUp(() => pointing.stop());
new Keybind({
  name: "smallresources_point",
  description: Locale("KEYBIND_POINT"),
  defaultKey: "B",
  hint: "foot",
  icon: "hand-point-up",
  hintLabel: Locale("HINT_POINT"),
  onPressed: () => void pointing.toggle(),
});
new Keybind({
  name: "smallresources_handsup",
  description: Locale("KEYBIND_HANDS_UP"),
  defaultKey: "X",
  hint: "foot",
  icon: "hand",
  hintLabel: Locale("HINT_HANDSUP"),
  // X also stands up from a seat; that press is not a hands up.
  onPressed: () => {
    if (!sitting.seated) void hands.toggle();
  },
});
new Keybind({
  name: "smallresources_ragdoll",
  description: Locale("KEYBIND_RAGDOLL"),
  defaultKey: "M",
  hint: "foot",
  icon: "person-falling",
  hintLabel: Locale("HINT_RAGDOLL"),
  onPressed: () => {
    if (
      content.settings.ragdoll &&
      mine() &&
      IsPedOnFoot(cache.ped) &&
      !helpless()
    ) {
      pointing.stop();
      hands.down();
      ragdoll.set(true);
    }
  },
  onReleased: () => ragdoll.set(false),
});
onCache("vehicle", (vehicle) => {
  if (vehicle !== false) pointing.stop();
});

// Other scripts (a police search) ask whether the player shows their hands.
registerExport("IsHandsUp", () => hands.active);
registerExport("IsPointing", () => pointing.active);
