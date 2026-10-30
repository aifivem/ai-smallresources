# ai-smallresources

Small gameplay features, each behind a panel switch: seatbelt, cruise control, no seat shuffle, vehicle radio off, fake plates, boat ropes, crouch, finger pointing, sitting on objects, carrying players, tackle, anti ghost-peek, binoculars, firework, news gear and notepad items, AFK kick, no GTA dispatch / wanted level, hidden GTA HUD parts, ambient population, teleports between two points and elevators with floors. Depends on ai-core (prompts, progress, menus, jobs); uses the active inventory through ai-core's inventory layer (lib `inventory`) for the items.

## Decisions

- Windscreen ejection is GTA's own (`SetFlyThroughWindscreenParams`), only the speeds change with the belt.
- The seat belt reaches HUDs as the client local event `SEATBELT_EVENT` (boolean while the feature is on, null otherwise) and the client export `GetSeatbelt()` for late starters; ai-hud shows its belt warning from it. The exit key is blocked through lib `controls` while buckled.
- Every per-frame job (blocking keys, hiding HUD parts, the binocular camera, pointing, density multipliers) is a `TickLoop` that runs only while needed; anti ghost-peek checks every 50 ms only while armed.
- Item actions that need the player's client (firework placing, plate work, writing a note) are a server token: the item use sends it, the client answers it after its progress or dialog, the server checks the token, the time and the distance (`server/items.ts` `Pending`, `server/vehicles.ts`).
- Fireworks: the server fans the spot out to players within 400 m; effects are local per client.
- News gear: the server toggles the player state `aiHold` (item name or false); every client attaches a local prop to that player's ped (`resource/client/news.ts`).
- Carry: one action picks the nearest free player up or puts them down. A downed or cuffed player is picked up at once, anyone else answers a menu first (10 s); only a player who agreed can get down on their own. The pair lives in two player states, each client plays its own part (`client/carry.ts`). The action sits in the ai-radialmenu wheel.
- Fake plate: the real plate is kept in the vehicle state `aiRealPlate`; ai-vehicles saves owned vehicles with their real plate anyway. Fitting needs the vehicle's keys; the key holder gets keys for the plate the vehicle shows.
- Boat rope: a boat within 12 m of a panel mooring is frozen on the server and marked `aiMoored`; the boats are every class 14 model, found as vehicle model points.
- Seats are panel records (one model each, seat offsets relative to the object, a seat type = scenario or animation in `common/seats.ts`); seeded from a community sit list's vanilla and prop models. The nearest free seat of the object is taken; the getting-up prompt is ai-core's prompt.
- Notes: the notepad item stays; a note item carries `text` and a `description` (the inventory tooltip shows it) in its metadata; reading uses ai-core's input dialog with a read-only multiline field.

## Contracts

- Events and callbacks: `resource/common/small.ts`. Client local event `SEATBELT_EVENT` and export `GetSeatbelt()`; replicated player states `aiHold`, `aiCarrying`, `aiCarriedBy`; vehicle states `aiRealPlate`, `aiMoored`.
- Items: `binoculars`, `firework1`-`firework4`, `newscam`, `newsmic`, `newsboom`, `fakeplate`, `notepad`, `note` (ai-inventory `data/items.json`).
- Panel files: `settings`, `teleports`, `elevators`, `moorings`, `seats` (all `sync: "all"`).

## Entry points

- Server: panel content `resource/server/content.ts`, schema `server/schema.ts` (+ `settingsCards.ts`, `placeTabs.ts`), tackle and AFK `player.ts`, teleports and elevators `places.ts`, items `items.ts`, fake plate and boat rope `vehicles.ts`, carry `carry.ts`.
- Client: one module per feature in `resource/client/`; panel files `client/settings.ts`.
