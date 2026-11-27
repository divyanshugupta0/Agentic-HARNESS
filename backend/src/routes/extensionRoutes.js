const express = require("express");
const router = express.Router();
const controller = require("../controllers/extensionController");

// Load items & settings by tab: /api/extensions?tab=plugins|marketplace|skills
router.get("/", controller.listByTab);
router.get("/:tab", controller.listByTab);

// Install an item & auto-create settings
router.post("/install", controller.install);

// Select active plugin or same-type marketplace item
router.post("/select", controller.selectActive);

// Temporarily activate/deactivate or update item settings
router.patch("/:id/settings", controller.updateSettings);

// Remove / uninstall an item
router.delete("/:id", controller.remove);

module.exports = router;