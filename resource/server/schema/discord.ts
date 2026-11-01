import type {
  DataSpec,
  FileSpec,
  TabSpec,
  WidgetSpec,
} from "@aicore-fivem/shared";
import {
  DISCORD_LABEL_MAX,
  DISCORD_TEXT_MAX,
  DISCORD_URL_MAX,
} from "common/discord";

const TEXT: DataSpec = { type: "text", min: 0, max: DISCORD_TEXT_MAX };

const DEFAULTS = {
  enabled: false,
  appId: "",
  largeImage: "",
  largeText: "",
  smallImage: "",
  smallText: "",
  top: "{players}/{maxPlayers} players",
  bottom: "Playing as {name}",
  buttons: [],
};

/** Data model of `data/discord.json`. */
export const discordFile: FileSpec = {
  kind: "settings",
  sync: "all",
  sections: {
    enabled: { type: "bool" },
    appId: { type: "text", min: 0, max: 20, pattern: "^(\\d{17,20})?$" },
    largeImage: TEXT,
    largeText: TEXT,
    smallImage: TEXT,
    smallText: TEXT,
    top: TEXT,
    bottom: TEXT,
    buttons: {
      type: "list",
      max: 2,
      of: {
        type: "object",
        fields: {
          label: { type: "text", min: 1, max: DISCORD_LABEL_MAX },
          url: {
            type: "text",
            min: 9,
            max: DISCORD_URL_MAX,
            pattern: "^https://\\S+$",
          },
        },
      },
    },
  },
  defaults: DEFAULTS,
};

/** A text field with its `ADMIN_F_DISCORD_<key>` label, hint and placeholder. */
const text = (path: string, key: string): WidgetSpec => ({
  widget: "text",
  path,
  label: `ADMIN_F_DISCORD_${key}`,
  hint: `ADMIN_H_DISCORD_${key}`,
  placeholder: `ADMIN_P_DISCORD_${key}`,
});

/** The Discord tab: Rich Presence shown on every player's Discord profile while they play. */
export const discordTab: TabSpec = {
  id: "discord",
  file: "discord",
  icon: "comments",
  label: "ADMIN_TAB_DISCORD",
  desc: "ADMIN_TAB_DISCORD_DESC",
  cards: [
    {
      icon: "id-card",
      title: "ADMIN_C_DISCORD_APP",
      desc: "ADMIN_C_DISCORD_APP_DESC",
      fields: [
        {
          widget: "switch",
          path: "enabled",
          label: "ADMIN_F_DISCORD_ENABLED",
          hint: "ADMIN_H_DISCORD_ENABLED",
        },
        text("appId", "APP_ID"),
      ],
    },
    {
      icon: "image",
      title: "ADMIN_C_DISCORD_IMAGES",
      desc: "ADMIN_C_DISCORD_IMAGES_DESC",
      fields: [
        text("largeImage", "LARGE_IMAGE"),
        text("largeText", "LARGE_TEXT"),
        text("smallImage", "SMALL_IMAGE"),
        text("smallText", "SMALL_TEXT"),
      ],
    },
    {
      icon: "comments",
      title: "ADMIN_C_DISCORD_TEXT",
      desc: "ADMIN_C_DISCORD_TEXT_DESC",
      fields: [text("top", "TOP"), text("bottom", "BOTTOM")],
    },
    {
      icon: "hand-pointer",
      title: "ADMIN_C_DISCORD_BUTTONS",
      desc: "ADMIN_C_DISCORD_BUTTONS_DESC",
      fields: [
        {
          widget: "list",
          path: "buttons",
          label: "ADMIN_F_DISCORD_BUTTONS",
          hint: "ADMIN_H_DISCORD_BUTTONS",
          addLabel: "ADMIN_ADD_DISCORD_BUTTON",
          max: 2,
          newRow: { label: "", url: "https://" },
          rows: [text("label", "BUTTON_LABEL"), text("url", "BUTTON_URL")],
        },
      ],
    },
  ],
};
