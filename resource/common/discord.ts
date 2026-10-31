import { bool, record } from "@aicore-fivem/lib/shared";

/** Discord Rich Presence: panel file `discord` and the shared player counts. No natives. */

/** GlobalState keys (server written): players online now, the server's slots. */
export const DISCORD_STATE = {
  players: "aiPlayerCount",
  maxPlayers: "aiMaxPlayers",
};

/** Placeholders the presence lines may hold. */
export const DISCORD_PLACEHOLDERS = [
  "players",
  "maxPlayers",
  "name",
  "id",
  "job",
  "street",
] as const;
export type DiscordPlaceholder = (typeof DISCORD_PLACEHOLDERS)[number];

/** Discord's limits: a presence line or hover text, a button label, a button url. */
export const DISCORD_TEXT_MAX = 128;
export const DISCORD_LABEL_MAX = 32;
export const DISCORD_URL_MAX = 512;

export interface DiscordButton {
  label: string;
  url: string;
}

export interface DiscordSettings {
  enabled: boolean;
  /** The Discord application's id (public, from the Developer Portal). */
  appId: string;
  largeImage: string;
  largeText: string;
  smallImage: string;
  smallText: string;
  /** The first and second line under the server name, with `{placeholder}`s. */
  top: string;
  bottom: string;
  /** At most two; each with a label and an https url. */
  buttons: DiscordButton[];
}

const text = (value: unknown, max = DISCORD_TEXT_MAX): string =>
  typeof value === "string"
    ? value
        .replace(/[\r\n]+/g, " ")
        .trim()
        .slice(0, max)
    : "";

function readButton(raw: unknown): DiscordButton | null {
  const v = record(raw);
  const label = text(v.label, DISCORD_LABEL_MAX);
  const url = text(v.url, DISCORD_URL_MAX);
  return label && url.startsWith("https://") ? { label, url } : null;
}

export function readDiscord(raw: unknown): DiscordSettings {
  const v = record(raw);
  const appId = text(v.appId, 20);
  return {
    enabled: bool(v.enabled, false),
    appId: /^\d{17,20}$/.test(appId) ? appId : "",
    largeImage: text(v.largeImage),
    largeText: text(v.largeText),
    smallImage: text(v.smallImage),
    smallText: text(v.smallText),
    top: text(v.top),
    bottom: text(v.bottom),
    buttons: (Array.isArray(v.buttons) ? v.buttons : [])
      .map(readButton)
      .filter((b): b is DiscordButton => b !== null)
      .slice(0, 2),
  };
}

/** The line with every known `{placeholder}` replaced (`value` runs only for the ones present), cut to Discord's limit. */
export function renderLine(
  line: string,
  value: (key: DiscordPlaceholder) => string,
): string {
  return line
    .replace(/\{(\w+)\}/g, (match, key: string) =>
      (DISCORD_PLACEHOLDERS as readonly string[]).includes(key)
        ? value(key as DiscordPlaceholder)
        : match,
    )
    .slice(0, DISCORD_TEXT_MAX);
}

/** Either line uses `{key}`. */
export const usesPlaceholder = (
  s: DiscordSettings,
  key: DiscordPlaceholder,
): boolean => s.top.includes(`{${key}}`) || s.bottom.includes(`{${key}}`);
