import {
  cache,
  input,
  notify,
  onServerEvent,
  progress,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { asArgs } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, NOTE_MAX } from "common/small";
import { answered } from "./feedback";

/** Fake plate: the server picked the vehicle; the player works on its plate, the server swaps it when done. */
onServerEvent(
  EVENTS.plateWork,
  {
    args: ([token, netId, removing]): [number, number, boolean] | null =>
      typeof token === "number" &&
      typeof netId === "number" &&
      typeof removing === "boolean"
        ? [token, netId, removing]
        : null,
  },
  async (token, netId, removing) => {
    if (NetworkDoesEntityExistWithNetworkId(netId))
      TaskTurnPedToFaceEntity(cache.ped, NetToVeh(netId), 800);
    const done = await progress({
      label: Locale(removing ? "PLATE_REMOVING" : "PLATE_FITTING"),
      duration: 6000,
      anim: {
        dict: "anim@amb@clubhouse@tutorial@bkr_tut_ig3@",
        clip: "machinic_loop_mechandplayer",
        flag: 1,
      },
    });
    ClearPedTasks(cache.ped);
    if (!done) return;
    if (
      answered(
        await triggerServerCallback(EVENTS.plateDone, [token]).catch(
          () => null,
        ),
      )
    )
      notify(Locale(removing ? "PLATE_REMOVED" : "PLATE_FITTED"), "success");
  },
);

/** Notepad: write a page, the server tears it off as a note item carrying the text. */
onServerEvent(
  EVENTS.noteWrite,
  { args: ([token]) => asArgs(typeof token === "number" ? token : null) },
  async (token) => {
    const values = await input({
      title: Locale("NOTE_WRITE_TITLE"),
      confirm: Locale("NOTE_WRITE_CONFIRM"),
      fields: [
        {
          name: "text",
          label: Locale("NOTE_TEXT"),
          type: "text",
          multiline: true,
          maxLength: NOTE_MAX,
          placeholder: Locale("NOTE_PLACEHOLDER"),
        },
      ],
    });
    const text = values?.text;
    if (typeof text !== "string" || !text) return;
    if (
      answered(
        await triggerServerCallback(EVENTS.noteSave, [token, text]).catch(
          () => null,
        ),
      )
    )
      notify(Locale("NOTE_SAVED"), "success");
  },
);

/** A note item read: its text in the dialog, nothing to edit. */
onServerEvent(
  EVENTS.noteRead,
  { args: ([text]) => asArgs(typeof text === "string" ? text : null) },
  (text) =>
    void input({
      title: Locale("NOTE_READ_TITLE"),
      confirm: Locale("NOTE_CLOSE"),
      fields: [
        {
          name: "text",
          label: Locale("NOTE_TEXT"),
          type: "text",
          multiline: true,
          readOnly: true,
          value: text,
          maxLength: NOTE_MAX,
        },
      ],
    }),
);
