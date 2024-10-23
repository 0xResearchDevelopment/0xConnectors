require("dotenv").config();
require('express-async-errors');

const express = require("express");
const cors = require('cors')
const app = express();
const bodyparser = require('body-parser');
const db = require("./config/db");

process.env.TZ = "America/New_York"
const port = process.env.PORT;

//cors
app.use(cors())

// Accept incoming request
app.use(express.json({ extended: false }));

// Routes
app.use("/api/binance/v1", require("./binance/routes/binance.routes"));
app.use("/api/trade/v1", require("./trades/routes/trade.routes"));

//middleware
app.use(bodyparser.json())
app.use((err, req, res, next) => {
    console.log(err)
    res.status(err.status || 500).send('0xConnectors : Internal server error..')
})

db.query("SELECT 1")
    .then(() => {
        console.log('SUCESS: db connection established')
        app.listen(port,
            () => console.log(`SUCESS: Server started at :${port}`))
    })
    .catch(err => console.log('ERROR: Database connection failed. \n' + err))

