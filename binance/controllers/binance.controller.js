const axios = require('axios');
const crypto = require('crypto');
const os = require('os');
const { success, error, validation } = require("../helpers/responseApi");

exports.getHello = async (req, res) => {
    console.log('===> Inside getHello() : Welocme to 0xConnectors');
    try {
        res.send({
            statusCode: res.statusCode,
            statusMessage: 'success',
            message: 'Successfully connected to hello'
        });
    } catch (error) {
        res.send({
            statusCode: res.statusCode,
            statusMessage: 'error',
            message: `Error connecting hello', ${error.response ? error.response.data : error.message}`,
        });
        console.error('Error connecting hello:', error.response ? error.response.data : error.message);
    }
}



function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
}


exports.getTradeHistory = async (req, res) => {
    try {
        console.log('===> Inside getTradeHistory()');

        let ipaddress = getIPAddress();
        console.log('===> Server IP Address:', ipaddress);

        const apiKey = 'oS1UaFODwH7tGrpYRvsX1BD3ETjDZYcGD1lTUp3u3dtMlbIOAnIDsow5MKpF7uDQ'; //req.get('apiKey');
        const secretKey = 'vTx3T7BGkFPgJrwxTVLLxMQOLYCYWah92jWnwdL54HUuaTBEKcsctlNiAJiE8h3O'; //req.get('secretKey');
        const targetEndpointUrl = "https://testnet.binance.vision/api/v3/myTrades"; //req.get('targetEndpointUrl');

        // const {
        //     numberOfRows,
        //     tradeSymbol
        // } = req.body;

        const tradeSymbol = "LINKBTC";
        const numberOfRows = 10;

        const timestamp = Date.now(); // Get current timestamp
        const queryString = `symbol=${tradeSymbol}&timestamp=${timestamp}&limit=${numberOfRows}`;

        // Sign the request
        const signature = crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');

        //console.log(signature, 'signature');

        // Set headers
        const headers = {
            'X-MBX-APIKEY': apiKey,
        };

        //console.log(headers, 'headers');


        const response = await axios.get(targetEndpointUrl, {
            headers: headers,
            params: {
                symbol: tradeSymbol,
                timestamp: timestamp,
                limit: numberOfRows,
                signature: signature,
            },
        });

        console.log(response, 'response');

        // Group trades by orderId and calculate average price
        const trades = response.data;
        const groupedTrades = {};

        trades.forEach(trade => {
            const orderId = trade.orderId;

            if (!groupedTrades[orderId]) {
                groupedTrades[orderId] = {
                    side: trade.isBuyer ? 'BUY' : 'SELL', // Determine side from isBuyermaker
                    totalQuantity: 0,
                    totalPrice: 0,
                    tradeCount: 0,
                };
            }

            // Update the grouped trade data
            groupedTrades[orderId].totalQuantity += parseFloat(trade.qty);
            groupedTrades[orderId].totalPrice += parseFloat(trade.price) * parseFloat(trade.qty);
            groupedTrades[orderId].tradeCount += 1;
        });

        // Prepare the final response
        const averageTrades = Object.keys(groupedTrades).map(orderId => {
            const tradeData = groupedTrades[orderId];
            const averagePrice = tradeData.totalPrice / tradeData.totalQuantity;

            return {
                orderId: orderId,
                side: tradeData.side,
                averagePrice: averagePrice.toFixed(8), // Round to 2 decimal places
                totalQuantity: tradeData.totalQuantity.toFixed(6), // Round to 6 decimal places
                tradeCount: tradeData.tradeCount,
            };
        });

        console.log(`Last ${numberOfRows} trades for ${tradeSymbol} grouped by orderId:`);
        console.log(averageTrades);

        const tradeHistoryData = {
            code: 'GTTRDHTY1001',
            ipaddress: ipaddress,
            tradeHistory: averageTrades
        }

        res.send({
            statusCode: res.statusCode,
            statusMessage: 'success',
            message: 'Successfully retrieved trade history data',
            data: tradeHistoryData
        });

    } catch (error) {
        res.send({
            statusCode: res.statusCode,
            statusMessage: 'error',
            message: `Error fetching trade history:', ${error.response ? error.response.data : error.message}`,
        });
        console.error('Error fetching trade history:', error.response ? error.response.data : error.message);
    }
}