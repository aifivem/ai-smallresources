import {
  cache,
  every,
  getPlayerData,
  GlobalKey,
  locationName,
  onPlayerData,
  resourceExport,
  stateNumber,
} from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";
import {
  DISCORD_STATE,
  type DiscordPlaceholder,
  renderLine,
  usesPlaceholder,
} from "common/discord";
import { content, onContent } from "./settings";

const core = resourceExport("ai-core");
const players = new GlobalKey(DISCORD_STATE.players, stateNumber);
const maxPlayers = new GlobalKey(DISCORD_STATE.maxPlayers, stateNumber);
/** FiveM's JS natives pass null as a null pointer, which the Discord natives read as "back to FiveM's own". */
const FIVEM_DEFAULT = null as unknown as string;
/** A button with an empty label is left out of the presence (an https url passes the native's check). */
const NO_BUTTON = "https://";

/**
 * Discord Rich Presence from the panel's `discord` file. The presence text is written only when an input it shows
 * changed (panel edit, player count key, character, job, street); the street is read every 15 s only while a line
 * uses `{street}`. Discord's elapsed timer runs from the connection (FiveM sets it), never reset here.
 */
class Presence {
  /** This resource set the natives (only then a switch-off gives FiveM's own presence back). */
  private applied = false;
  /** Button slots this resource filled. */
  private buttons = 0;
  private text = "";
  private street = "";
  private jobLabel: { job: string; label: string } | null = null;
  private readonly streetJob = every(15_000, () => this.readStreet(), {
    active: false,
    name: "discord street",
  });

  apply(): void {
    const d = content.discord;
    const on = d.enabled && d.appId !== "";
    const streets = on && usesPlaceholder(d, "street");
    this.streetJob.set(streets);
    if (!on) {
      if (this.applied) this.reset();
      return;
    }
    this.applied = true;
    SetDiscordAppId(d.appId);
    SetDiscordRichPresenceAsset(d.largeImage);
    SetDiscordRichPresenceAssetText(d.largeText);
    SetDiscordRichPresenceAssetSmall(d.smallImage);
    SetDiscordRichPresenceAssetSmallText(d.smallText);
    for (let i = 0; i < 2; i++) {
      const button = d.buttons[i];
      if (button) SetDiscordRichPresenceAction(i, button.label, button.url);
      else if (i < this.buttons) SetDiscordRichPresenceAction(i, "", NO_BUTTON);
    }
    this.buttons = d.buttons.length;
    if (streets) this.street = locationName().street;
    this.text = "";
    this.refresh();
  }

  /** Writes the presence text when it differs from the last one. */
  refresh(): void {
    if (!this.applied) return;
    const d = content.discord;
    const value = (key: DiscordPlaceholder) => this.value(key);
    const top = renderLine(d.top, value);
    const bottom = renderLine(d.bottom, value);
    // FiveM sends the part before "\n" as Discord's state (second line) and the rest as details (first line).
    const text = top || bottom ? `${bottom}\n${top}` : "";
    if (text === this.text) return;
    this.text = text;
    SetRichPresence(text);
  }

  /** The job's definition changed: its label is read again on the next render. */
  forgetJob(job: string): void {
    if (this.jobLabel?.job !== job) return;
    this.jobLabel = null;
    this.refresh();
  }

  private value(key: DiscordPlaceholder): string {
    switch (key) {
      case "players":
        return String(players.get() ?? GetActivePlayers().length);
      case "maxPlayers":
        return String(maxPlayers.get() ?? GetConvarInt("sv_maxclients", 48));
      case "name": {
        const character = getPlayerData("character");
        return character
          ? `${character.firstname} ${character.lastname}`
          : GetPlayerName(cache.playerId);
      }
      case "id":
        return String(cache.serverId);
      case "job":
        return this.job();
      case "street":
        return this.street;
      default: {
        const _exhaustive: never = key;
        return _exhaustive;
      }
    }
  }

  /** The current job's label from ai-core's definitions, read once per job. */
  private job(): string {
    const job = getPlayerData("job")?.job;
    if (!job) return "";
    if (this.jobLabel?.job === job) return this.jobLabel.label;
    let jobs: Record<string, unknown> | null;
    try {
      jobs = core.GetDefinitions("jobs");
    } catch {
      // ai-core's client is not up yet: the job's name now, its label on the next change.
      return job;
    }
    const definition = jobs?.[job];
    const label =
      isRecord(definition) && typeof definition.label === "string"
        ? definition.label
        : job;
    this.jobLabel = { job, label };
    return label;
  }

  private readStreet(): void {
    const street = locationName().street;
    if (street === this.street) return;
    this.street = street;
    this.refresh();
  }

  private reset(): void {
    this.applied = false;
    SetDiscordAppId(FIVEM_DEFAULT);
    SetDiscordRichPresenceAsset(FIVEM_DEFAULT);
    SetDiscordRichPresenceAssetText(FIVEM_DEFAULT);
    SetDiscordRichPresenceAssetSmall(FIVEM_DEFAULT);
    SetDiscordRichPresenceAssetSmallText(FIVEM_DEFAULT);
    for (let i = 0; i < this.buttons; i++)
      SetDiscordRichPresenceAction(i, "", NO_BUTTON);
    this.buttons = 0;
    this.text = "";
    SetRichPresence("");
  }
}

const presence = new Presence();
presence.apply();
onContent("discord", () => presence.apply());
players.onChange(() => presence.refresh());
maxPlayers.onChange(() => presence.refresh());
onPlayerData("character", () => presence.refresh());
onPlayerData("job", () => presence.refresh());
on(CORE.clientDefinitionsEvent, (file: unknown, name: unknown) => {
  if (file === "jobs" && typeof name === "string") presence.forgetJob(name);
});
