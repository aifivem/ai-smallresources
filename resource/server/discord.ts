import { every, GlobalKey, stateNumber } from "@aicore-fivem/lib/server";
import { record } from "@aicore-fivem/lib/shared";
import { DISCORD_STATE } from "common/discord";
import { content, panel } from "./content";

/** Players online and the server's slots for the presence's `{players}` / `{maxPlayers}` (one value every client reads). */
const players = new GlobalKey(DISCORD_STATE.players, stateNumber);
const maxPlayers = new GlobalKey(DISCORD_STATE.maxPlayers, stateNumber);

/** Sets the count when it changed. Joins and leaves of one 5 s window are one set (a refill after a restart is not one per join). */
function publish(): void {
  const count = GetNumPlayerIndices();
  if (players.get() !== count) players.set(count);
}
const flush = every(
  5000,
  () => {
    flush.set(false);
    publish();
  },
  { active: false, name: "discord players" },
);

function apply(): void {
  if (!content.discord.enabled) {
    flush.set(false);
    return;
  }
  const max = GetConvarInt("sv_maxclients", 48);
  if (maxPlayers.get() !== max) maxPlayers.set(max);
  publish();
}

const changed = () => {
  if (content.discord.enabled) flush.set(true);
};
on("playerJoining", changed);
on("playerDropped", changed);

panel.rule("discord", (_key, next) => {
  const v = record(next);
  return v.enabled === true && !v.appId ? "ADMIN_ERR_DISCORD_APP_ID" : null;
});
apply();
panel.onChange("discord", apply);
