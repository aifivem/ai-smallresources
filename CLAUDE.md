# ai-smallresources

Small gameplay features, each behind a panel switch: seatbelt, cruise control, no seat shuffle, vehicle radio off, fake plates, boat ropes, crouch, finger pointing, hands up, falling over (ragdoll), sitting on objects, carrying players, tackle, anti ghost-peek, binoculars, firework, news gear and notepad items, AFK kick, no GTA dispatch / wanted level, hidden GTA HUD parts, ambient population, teleports between two points and elevators with floors. Depends on ai-core (prompts, progress, menus, jobs); uses the active inventory through ai-core's inventory layer (lib `inventory`) for the items.

## Decisions

- Windscreen ejection is GTA's own (`SetFlyThroughWindscreenParams`), only the speeds change with the belt.
- The seat belt reaches HUDs as the client local event `SEATBELT_EVENT` (boolean while the feature is on, null otherwise) and the client export `GetSeatbelt()` for late starters; ai-hud shows its belt warning from it. The exit key is blocked through lib `controls` while buckled.
- Every per-frame job (blocking keys, hiding HUD parts, the binocular camera, pointing, density multipliers) is a `TickLoop` that runs only while needed; anti ghost-peek checks every 50 ms only while armed.
- Gestures (`client/gestures.ts`): pointing stops by itself when the player aims, falls, fights or ragdolls; hands up (`random@mugging3`, also in vehicles) never starts over another script's animation (tasks 134 / 135 / 118) and ends when its animation is replaced, the player falls or dies; ragdoll lasts while its key is held.
- Firework placing and plate work run on the server with lib `progressFor` (firework 3 s, plate 6 s counted after 90 %, facing the vehicle); the item is taken and the plate swapped only if the player is still there afterwards (`server/items.ts`, `server/vehicles.ts`). Writing a note is a dialog, not a timed bar: a lib `PendingActions` token with `minRatio: 0` that the note text comes back with.
- Fireworks: the server fans the spot out to players within 400 m (lib `playersNear`, scope candidates); effects are local per client.
- News gear: the server toggles the player state `aiHold` (item name or false); every client attaches a local prop to that player's ped (`resource/client/news.ts`).
- Carry: one action picks the nearest free player up or puts them down. A downed or cuffed player is picked up at once, anyone else answers a menu first (10 s); only a player who agreed can get down on their own. The pair lives in two player states, each client plays its own part (`client/carry.ts`); leaving (drop, logout) ends the pair (`onCharacter` `unloaded`). After a declined ask the carrier waits 30 s before asking again (lib `Cooldowns`). The action is a lib `radial` item (whichever radial menu runs) shown while the setting is on (`canShow`).
- Fake plate: the real plate is kept in the vehicle state `aiRealPlate`; ai-vehicles saves owned vehicles with their real plate anyway. Fitting needs the vehicle's keys; the key holder gets keys for the plate the vehicle shows.
- Boat rope: a boat within 12 m of a panel mooring is frozen on the server and marked `aiMoored`; the boats are every class 14 model, found as vehicle model points. A boat another player drives is never tied or freed.
- Seats are panel records (one model each, seat offsets relative to the object, a seat type = scenario or animation in `common/seats.ts`); seeded from a community sit list's vanilla and prop models. The nearest free seat of the object is taken; the getting-up prompt is ai-core's prompt.
- Teleports and elevators: the server checks the end / floor the player stands at (and the job) and answers the target; the client teleports with lib `player.teleport` behind a fade (collision loaded).
- Binoculars and the news camera hide the HUD (lib `hud`) and show their zoom and close keybinds as key hints; zoom is two keybinds on the mouse wheel. Pointing's "blocked" probe reads the previous frame's async shape test.
- Notes: the notepad item stays; a note item carries `text` and a `description` (the inventory tooltip shows it) in its metadata; reading uses ai-core's input dialog with a read-only multiline field.

## Contracts

- Events and callbacks: `resource/common/small.ts`. Client local event `SEATBELT_EVENT` and export `GetSeatbelt()`; client exports `IsHandsUp()`, `IsPointing()`; replicated player states `aiHold`, `aiCarrying`, `aiCarriedBy`; vehicle states `aiRealPlate`, `aiMoored`.
- Items: `binoculars`, `firework1`-`firework4`, `newscam`, `newsmic`, `newsboom`, `fakeplate`, `notepad`, `note` (ai-inventory `data/items.json`).
- Panel files: `settings`, `teleports`, `elevators`, `moorings`, `seats` (all `sync: "all"`).

## Entry points

- Server: panel content `resource/server/content.ts`, schema `server/schema.ts` (+ `settingsCards.ts`, `placeTabs.ts`), tackle and AFK `player.ts`, teleports and elevators `places.ts`, items `items.ts`, fake plate and boat rope `vehicles.ts`, carry `carry.ts`.
- Client: one module per feature in `resource/client/`; panel files `client/settings.ts`.
