const router = require("express").Router();

// Controllers
const binanceController = require("../controllers/binance.controller.js");

// Routes
router.post("/tradehistory", binanceController.getTradeHistory);
router.get("/hello", binanceController.getHello);

module.exports = router;