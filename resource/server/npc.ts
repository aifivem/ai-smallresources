import { GlobalKey, registerExport, stateBoolean } from "@aifivem/lib/server";
import { NPC_DISABLED } from "common/small";

/** No ambient pedestrians or traffic anywhere: every client sets the density to 0 and clears the area around it. */
const npcDisabled = new GlobalKey(NPC_DISABLED, stateBoolean);

registerExport("SetNpcDisabled", (on: unknown) => {
  if (typeof on !== "boolean") return false;
  npcDisabled.set(on ? true : undefined);
  return true;
});
registerExport("IsNpcDisabled", () => npcDisabled.get() === true);
