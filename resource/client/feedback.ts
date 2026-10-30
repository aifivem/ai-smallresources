import { loadLocaleTexts, notify } from "@aicore-fivem/lib/client";
import { record } from "@aicore-fivem/lib/shared";

const texts = loadLocaleTexts();

/** Reads a `{ ok, error? }` answer: true when it worked, else notifies the error's lang text and returns false. */
export function answered(result: unknown, fallback = "SMALL_ERR_FAR"): boolean {
  const r = record(result);
  if (r.ok === true) return true;
  const key = typeof r.error === "string" ? r.error : fallback;
  notify(texts[key] ?? key, "error");
  return false;
}
