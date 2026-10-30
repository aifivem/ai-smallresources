# ai-smallresources

Small gameplay features, each behind a panel switch: seatbelt, cruise control, no seat shuffle, crouch, tackle, binoculars, firework and news gear items, AFK kick, no GTA dispatch / wanted level, hidden GTA HUD parts, and teleports between two points. Depends on ai-core (prompts, progress, jobs); uses ai-inventory for the items. Research: `docs/research/ai-smallresources.md`.

## Decisions

- Windscreen ejection is GTA's own (`SetFlyThroughWindscreenParams`), only the speeds change with the belt.
- The local player state `seatbelt` (not replicated) is a boolean while the feature is on and null otherwise; ai-hud reads it for its belt warning.
- Every per-frame job (blocking the exit key while buckled, hiding HUD parts, the binocular camera) is a `TickLoop` that runs only while needed.
- Fireworks: the server fans the spot out to players within 400 m; effects are local per client.
- News gear: the server toggles the player state `aiHold` (item name or false); every client attaches a local prop to that player's ped (`resource/client/news.ts`).

## Contracts

- Events and callbacks: `resource/common/small.ts`. Local player state `seatbelt`, replicated player state `aiHold`.
- Items: `binoculars`, `firework1`-`firework4`, `newscam`, `newsmic`, `newsboom` (ai-inventory `data/items.json`).

## Entry points

- Server checks, items, AFK `resource/server/index.ts`; client modules `resource/client/` (driving, player, items, news, teleports), panel files `resource/client/settings.ts`.
