import {
  cache,
  gestures,
  PlayerState,
  stateBoolean,
} from "@aicore-fivem/lib/client";
import { PLAYER_BAGS } from "@aicore-fivem/shared";

const dead = new PlayerState(PLAYER_BAGS.dead, stateBoolean);
const cuffed = new PlayerState(PLAYER_BAGS.cuffed, stateBoolean);
/** Another emote script (tgiann-emotes) does the gestures: these keys stay quiet so the two never fight. */
export const mine = () => gestures.provider() === "ai-smallresources";
export const helpless = () =>
  dead.get(cache.serverId) === true || cuffed.get(cache.serverId) === true;

/** Task ids of scripted animations, synced scenes and scenarios: GTA has no "plays any animation" check. */
const ANIM_TASKS = [134, 135, 118];
export const playingAnimation = (ped: number) =>
  ANIM_TASKS.some((task) => GetIsTaskActive(ped, task));
