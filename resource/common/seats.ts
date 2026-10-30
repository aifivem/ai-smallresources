import { bool, num, record, str } from "@aicore-fivem/lib/shared";

/** Seats on world objects (panel records keyed by anything, one model each). No natives. */

/** How a seat type seats the player: a GTA scenario, or an animation placed at the seat (z added to the seat). */
export type SeatPose =
  | { kind: "scenario"; name: string }
  | { kind: "anim"; dict: string; clip: string; z: number };

export const SEAT_TYPES = {
  chair: { kind: "scenario", name: "PROP_HUMAN_SEAT_CHAIR_MP_PLAYER" },
  armchair: { kind: "scenario", name: "PROP_HUMAN_SEAT_ARMCHAIR" },
  bench: { kind: "scenario", name: "PROP_HUMAN_SEAT_BENCH" },
  bar: { kind: "scenario", name: "PROP_HUMAN_SEAT_BAR" },
  deck: { kind: "scenario", name: "PROP_HUMAN_SEAT_DECKCHAIR" },
  sunlounger: { kind: "scenario", name: "PROP_HUMAN_SEAT_SUNLOUNGER" },
  strip: { kind: "scenario", name: "PROP_HUMAN_SEAT_STRIP_WATCH" },
  wall: { kind: "scenario", name: "WORLD_HUMAN_SEAT_WALL" },
  steps: { kind: "scenario", name: "WORLD_HUMAN_SEAT_STEPS" },
  ledge: { kind: "scenario", name: "WORLD_HUMAN_SEAT_LEDGE" },
  tattoo: {
    kind: "anim",
    dict: "misstattoo_parlour@shop_ig_4",
    clip: "customer_loop",
    z: -0.75,
  },
  lounge: {
    kind: "anim",
    dict: "timetable@jimmy@mics3_ig_15@",
    clip: "idle_a_jimmy",
    z: 0,
  },
  director: {
    kind: "anim",
    dict: "misscarsteal4@director_grip",
    clip: "beginning_loop_director",
    z: -1.16,
  },
} satisfies Record<string, SeatPose>;

export type SeatType = keyof typeof SEAT_TYPES;
const isSeatType = (v: unknown): v is SeatType =>
  typeof v === "string" && Object.hasOwn(SEAT_TYPES, v);

/** One place to sit, relative to the object: offset in metres, heading added to the object's. */
export interface SeatOffset {
  x: number;
  y: number;
  z: number;
  heading: number;
}

export interface SeatModel {
  /** Model name, or its hash as digits. */
  model: string;
  type: SeatType;
  /** Placed straight on the seat instead of walking there (bar stools, booths). */
  teleport: boolean;
  seats: SeatOffset[];
}

/** One seat record; null (left out) without a model or seats. */
export function readSeat(
  _id: string,
  v: Record<string, unknown>,
): SeatModel | null {
  const model = str(v.model, "", 64);
  const seats = (Array.isArray(v.seats) ? v.seats : []).map((row) => {
    const s = record(row);
    return {
      x: num(s.x, 0, -10, 10),
      y: num(s.y, 0, -10, 10),
      z: num(s.z, 0, -10, 10),
      heading: num(s.heading, 180, 0, 360),
    };
  });
  if (!model || !seats.length) return null;
  return {
    model,
    type: isSeatType(v.type) ? v.type : "chair",
    teleport: bool(v.teleport, false),
    seats,
  };
}
