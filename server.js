require("dotenv").config();
require('express-async-errors');
const app = require("./app.js");

const port = process.env.PORT;

app.listen(port, () => console.log(`SUCESS: Server started at :${port}`))