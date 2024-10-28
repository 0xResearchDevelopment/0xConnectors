require("dotenv").config();
const mysql = require('mysql2/promise')

console.log("Windows User:", process.env.USER);

const mysqlPool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USR,
    password: process.env.PASSWORD,
    database: process.env.DATABASE 
})


module.exports = mysqlPool