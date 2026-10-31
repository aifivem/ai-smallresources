name 'ai-smallresources'
author 'TGIANN'
version '0.2.0' -- x-release-please-version
license 'GPL-3.0-only'
description 'Seatbelt, cruise control, crouch, pointing, sitting, carrying, tackle, anti ghost-peek, items, fake plates, boat ropes, teleports, elevators, population and world tweaks'
repository 'https://github.com/aifivem/ai-smallresources'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'


dependencies {
	'/onesync',
	'ai-core',
}

files {
	'locales/*.json',
	'data/settings.json',
	'data/teleports.json',
	'data/elevators.json',
	'data/moorings.json',
	'data/seats.json',
}
