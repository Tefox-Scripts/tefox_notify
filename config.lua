Config = {}

Config.Framework = 'auto' -- auto | qb | esx | qbox | standalone
Config.SettingsCommand = 'notifysettings'
Config.SettingsKey = ''
Config.HideInPauseMenu = true
Config.CheckUpdates = true

Config.MaxVisible = 7
Config.Overflow = 'replace' -- replace | queue
Config.DefaultDuration = 5000
Config.MergeDuplicates = true
Config.Storage = 'database' -- 'database' (with local cache) or 'kvp'

Config.Compatibility = {
    okokNotify = true,
    mythic_notify = true,
}

Config.Announce = {
    enabled = true,
    command = 'announce',
    title = 'Server Announcement',
    duration = 10000,
}

Config.Defaults = {
    position = 'top-right',
    customX = 70, customY = 5, customB = 85,
    theme = 'dark',
    accent = '#7c5cff',
    unified = false,
    scale = 1.0,
    opacity = 0.92,
    animation = 'slide',
    volume = 0.5,
    muted = false,
}

-- icons: check, x, alert, info, shield, cross, card, bell, phone, car, star, lock (or an image url)
-- sounds: pop, chime, soft, alert, buzz, bell, radio, none (or a key from Config.CustomSounds)
Config.Types = {
    success   = { title = 'Success', color = '#22c55e', icon = 'check',  sound = 'chime' },
    error     = { title = 'Error',   color = '#ef4444', icon = 'x',      sound = 'buzz' },
    warning   = { title = 'Warning', color = '#f59e0b', icon = 'alert',  sound = 'alert' },
    info      = { title = 'Info',    color = '#3b82f6', icon = 'info',   sound = 'pop' },
    police    = { title = 'Police',  color = '#2563eb', icon = 'shield', sound = 'radio' },
    ambulance = { title = 'EMS',     color = '#ec4899', icon = 'cross',  sound = 'radio' },
    bank      = { title = 'Bank',    color = '#10b981', icon = 'card',   sound = 'chime' },
    phone     = { title = 'Phone',   color = '#8b5cf6', icon = 'phone',  sound = 'bell' },
}

Config.TypeAliases = {
    primary = 'info', inform = 'info', warn = 'warning', danger = 'error',
    ems = 'ambulance', medic = 'ambulance', cop = 'police',
}

Config.CustomSounds = {
    -- siren = 'sounds/siren.ogg',
}