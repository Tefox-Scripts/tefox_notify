local KVP = 'tefox_notify:settings'
local nuiReady, pending, counter = false, {}, 0
local defaults, settings

local function deepMerge(base, over)
    local out = {}
    for k, v in pairs(base) do
        local o = type(over) == 'table' and over[k] or nil
        if type(v) == 'table' then
            out[k] = deepMerge(v, type(o) == 'table' and o or nil)
        elseif o ~= nil and type(o) == type(v) then
            out[k] = o
        else
            out[k] = v
        end
    end
    return out
end

local function clamp(v, lo, hi)
    return math.max(lo, math.min(hi, v))
end

local function buildDefaults()
    local d = deepMerge(Config.Defaults, nil)
    d.sounds = {}
    for name, t in pairs(Config.Types) do
        d.sounds[name] = t.sound or 'pop'
    end
    return d
end

local function sanitize(s)
    s.scale = clamp(s.scale, 0.7, 1.4)
    s.opacity = clamp(s.opacity, 0.5, 1.0)
    s.volume = clamp(s.volume, 0.0, 1.0)
    s.customX = clamp(s.customX, 0, 100)
    s.customY = clamp(s.customY, 0, 100)
    s.customB = clamp(s.customB, 0, 100)
    return s
end

local function loadSettings()
    defaults = buildDefaults()
    local raw = GetResourceKvpString(KVP)
    local saved = raw and json.decode(raw) or nil
    settings = sanitize(deepMerge(defaults, saved))
end

local function send(msg)
    if nuiReady then
        SendNUIMessage(msg)
    elseif #pending < 50 then
        pending[#pending + 1] = msg
    end
end

local function normalize(a, b, c, d)
    if type(a) == 'table' then
        return {
            id = a.id,
            title = a.title or a.caption,
            message = a.message or a.description or a.text or a.msg,
            type = a.type or a.style or b,
            duration = a.duration or a.length or a.time,
            icon = a.icon,
            color = a.color or a.iconColor,
            persistent = a.persistent,
            sound = a.sound,
        }
    end
    return { message = a, type = b, duration = c, title = d }
end

local function Notify(...)
    local data = normalize(...)
    if data.message == nil and data.title == nil then return end
    if data.message ~= nil then data.message = tostring(data.message) end
    if data.title ~= nil then data.title = tostring(data.title) end
    if data.id == nil then
        counter = counter + 1
        data.id = ('auto:%d'):format(counter)
    end
    data.id = tostring(data.id)
    send({ action = 'notify', data = data })
    return data.id
end

local function Update(id, data)
    if id == nil or type(data) ~= 'table' then return end
    send({ action = 'update', id = tostring(id), data = normalize(data) })
end

local function Remove(id)
    if id ~= nil then send({ action = 'remove', id = tostring(id) }) end
end

local function Clear()
    send({ action = 'clear' })
end

local function OpenSettings()
    SetNuiFocus(true, true)
    send({ action = 'settings' })
end

exports('Notify', Notify)
exports('Update', Update)
exports('Remove', Remove)
exports('Clear', Clear)
exports('OpenSettings', OpenSettings)

RegisterNetEvent('tefox_notify:client:notify', Notify)
RegisterNetEvent('tefox_notify:client:update', Update)
RegisterNetEvent('tefox_notify:client:remove', Remove)

RegisterCommand(Config.SettingsCommand, OpenSettings, false)
RegisterKeyMapping(Config.SettingsCommand, 'Open notification settings', 'keyboard', Config.SettingsKey)

RegisterNUICallback('ready', function(_, cb)
    nuiReady = true
    SendNUIMessage({
        action = 'init',
        types = Config.Types,
        aliases = Config.TypeAliases,
        customSounds = Config.CustomSounds,
        settings = settings,
        defaults = defaults,
        maxVisible = Config.MaxVisible,
        overflow = Config.Overflow,
        defaultDuration = Config.DefaultDuration,
        merge = Config.MergeDuplicates,
    })
    for _, msg in ipairs(pending) do SendNUIMessage(msg) end
    pending = {}
    if Config.Storage == 'database' then
        TriggerServerEvent('tefox_notify:server:loadSettings')
    end
    cb(1)
end)

RegisterNUICallback('saveSettings', function(data, cb)
    if type(data) == 'table' then
        settings = sanitize(deepMerge(defaults, data))
        SetResourceKvp(KVP, json.encode(settings))
        if Config.Storage == 'database' then
            TriggerServerEvent('tefox_notify:server:saveSettings', settings)
        end
    end
    cb(1)
end)

RegisterNetEvent('tefox_notify:client:loadSettings', function(data)
    if type(data) ~= 'table' then
        if GetResourceKvpString(KVP) then
            TriggerServerEvent('tefox_notify:server:saveSettings', settings)
        end
        return
    end
    settings = sanitize(deepMerge(defaults, data))
    SetResourceKvp(KVP, json.encode(settings))
    SendNUIMessage({ action = 'sync', settings = settings })
end)

RegisterNUICallback('close', function(_, cb)
    SetNuiFocus(false, false)
    cb(1)
end)

local compat = {
    okokNotify = {
        event = 'okokNotify:Alert',
        handler = function(title, message, time, ntype)
            Notify({ title = title, message = message, duration = time, type = ntype })
        end,
    },
    mythic_notify = {
        event = 'mythic_notify:client:SendAlert',
        handler = function(data) Notify(data) end,
    },
}

CreateThread(function()
    loadSettings()
    for resource, entry in pairs(compat) do
        if Config.Compatibility[resource] and GetResourceState(resource) == 'missing' then
            RegisterNetEvent(entry.event, entry.handler)
        end
    end

    local paused, hour = false, -1
    while true do
        if nuiReady then
            local isPaused = Config.HideInPauseMenu and IsPauseMenuActive() or false
            if isPaused ~= paused then
                paused = isPaused
                SendNUIMessage({ action = 'visible', state = not paused })
            end
            local h = GetClockHours()
            if h ~= hour then
                hour = h
                SendNUIMessage({ action = 'clock', hour = h })
            end
        end
        Wait(500)
    end
end)

RegisterCommand('notifytest', function()
    local types = { 'success', 'error', 'warning', 'info', 'police', 'bank' }
    for i, t in ipairs(types) do
        SetTimeout(i * 400, function()
            exports.tefox_notify:Notify({ title = t:upper(), message = 'This is a **' .. t .. '** notification', type = t })
        end)
    end
    local id = exports.tefox_notify:Notify({ message = 'Loading...', type = 'info', persistent = true })
    SetTimeout(4000, function()
        exports.tefox_notify:Update(id, { message = 'Done!', type = 'success', persistent = false })
    end)
end, false)

RegisterCommand('notifyhooks', function()
    TriggerEvent('QBCore:Notify', 'QBCore hook works', 'success')
    TriggerEvent('esx:showNotification', 'ESX hook works', 'success')
    TriggerEvent('ox_lib:notify', { title = 'ox_lib', description = 'ox_lib hook works', type = 'success' })
end, false)