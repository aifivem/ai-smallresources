import type { WidgetSpec } from "@aicore-fivem/shared";

/** A switch with its `ADMIN_F_<key>` label and `ADMIN_H_<key>` hint. */
export const switchField = (path: string, key: string): WidgetSpec => ({
  widget: "switch",
  path,
  label: `ADMIN_F_${key}`,
  hint: `ADMIN_H_${key}`,
});
