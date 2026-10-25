local enabled = Config.Storage == 'database'
local ready = false
local lastSave = {}

local function query(sql, params)
    local p = promise.new()
    exports.oxmysql:query(sql, params, function(result) p:resolve(result) end)
    return Citizen.Await(p)
end

local function getLicense(src)
    return GetPlayerIdentifierByType(src, 'license')
end

CreateThread(function()
    if not enabled then return end
    if GetResourceState('oxmysql') ~= 'started' then
        print('^3[tefox_notify] oxmysql not started, using local KVP storage only^0')
        enabled = false
        return
    end
    query([[
        CREATE TABLE IF NOT EXISTS tefox_notify_settings (
            identifier VARCHAR(64) NOT NULL PRIMARY KEY,
            settings LONGTEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ]])
    ready = true
end)

RegisterNetEvent('tefox_notify:server:loadSettings', function()
    local src = source
    if not enabled or not ready then
        return TriggerClientEvent('tefox_notify:client:loadSettings', src, nil)
    end
    local license = getLicense(src)
    if not license then return end
    local rows = query('SELECT settings FROM tefox_notify_settings WHERE identifier = ?', { license })
    local data = rows and rows[1] and json.decode(rows[1].settings) or nil
    TriggerClientEvent('tefox_notify:client:loadSettings', src, data)
end)

RegisterNetEvent('tefox_notify:server:saveSettings', function(settings)
    local src = source
    if not enabled or not ready or type(settings) ~= 'table' then return end
    local now = GetGameTimer()
    if lastSave[src] and now - lastSave[src] < 1000 then return end
    lastSave[src] = now
    local encoded = json.encode(settings)
    if not encoded or #encoded > 4096 then return end
    local license = getLicense(src)
    if not license then return end
    query('INSERT INTO tefox_notify_settings (identifier, settings) VALUES (?, ?) ON DUPLICATE KEY UPDATE settings = VALUES(settings)', { license, encoded })
end)

AddEventHandler('playerDropped', function()
    lastSave[source] = nil
end)