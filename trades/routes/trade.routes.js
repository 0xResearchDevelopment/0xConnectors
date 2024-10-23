const router = require("express").Router();

// Controllers
const tradesController = require("../controllers/trade.controller.js");

// Routes
router.post("/signalinput", tradesController.signalInput);

module.exports = router;