import {
  cache,
  callAction,
  input,
  notify,
  onServerEvent,
  progress,
} from "@aicore-fivem/lib/client";
import { asArgs, oneArg, readId } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import { EVENTS, NOTE_MAX } from "common/small";
import { FALLBACK } from "./settings";

/** Fake plate: the server picked the vehicle; the player works on its plate, the server swaps it when done. */
onServerEvent(
  EVENTS.plateWork,
  {
    args: ([token, netId, removing]): [number, number, boolean] | null => {
      const t = readId(token);
      const id = readId(netId);
      return t !== null && id !== null && typeof removing === "boolean"
        ? [t, id, removing]
        : null;
    },
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
    if (await callAction(EVENTS.plateDone, [token], FALLBACK))
      notify(Locale(removing ? "PLATE_REMOVED" : "PLATE_FITTED"), "success");
  },
);

/** Notepad: write a page, the server tears it off as a note item carrying the text. */
onServerEvent(EVENTS.noteWrite, { args: oneArg(readId) }, async (token) => {
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
  if (await callAction(EVENTS.noteSave, [token, text], FALLBACK))
    notify(Locale("NOTE_SAVED"), "success");
});

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
