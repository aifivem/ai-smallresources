import { hidePrompt, loadLocaleTexts, notify, onPromptPressed, showPrompt, triggerServerCallback, Zones } from "@aicore-fivem/lib/client";
import { record, sleep } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS } from "common/small";
import { content, onTeleports } from "./settings";

const texts = loadLocaleTexts();

/** A prompt at both ends of every teleport; the server moves the player to the other end behind a fade. */
class Teleports {
  private readonly zones = new Zones();
  private busy = false;

  rebuild(): void {
    this.zones.clear();
    for (const teleport of content.teleports.values())
      for (const end of ["from", "to"] as const) {
        const id = `tp:${teleport.id}:${end}`;
        this.zones.add(id, { shape: { type: "sphere", center: teleport[end], radius: 1.5 }, interval: 400, onEnter: () => showPrompt(id, Locale("SMALL_PROMPT_TELEPORT", teleport.label)), onExit: () => hidePrompt(id) });
      }
  }

  async use(id: string, end: "from" | "to"): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    DoScreenFadeOut(300);
    await sleep(350);
    const result = record(await triggerServerCallback(EVENTS.teleport, [id, end]).catch(() => null));
    if (result.ok !== true) {
      const key = typeof result.error === "string" ? result.error : "SMALL_ERR_FAR";
      notify(texts[key] ?? key, "error");
    } else await sleep(500);
    DoScreenFadeIn(300);
    this.busy = false;
  }
}

const teleports = new Teleports();
teleports.rebuild();
onTeleports(() => teleports.rebuild());
onPromptPressed((prompt) => {
  const [kind, id = "", end] = prompt.split(":");
  if (kind === "tp" && (end === "from" || end === "to")) void teleports.use(id, end);
});
