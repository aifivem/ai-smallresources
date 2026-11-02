import { generators, NearAreas } from "./nearAreas";
import { content, onSettings } from "./settings";

/** Vehicle scenario points that put police, ambulance, fire and security vehicles at stations. */
const EMERGENCY_SCENARIOS = [
  "WORLD_VEHICLE_AMBULANCE",
  "WORLD_VEHICLE_FIRE_TRUCK",
  "WORLD_VEHICLE_POLICE_BIKE",
  "WORLD_VEHICLE_POLICE_CAR",
  "WORLD_VEHICLE_POLICE",
  "WORLD_VEHICLE_POLICE_NEXT_TO_CAR",
  "WORLD_VEHICLE_SECURITY_CAR",
  "WORLD_VEHICLE_HELI_LIFEGUARD",
];
const EMERGENCY_VEHICLES =
  "police police2 police3 police4 policeb policet sheriff sheriff2 fbi fbi2 pranger riot pbus polmav predator ambulance firetruk lguard rhino crusader barracks".split(
    " ",
  );
const EMERGENCY_PEDS =
  "s_m_y_cop_01 s_f_y_cop_01 s_m_y_sheriff_01 s_f_y_sheriff_01 s_m_y_hwaycop_01 s_m_y_swat_01 s_m_m_snowcop_01 s_m_y_ranger_01 s_f_y_ranger_01 s_m_m_paramedic_01 s_m_y_fireman_01 s_m_m_prisguard_01 s_m_y_marine_01 s_m_y_marine_02 s_m_y_marine_03 s_m_m_marine_01 s_m_m_marine_02 s_m_y_armymech_01".split(
    " ",
  );
const AIRCRAFT_SCENARIOS = [
  "WORLD_VEHICLE_MILITARY_PLANES_BIG",
  "WORLD_VEHICLE_MILITARY_PLANES_SMALL",
];
const AIRCRAFT_GROUPS = [
  "LSA_Planes",
  "SANDY_PLANES",
  "GRAPESEED_PLANES",
  "ng_planes",
  "ARMY_HELI",
];
const AIRCRAFT =
  "shamal luxor luxor2 jet lazer titan airtug ripley blimp".split(" ");
/** Car generators load with the map around the player (about 300 m); an area is cleared when the player comes this near. */
const STREAM_RANGE = 400;

/**
 * No GTA police, medics, firefighters or soldiers: random cops off, their vehicle scenarios off, their models never
 * spawned by the population. In the panel areas GTA's vehicle generators stay off as well.
 */
class EmergencySpawns {
  private readonly areas = new NearAreas(
    "emergencyAreas",
    STREAM_RANGE,
    (area) => {
      this.global(true);
      generators(area, false);
    },
  );

  apply(): void {
    const on = content.settings.noEmergencySpawns;
    this.global(on);
    for (const area of this.areas.list) generators(area, true);
    this.areas.set(on ? content.settings.emergencyAreas : []);
  }

  private global(on: boolean): void {
    SetCreateRandomCops(!on);
    SetCreateRandomCopsNotOnScenarios(!on);
    SetCreateRandomCopsOnScenarios(!on);
    for (const type of EMERGENCY_SCENARIOS) SetScenarioTypeEnabled(type, !on);
    for (const model of EMERGENCY_VEHICLES)
      SetVehicleModelIsSuppressed(GetHashKey(model), on);
    for (const model of EMERGENCY_PEDS)
      SetPedModelIsSuppressed(GetHashKey(model), on);
  }
}

const emergency = new EmergencySpawns();

/** Planes at the airports and the army base, jets over the map. */
function applyAircraft(): void {
  const on = content.settings.noAircraft;
  for (const type of AIRCRAFT_SCENARIOS) SetScenarioTypeEnabled(type, !on);
  for (const group of AIRCRAFT_GROUPS) SetScenarioGroupEnabled(group, !on);
  for (const model of AIRCRAFT)
    SetVehicleModelIsSuppressed(GetHashKey(model), on);
}

const SKY_SCENE = "CHARACTER_CHANGE_IN_SKY_SCENE";
/** Ambient zone with the distant police sounds. */
const POLICE_ZONE = "collision_ybmrar";

function applyAudio(): void {
  const s = content.settings;
  SetAudioFlag("PoliceScannerDisabled", s.noPoliceAudio);
  if (s.noPoliceAudio) {
    CancelCurrentPoliceReport();
    SetAmbientZoneState(POLICE_ZONE, false, false);
  } else ClearAmbientZoneState(POLICE_ZONE, false);
  SetAudioFlag("DisableFlightMusic", s.quietAmbience);
  if (s.quietAmbience && !IsAudioSceneActive(SKY_SCENE))
    StartAudioScene(SKY_SCENE);
  else if (!s.quietAmbience && IsAudioSceneActive(SKY_SCENE))
    StopAudioScene(SKY_SCENE);
}

function applyWorld(): void {
  emergency.apply();
  applyAircraft();
  applyAudio();
  SetGarbageTrucks(!content.settings.noGarbageTrucks);
  DisableIdleCamera(content.settings.noIdleCam);
  DisableVehiclePassengerIdleCamera(content.settings.noIdleCam);
}
applyWorld();
onSettings(applyWorld);
