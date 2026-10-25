-- =======================================================
-- [TEFOX] Auto Update Checker
--
-- Compares the version in fxmanifest.lua against the
-- published version file. Purely informational: nothing
-- here affects how the resource runs.
--
-- Set Config.CheckUpdates = false to disable.
-- =======================================================

local resourceName   = GetCurrentResourceName()
local currentVersion = GetResourceMetadata(resourceName, 'version', 0)

local updateUrl = "https://raw.githubusercontent.com/Tefox-Scripts/TEFOX-Versions/refs/heads/main/tefox_notify.txt"

CreateThread(function()
    if Config and Config.CheckUpdates == false then return end

    if not currentVersion then
        print("^3[TEFOX] No version set in fxmanifest.lua — update check skipped.^7")
        return
    end

    Wait(5000)

    PerformHttpRequest(updateUrl, function(code, data)
        if code ~= 200 or not data then
            print("^3[TEFOX] Update check unavailable for " .. resourceName .. ".^7")
            return
        end

        local latest  = data:gsub("%s+", "")
        local current = currentVersion:gsub("%s+", "")

        if latest == "" then return end

        print("^5==================================================================^7")
        print("^5[TEFOX Script] ^3" .. resourceName .. "^7")

        if current == latest then
            print("^2[SUCCESS] Running the latest version (" .. current .. ").^7")
            print("^2[INFO] Thank you for choosing TEFOX Scripts!^7")
            print("^2[DISCORD] Support, updates & free scripts: https://discord.gg/2sv4b9xRQD^7")
        else
            print("^1[UPDATE AVAILABLE] A new version is out!^7")
            print("^3[CURRENT] ^1" .. current .. " ^3| [LATEST] ^2" .. latest .. "^7")
            print("^3[DOWNLOAD] https://portal.cfx.re/assets^7")
            print("^3[CHANGELOG] See our Discord for patch notes: https://discord.gg/2sv4b9xRQD^7")
        end

        print("^5==================================================================^7")
    end, "GET", "", {})
end)