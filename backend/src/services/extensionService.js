const { initialExtensions } = require("../data/sampleExtensions");

// Clone initial catalog into working state
let extensions = initialExtensions.map((item) => ({
    ...item,
    settings: { ...item.settings }
}));

function getSameTypeGroups(items) {
    const map = new Map();
    for (const item of items) {
        if (!map.has(item.type)) {
            map.set(item.type, []);
        }
        map.get(item.type).push(item);
    }

    const conflicts = [];
    for (const [type, group] of map.entries()) {
        if (group.length > 1) {
            conflicts.push({
                type,
                requiresSelection: true,
                items: group
            });
        }
    }
    return conflicts;
}

function getTabPayload(tab) {
    const validTabs = ["plugins", "marketplace", "skills"];
    const filtered = validTabs.includes(tab)
        ? extensions.filter((item) => item.tab === tab)
        : extensions;

    const installed = filtered.filter((item) => item.installed);
    const settings = installed.map((item) => ({
        id: item.id,
        name: item.name,
        tab: item.tab,
        type: item.type,
        active: item.active,
        settings: item.settings
    }));

    if (tab === "plugins") {
        const activeItem = installed.find((item) => item.active) || null;
        return {
            tab,
            items: filtered,
            installedCount: installed.length,
            requiresSelection: installed.length > 1,
            activeItem,
            settings
        };
    }

    if (tab === "marketplace") {
        const sameTypeSelections = getSameTypeGroups(installed);
        return {
            tab,
            items: filtered,
            installedCount: installed.length,
            activeItems: installed.filter((item) => item.active),
            sameTypeSelections,
            settings
        };
    }

    if (tab === "skills") {
        return {
            tab: "skills",
            target: "agent",
            items: filtered,
            installedCount: installed.length,
            activeAgentSkills: installed.filter((item) => item.active),
            settings
        };
    }

    return {
        tab: "all",
        items: filtered,
        settings
    };
}

function installExtension(id) {
    const target = extensions.find((item) => item.id === id);
    if (!target) {
        return { error: "Extension not found", status: 404 };
    }

    target.installed = true;
    if (!target.settings || Object.keys(target.settings).length === 0) {
        target.settings = { enabled: true };
    }

    if (target.tab === "plugins") {
        const installedPlugins = extensions.filter(
            (item) => item.tab === "plugins" && item.installed
        );
        if (installedPlugins.length === 1) {
            // Single installed plugin -> auto-activate
            target.active = true;
        } else {
            // Multiple installed plugins -> deactivate others until user selects one
            extensions.forEach((item) => {
                if (item.tab === "plugins" && item.id !== target.id) {
                    item.active = false;
                }
            });
            target.active = false;
        }
    } else if (target.tab === "marketplace" || target.tab === "skills") {
        // Activate upon install (different types stay active together)
        target.active = true;
    }

    return {
        status: 200,
        data: {
            installedItem: target,
            tabState: getTabPayload(target.tab)
        }
    };
}

function selectActiveExtension(id) {
    const target = extensions.find((item) => item.id === id);
    if (!target || !target.installed) {
        return { error: "Installed extension not found", status: 404 };
    }

    if (target.tab === "plugins") {
        // Only one plugin can be active at a time
        extensions.forEach((item) => {
            if (item.tab === "plugins") {
                item.active = item.id === target.id;
            }
        });
    } else if (target.tab === "marketplace") {
        // When multiple items of the same type exist, activate chosen one and deactivate same-type siblings
        extensions.forEach((item) => {
            if (
                item.tab === "marketplace" &&
                item.installed &&
                item.type === target.type
            ) {
                item.active = item.id === target.id;
            }
        });
    } else {
        target.active = true;
    }

    return {
        status: 200,
        data: {
            selectedItem: target,
            tabState: getTabPayload(target.tab)
        }
    };
}

function updateExtensionSettings(id, { active, settings }) {
    const target = extensions.find((item) => item.id === id);
    if (!target || !target.installed) {
        return { error: "Installed extension not found", status: 404 };
    }

    if (typeof active === "boolean") {
        if (active && target.tab === "plugins") {
            extensions.forEach((item) => {
                if (item.tab === "plugins") {
                    item.active = item.id === target.id;
                }
            });
        } else {
            target.active = active;
        }
    }

    if (settings && typeof settings === "object") {
        target.settings = {
            ...target.settings,
            ...settings
        };
    }

    return {
        status: 200,
        data: {
            updatedItem: target,
            tabState: getTabPayload(target.tab)
        }
    };
}

function removeExtension(id) {
    const target = extensions.find((item) => item.id === id);
    if (!target) {
        return { error: "Extension not found", status: 404 };
    }

    target.installed = false;
    target.active = false;

    // If only 1 plugin remains installed, auto-activate it
    const remainingPlugins = extensions.filter(
        (item) => item.tab === "plugins" && item.installed
    );
    if (remainingPlugins.length === 1) {
        remainingPlugins[0].active = true;
    }

    return {
        status: 200,
        data: {
            removedId: target.id,
            tabState: getTabPayload(target.tab)
        }
    };
}

module.exports = {
    getTabPayload,
    installExtension,
    selectActiveExtension,
    updateExtensionSettings,
    removeExtension
};