/** Item props and effects (no natives). */

/** Player state key (server written): the news item the player holds, or false. */
export const HOLD_STATE = "aiHold";

/** News items: the prop, where it sits on the ped and the animation the holder plays. */
export const NEWS_ITEMS: Record<
  string,
  {
    model: string;
    bone: number;
    offset: [number, number, number, number, number, number];
    dict: string;
    clip: string;
  }
> = {
  newscam: {
    model: "prop_v_cam_01",
    bone: 28422,
    offset: [0, 0, 0, 0, 0, 0],
    dict: "missfinale_c2mcs_1",
    clip: "fin_c2_mcs_1_camman",
  },
  newsmic: {
    model: "p_ing_microphonel_01",
    bone: 60309,
    offset: [0.055, 0.05, 0, 240, 0, 0],
    dict: "missheistdocksprep1hold_cellphone",
    clip: "hold_cellphone",
  },
  newsboom: {
    model: "prop_v_bmike_01",
    bone: 28422,
    offset: [-0.08, 0, 0, 0, 0, 0],
    dict: "missfra1",
    clip: "mcs2_crew_idle_m_boom",
  },
};

/** Player state key (server written): true while the player wears the dive gear. */
export const DIVE_STATE = "aiDiving";

/** Dive gear props (qbx_divegear): model, bone and offset on the ped. */
export const DIVE_PROPS: Array<{
  model: string;
  bone: number;
  offset: [number, number, number, number, number, number];
}> = [
  {
    model: "p_s_scuba_tank_s",
    bone: 24818,
    offset: [-0.25, -0.25, 0, 180, 90, 0],
  },
  { model: "p_d_scuba_mask_s", bone: 12844, offset: [0, 0, 0, 180, 90, 0] },
];

/** Firework items and the particle asset and effects each one shows. */
export const FIREWORKS: Record<string, { asset: string; effects: string[] }> = {
  firework1: {
    asset: "proj_indep_firework",
    effects: [
      "scr_indep_firework_grd_burst",
      "scr_indep_launcher_sparkle_spawn",
      "scr_indep_firework_air_burst",
      "proj_indep_flare_trail",
    ],
  },
  firework2: {
    asset: "proj_indep_firework_v2",
    effects: [
      "scr_firework_indep_burst_rwb",
      "scr_firework_indep_spiral_burst_rwb",
      "scr_xmas_firework_sparkle_spawn",
      "scr_firework_indep_ring_burst_rwb",
      "scr_firework_indep_repeat_burst_rwb",
    ],
  },
  firework3: {
    asset: "proj_xmas_firework",
    effects: [
      "scr_firework_xmas_ring_burst_rgw",
      "scr_firework_xmas_burst_rgw",
      "scr_firework_xmas_repeat_burst_rgw",
      "scr_firework_xmas_spiral_burst_rgw",
      "scr_xmas_firework_sparkle_spawn",
    ],
  },
  firework4: {
    asset: "scr_indep_fireworks",
    effects: [
      "scr_indep_firework_sparkle_spawn",
      "scr_indep_firework_starburst",
      "scr_indep_firework_shotburst",
      "scr_indep_firework_trailburst",
      "scr_indep_firework_fountain",
    ],
  },
};
