Bridge = {}

local core

local function detect()
    if Config.Framework ~= 'auto' then return Config.Framework end
    if GetResourceState('qbx_core') == 'started' then return 'qbox' end
    if GetResourceState('qb-core') == 'started' then return 'qb' end
    if GetResourceState('es_extended') == 'started' then return 'esx' end
    return 'standalone'
end

function Bridge.Init()
    local name = detect()
    if name == Bridge.Name then return end
    Bridge.Name = name
    if Bridge.Name == 'qb' then
        core = exports['qb-core']:GetCoreObject()
    elseif Bridge.Name == 'esx' then
        core = exports['es_extended']:getSharedObject()
    end
    print(('[tefox_notify] Framework: %s'):format(Bridge.Name))
end

local function getJob(src)
    if Bridge.Name == 'qbox' then
        local player = exports.qbx_core:GetPlayer(src)
        return player and player.PlayerData.job
    elseif Bridge.Name == 'qb' then
        local player = core.Functions.GetPlayer(src)
        return player and player.PlayerData.job
    elseif Bridge.Name == 'esx' then
        local xPlayer = core.GetPlayerFromId(src)
        return xPlayer and xPlayer.job
    end
end

function Bridge.GetPlayersByJob(jobName, onDutyOnly)
    if not Bridge.Name or Bridge.Name == 'standalone' then Bridge.Init() end
    local result = {}
    for _, id in ipairs(GetPlayers()) do
        local src = tonumber(id)
        local job = getJob(src)
        if job and job.name == jobName then
            local duty = job.onduty
            if duty == nil then duty = job.onDuty end
            if not onDutyOnly or duty ~= false then
                result[#result + 1] = src
            end
        end
    end
    return result
end