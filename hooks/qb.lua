local originalNotify = QBCore.Functions.Notify

function QBCore.Functions.Notify(text, notifyType, length, ...)
    if GetResourceState('tefox_notify') == 'started' then
        if type(text) == 'table' then
            return exports.tefox_notify:Notify({ title = text.caption or text.title, message = text.text or text.description, type = notifyType, duration = length })
        end
        return exports.tefox_notify:Notify({ message = text, type = notifyType, duration = length })
    end
    return originalNotify(text, notifyType, length, ...)
end