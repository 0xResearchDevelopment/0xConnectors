require("dotenv").config();
require('express-async-errors');

const express = require("express");
const cors = require('cors')
const app = express();
const bodyparser = require('body-parser');
process.env.TZ = "America/New_York"

const port = process.env.PORT;

//cors
app.use(cors())

// Accept incoming request
app.use(express.json({ extended: false }));

//middleware
app.use(bodyparser.json())
app.use((err, req, res, next) => {
    console.log(err)
    res.status(err.status || 500).send('0xConnectors : Internal server error..')
})

// Routes
app.use("/api/binance/v1", require("./binance/routes/binance.routes"));
app.use("/api/trade/v1", require("./trades/routes/trade.routes"));

module.exports = app;