local function Notify(target, ...)
    TriggerClientEvent('tefox_notify:client:notify', target, ...)
end

exports('Notify', Notify)
exports('NotifyAll', function(...) Notify(-1, ...) end)

exports('NotifyJob', function(job, data, onDutyOnly)
    for _, src in ipairs(Bridge.GetPlayersByJob(job, onDutyOnly)) do
        Notify(src, data)
    end
end)

exports('Update', function(target, id, data)
    TriggerClientEvent('tefox_notify:client:update', target, id, data)
end)

exports('Remove', function(target, id)
    TriggerClientEvent('tefox_notify:client:remove', target, id)
end)

CreateThread(function()
    Wait(500)
    Bridge.Init()
end)

if Config.Announce.enabled then
    RegisterCommand(Config.Announce.command, function(_, args)
        local message = table.concat(args, ' ')
        if message == '' then return end
        Notify(-1, {
            title = Config.Announce.title,
            message = message,
            type = 'info',
            icon = 'bell',
            duration = Config.Announce.duration,
        })
    end, true)
end