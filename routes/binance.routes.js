const router = require("express").Router();

// Controllers
const binanceController = require("../src/main/connectors/binance/controllers/binance.controller.js");

// Routes
router.get("/getTradeHistory", binanceController.getTradeHistory);

module.exports = router;