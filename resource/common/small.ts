import { bool, int, record, str, vec4, type Vec4 } from "@aicore-fivem/lib/shared";

/** ai-smallresources' contracts and panel content. No natives. */

export const EVENTS = {
  /** Client -> server: (targetServerId) tackle the player in front. */
  tackle: "ai-smallresources:tackle",
  /** Server -> tackled player: () fall down. */
  tackled: "ai-smallresources:client:tackled",
  /** Callback: (teleportId, end: "from" | "to") -> { ok } go to the other end. */
  teleport: "ai-smallresources:teleport",
  /** Server -> player: () the binoculars item was used. */
  binoculars: "ai-smallresources:client:binoculars",
  /** Server -> player: (token) place the firework (progress). */
  fireworkPlace: "ai-smallresources:client:fireworkPlace",
  /** Callback: (token) -> { ok } the firework is placed. */
  fireworkPlaced: "ai-smallresources:fireworkPlaced",
  /** Server -> players nearby: (x, y, z, item) a firework item goes off there. */
  firework: "ai-smallresources:client:firework",
} as const;

export interface Settings {
  seatbelt: boolean;
  /** km/h above which a crash throws the driver through the windscreen, without and with the belt. */
  ejectUnbelted: number;
  ejectBelted: number;
  cruise: boolean;
  crouch: boolean;
  noShuffle: boolean;
  noDispatch: boolean;
  hideHud: boolean;
  tackle: boolean;
  /** Minutes without moving before a player is kicked (0 = off). */
  afkMinutes: number;
  binoculars: boolean;
  fireworks: boolean;
}

export function readSettings(raw: unknown): Settings {
  const v = record(raw);
  return {
    seatbelt: bool(v.seatbelt, true),
    ejectUnbelted: int(v.ejectUnbelted, 20, 0, 500),
    ejectBelted: int(v.ejectBelted, 160, 0, 500),
    cruise: bool(v.cruise, true),
    crouch: bool(v.crouch, true),
    noShuffle: bool(v.noShuffle, true),
    noDispatch: bool(v.noDispatch, true),
    hideHud: bool(v.hideHud, true),
    tackle: bool(v.tackle, true),
    afkMinutes: int(v.afkMinutes, 20, 0, 600),
    binoculars: bool(v.binoculars, true),
    fireworks: bool(v.fireworks, true),
  };
}

export interface Teleport {
  id: string;
  label: string;
  from: Vec4;
  to: Vec4;
  /** Empty: everyone; otherwise members of this job. */
  job: string;
}

export function readTeleports(raw: unknown): Map<string, Teleport> {
  const out = new Map<string, Teleport>();
  const zero = { x: 0, y: 0, z: 0, heading: 0 };
  for (const [id, value] of Object.entries(record(raw))) {
    const v = record(value);
    out.set(id, { id, label: str(v.label, id, 48), from: vec4(v.from, zero), to: vec4(v.to, zero), job: str(v.job, "", 32) });
  }
  return out;
}

/** Player state key (server written): the news item the player holds, or false. */
export const HOLD_STATE = "aiHold";

/** News items: the prop, where it sits on the ped and the animation the holder plays. */
export const NEWS_ITEMS: Record<string, { model: string; bone: number; offset: [number, number, number, number, number, number]; dict: string; clip: string }> = {
  newscam: { model: "prop_v_cam_01", bone: 28422, offset: [0, 0, 0, 0, 0, 0], dict: "missfinale_c2mcs_1", clip: "fin_c2_mcs_1_camman" },
  newsmic: { model: "p_ing_microphonel_01", bone: 60309, offset: [0.055, 0.05, 0, 240, 0, 0], dict: "missheistdocksprep1hold_cellphone", clip: "hold_cellphone" },
  newsboom: { model: "prop_v_bmike_01", bone: 28422, offset: [-0.08, 0, 0, 0, 0, 0], dict: "missfra1", clip: "mcs2_crew_idle_m_boom" },
};

/** Firework items and the particle asset and effects each one shows. */
export const FIREWORKS: Record<string, { asset: string; effects: string[] }> = {
  firework1: { asset: "proj_indep_firework", effects: ["scr_indep_firework_grd_burst", "scr_indep_launcher_sparkle_spawn", "scr_indep_firework_air_burst", "proj_indep_flare_trail"] },
  firework2: {
    asset: "proj_indep_firework_v2",
    effects: ["scr_firework_indep_burst_rwb", "scr_firework_indep_spiral_burst_rwb", "scr_xmas_firework_sparkle_spawn", "scr_firework_indep_ring_burst_rwb", "scr_firework_indep_repeat_burst_rwb"],
  },
  firework3: {
    asset: "proj_xmas_firework",
    effects: ["scr_firework_xmas_ring_burst_rgw", "scr_firework_xmas_burst_rgw", "scr_firework_xmas_repeat_burst_rgw", "scr_firework_xmas_spiral_burst_rgw", "scr_xmas_firework_sparkle_spawn"],
  },
  firework4: {
    asset: "scr_indep_fireworks",
    effects: ["scr_indep_firework_sparkle_spawn", "scr_indep_firework_starburst", "scr_indep_firework_shotburst", "scr_indep_firework_trailburst", "scr_indep_firework_fountain"],
  },
};
