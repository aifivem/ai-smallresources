name 'ai-smallresources'
author 'ai-core'
version '0.1.0'
license 'GPL-3.0-only'
description 'Seatbelt, cruise control, crouch, tackle, binoculars, fireworks, teleports, AFK kick and world tweaks'
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
}
