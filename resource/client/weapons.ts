import { cache, controls, onCache, TickLoop } from "@aicore-fivem/lib/client";
import { content, onSettings } from "./settings";

/** GTA pickups (weapons, ammo, armour, health, money) as dead NPCs and the world drop them; `PICKUP_` is added. */
const PICKUPS = [
  "AMMO_BULLET_MP AMMO_FIREWORK AMMO_FLAREGUN AMMO_GRENADELAUNCHER AMMO_GRENADELAUNCHER_MP AMMO_HOMINGLAUNCHER",
  "AMMO_MG AMMO_MINIGUN AMMO_MISSILE_MP AMMO_PISTOL AMMO_RIFLE AMMO_RPG AMMO_SHOTGUN AMMO_SMG AMMO_SNIPER",
  "ARMOUR_STANDARD HEALTH_SNACK HEALTH_STANDARD MONEY_CASE MONEY_DEP_BAG MONEY_MED_BAG MONEY_PAPER_BAG",
  "MONEY_PURSE MONEY_SECURITY_CASE MONEY_VARIABLE MONEY_WALLET PARACHUTE VEHICLE_ARMOUR_STANDARD",
  "VEHICLE_HEALTH_STANDARD VEHICLE_HEALTH_STANDARD_LOW_GLOW VEHICLE_MONEY_VARIABLE VEHICLE_WEAPON_APPISTOL",
  "VEHICLE_WEAPON_ASSAULTSMG VEHICLE_WEAPON_COMBATPISTOL VEHICLE_WEAPON_GRENADE VEHICLE_WEAPON_MICROSMG",
  "VEHICLE_WEAPON_MOLOTOV VEHICLE_WEAPON_PISTOL VEHICLE_WEAPON_PISTOL50 VEHICLE_WEAPON_SAWNOFF",
  "VEHICLE_WEAPON_SMG VEHICLE_WEAPON_SMOKEGRENADE VEHICLE_WEAPON_STICKYBOMB",
  "WEAPON_ADVANCEDRIFLE WEAPON_APPISTOL WEAPON_ASSAULTRIFLE WEAPON_ASSAULTRIFLE_MK2 WEAPON_ASSAULTSHOTGUN",
  "WEAPON_ASSAULTSMG WEAPON_AUTOSHOTGUN WEAPON_BAT WEAPON_BATTLEAXE WEAPON_BOTTLE WEAPON_BULLPUPRIFLE",
  "WEAPON_BULLPUPRIFLE_MK2 WEAPON_BULLPUPSHOTGUN WEAPON_CARBINERIFLE WEAPON_CARBINERIFLE_MK2 WEAPON_CERAMICPISTOL",
  "WEAPON_COMBATMG WEAPON_COMBATMG_MK2 WEAPON_COMBATPDW WEAPON_COMBATPISTOL WEAPON_COMPACTLAUNCHER",
  "WEAPON_COMPACTRIFLE WEAPON_CROWBAR WEAPON_DAGGER WEAPON_DBSHOTGUN WEAPON_DOUBLEACTION WEAPON_FIREWORK",
  "WEAPON_FLAREGUN WEAPON_FLASHLIGHT WEAPON_GADGETPISTOL WEAPON_GOLFCLUB WEAPON_GRENADE WEAPON_GRENADELAUNCHER",
  "WEAPON_GUSENBERG WEAPON_HAMMER WEAPON_HATCHET WEAPON_HEAVYPISTOL WEAPON_HEAVYRIFLE WEAPON_HEAVYSHOTGUN",
  "WEAPON_HEAVYSNIPER WEAPON_HEAVYSNIPER_MK2 WEAPON_HOMINGLAUNCHER WEAPON_KNIFE WEAPON_KNUCKLE WEAPON_MACHETE",
  "WEAPON_MACHINEPISTOL WEAPON_MARKSMANPISTOL WEAPON_MARKSMANRIFLE WEAPON_MARKSMANRIFLE_MK2 WEAPON_MG",
  "WEAPON_MICROSMG WEAPON_MILITARYRIFLE WEAPON_MINIGUN WEAPON_MINISMG WEAPON_MOLOTOV WEAPON_MUSKET",
  "WEAPON_NAVYREVOLVER WEAPON_NIGHTSTICK WEAPON_PETROLCAN WEAPON_PIPEBOMB WEAPON_PISTOL WEAPON_PISTOL50",
  "WEAPON_PISTOL_MK2 WEAPON_PISTOLXM3 WEAPON_POOLCUE WEAPON_PROXMINE WEAPON_PUMPSHOTGUN WEAPON_PUMPSHOTGUN_MK2",
  "WEAPON_RAILGUN WEAPON_RAYCARBINE WEAPON_RAYMINIGUN WEAPON_RAYPISTOL WEAPON_REVOLVER WEAPON_REVOLVER_MK2",
  "WEAPON_RPG WEAPON_SAWNOFFSHOTGUN WEAPON_SMG WEAPON_SMG_MK2 WEAPON_SMOKEGRENADE WEAPON_SNIPERRIFLE",
  "WEAPON_SNSPISTOL WEAPON_SNSPISTOL_MK2 WEAPON_SPECIALCARBINE WEAPON_SPECIALCARBINE_MK2 WEAPON_STICKYBOMB",
  "WEAPON_STONE_HATCHET WEAPON_STUNGUN WEAPON_SWEEPERSHOTGUN WEAPON_SWITCHBLADE WEAPON_TACTICALRIFLE",
  "WEAPON_TECPISTOL WEAPON_VINTAGEPISTOL WEAPON_WRENCH",
]
  .join(" ")
  .split(" ")
  .map((name) => GetHashKey(`PICKUP_${name}`));

/** Melee attack keys (light, heavy, alternate). */
const MELEE_CONTROLS = [140, 141, 142];
/** The weapon reward is handed out while the player gets in; rewards stay off this long after a seat change. */
const REWARD_WINDOW_MS = 5000;

function applyPickups(): void {
  const allow = !content.settings.noPickups;
  for (const pickup of PICKUPS)
    ToggleUsePickupsForPlayer(cache.playerId, pickup, allow);
}

/** No critical hits and no blind peeking from cover for the local ped. */
function applyPed(): void {
  SetPedSuffersCriticalHits(cache.ped, !content.settings.noCriticalHits);
  SetPedConfigFlag(cache.ped, 95, content.settings.noCoverPeek);
}

/** With a gun in hand the melee keys do nothing (no pistol whip). */
function applyWhip(): void {
  const gun =
    content.settings.noPistolWhip &&
    cache.weapon !== false &&
    IsPedArmed(cache.ped, 2 | 4);
  if (gun) controls.disable("pistolwhip", MELEE_CONTROLS);
  else controls.enable("pistolwhip");
}

/** GTA's reward only holds for the frame it is called in, so it runs each frame for a moment after getting in. */
class VehicleRewards {
  private until = 0;
  private readonly frame = new TickLoop(() => {
    DisablePlayerVehicleRewards(cache.playerId);
    if (GetGameTimer() > this.until) this.frame.set(false);
  });

  entered(seat: number | false): void {
    if (seat === false || !content.settings.noVehicleRewards) return;
    this.until = GetGameTimer() + REWARD_WINDOW_MS;
    this.frame.set(true);
  }
}

const rewards = new VehicleRewards();
onCache("seat", (seat) => rewards.entered(seat));
onCache("ped", applyPed);
onCache("weapon", applyWhip);
applyPickups();
applyPed();
applyWhip();
onSettings(() => {
  applyPickups();
  applyPed();
  applyWhip();
});
