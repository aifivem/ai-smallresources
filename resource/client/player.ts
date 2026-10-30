import {
  cache,
  Keybind,
  onServerEvent,
  player,
  TickLoop,
} from "@aicore-fivem/lib/client"
import { waitFor } from "@aicore-fivem/lib/shared"
import { Locale } from "common"
import { EVENTS } from "common/small"
import { content, onSettings } from "./settings"

const CROUCH = "move_ped_crouched"

/** Crouch walk toggled with a key. */
class Crouch {
  private crouched = false

  async toggle(): Promise<void> {
    if (
      !content.settings.crouch ||
      cache.vehicle !== false ||
      IsPedSwimming(cache.ped)
    )
      return
    this.crouched = !this.crouched
    if (!this.crouched) return ResetPedMovementClipset(cache.ped, 0.25)
    RequestAnimSet(CROUCH)
    await waitFor(() => HasAnimSetLoaded(CROUCH) || undefined, 3000).catch(
      () => false
    )
    SetPedMovementClipset(cache.ped, CROUCH, 0.25)
  }
}

const crouch = new Crouch()
new Keybind({
  name: "smallresources_crouch",
  description: Locale("KEYBIND_CROUCH"),
  defaultKey: "X",
  onPressed: () => void crouch.toggle(),
})

/** Sprinting into a player in front knocks both down; the server checks the distance. */
async function tackle(): Promise<void> {
  if (
    !content.settings.tackle ||
    cache.vehicle !== false ||
    !IsPedSprinting(cache.ped)
  )
    return
  const [x = 0, y = 0, z = 0] = GetOffsetFromEntityInWorldCoords(
    cache.ped,
    0,
    1.2,
    0
  )
  const target = GetActivePlayers().find((other: number) => {
    if (other === cache.playerId) return false
    const [px = 0, py = 0, pz = 0] = GetEntityCoords(GetPlayerPed(other), false)
    return Math.hypot(px - x, py - y, pz - z) <= 1.6
  })
  if (target === undefined) return
  emitNet(EVENTS.tackle, GetPlayerServerId(target))
  await player.playAnim("missmic2ig_11", "mic_2_ig_11_intro_goon", {
    duration: 1200,
    flag: 0,
  })
  setTimeout(
    () => SetPedToRagdoll(cache.ped, 1000, 1000, 0, false, false, false),
    700
  )
}
new Keybind({
  name: "smallresources_tackle",
  description: Locale("KEYBIND_TACKLE"),
  defaultKey: "G",
  onPressed: () => void tackle(),
})
onServerEvent(EVENTS.tackled, () =>
  SetPedToRagdoll(cache.ped, 3000, 3000, 0, false, false, false)
)

/** No police, ambulance or fire dispatch and no wanted level; GTA's own HUD pieces the ai-hud replaces stay hidden. */
const HIDDEN_HUD = [1, 2, 3, 4, 6, 7, 8, 9, 13, 17, 20]
const hideHud = new TickLoop(() => {
  for (const component of HIDDEN_HUD) HideHudComponentThisFrame(component)
})
function applyWorld(): void {
  const off = content.settings.noDispatch
  for (let service = 1; service <= 15; service++)
    EnableDispatchService(service, !off)
  SetMaxWantedLevel(off ? 0 : 5)
  hideHud.set(content.settings.hideHud)
}
applyWorld()
onSettings(applyWorld)
