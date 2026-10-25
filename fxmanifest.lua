fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'tefox_notify'
author 'Tefox Scripts'
version '1.0.0'

shared_script 'config.lua'
client_script 'client/main.lua'
server_scripts { 'bridge/server.lua', 'server/storage.lua', 'server/main.lua', 'server/version.lua' }

ui_page 'web/index.html'
files { 'web/index.html', 'web/style.css', 'web/app.js', 'web/sounds/*', 'hooks/*.lua' }

escrow_ignore {
    'config.lua',
    'client/*.lua',
    'server/*.lua',
    'bridge/*.lua',
    'hooks/*.lua',
}