const extensionService = require("../services/extensionService");

function listByTab(req, res) {
    const tab = (req.query.tab || req.params.tab || "").toLowerCase();
    return res.json(extensionService.getTabPayload(tab));
}

function install(req, res) {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ error: "id is required" });
    }
    const result = extensionService.installExtension(id);
    if (result.error) {
        return res.status(result.status).json({ error: result.error });
    }
    return res.status(result.status).json(result.data);
}

function selectActive(req, res) {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ error: "id is required" });
    }
    const result = extensionService.selectActiveExtension(id);
    if (result.error) {
        return res.status(result.status).json({ error: result.error });
    }
    return res.status(result.status).json(result.data);
}

function updateSettings(req, res) {
    const { id } = req.params;
    const { active, settings } = req.body;
    const result = extensionService.updateExtensionSettings(id, { active, settings });
    if (result.error) {
        return res.status(result.status).json({ error: result.error });
    }
    return res.status(result.status).json(result.data);
}

function remove(req, res) {
    const { id } = req.params;
    const result = extensionService.removeExtension(id);
    if (result.error) {
        return res.status(result.status).json({ error: result.error });
    }
    return res.status(result.status).json(result.data);
}

module.exports = {
    listByTab,
    install,
    selectActive,
    updateSettings,
    remove
};