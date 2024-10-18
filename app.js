require("dotenv").config();
require('express-async-errors');

const express = require("express");
const cors = require('cors')
const app = express();
const bodyparser = require('body-parser');

const port = process.env.PORT;

//cors
app.use(cors())

// Accept incoming request
app.use(express.json({ extended: false }));

// Routes
app.use("/api/binance", require("./routes/binance.routes"));

//middleware
app.use(bodyparser.json())
app.use((err, req, res, next) => {
    console.log(err)
    res.status(err.status || 500).send('Something went wrong!')
})

app.listen(port, () => console.log(`SUCESS: Server started at :${port}`))