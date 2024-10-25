const router = require("express").Router();

// Controllers
const binanceController = require("../controllers/binance.controller.js");

// Routes
router.post("/tradehistory", binanceController.getTradeHistory);
router.get("/hello", binanceController.getHello);
router.post("/balance", binanceController.getBalance); //FIXME: change from /getBalance to /balance

module.exports = router;