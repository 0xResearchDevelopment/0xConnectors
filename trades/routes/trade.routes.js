const router = require("express").Router();

// Controllers
const tradesController = require("../controllers/trade.controller.js");

// Routes
router.post("/signalinput", tradesController.signalInput);
router.get("/orderdepth", tradesController.getOrderDepth);
router.post("/signalinputdirect", tradesController.signalInputDirect);
router.post("/signalinputcapture", tradesController.signalInputCapture);
router.post("/fetchapitest", tradesController.fetchAPITest);

module.exports = router;