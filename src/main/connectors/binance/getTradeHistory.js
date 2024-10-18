const axios = require('axios');
const crypto = require('crypto');

// Set up authentication
const API_KEY = 'oS1UaFODwH7tGrpYRvsX1BD3ETjDZYcGD1lTUp3u3dtMlbIOAnIDsow5MKpF7uDQ';
const SECRET_KEY = 'vTx3T7BGkFPgJrwxTVLLxMQOLYCYWah92jWnwdL54HUuaTBEKcsctlNiAJiE8h3O';

// Function to get the last 10 trades for a specific symbol
async function getLastTrades(symbol, limit = 10) {
    const timestamp = Date.now(); // Get current timestamp
    const queryString = `symbol=${symbol}&timestamp=${timestamp}&limit=${limit}`;

    // Sign the request
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');

    // Set headers
    const headers = {
        'X-MBX-APIKEY': API_KEY,
    };

    try {
        const response = await axios.get('https://testnet.binance.vision/api/v3/myTrades', {
            headers: headers,
            params: {
                symbol: symbol,
                timestamp: timestamp,
                limit: limit,
                signature: signature,
            },
        });

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

        console.log(`Last ${limit} trades for ${symbol} grouped by orderId:`);
        console.log(averageTrades);
    } catch (error) {
        console.error('Error fetching trade history:', error.response ? error.response.data : error.message);
    }
}

// Call the function with the desired symbol (e.g., 'BTCUSDT')
const symbol = 'LINKBTC'; // Replace with the symbol you're interested in
getLastTrades(symbol);





// Last 10 trades for LINKUSDT grouped by orderId:
// [
//   {
//     orderId: '442507',
//     side: 'BUY',
//     averagePrice: '10.99',
//     totalQuantity: '1.000000',
//     tradeCount: 1
//   },
//   {
//     orderId: '448868',
//     side: 'BUY',
//     averagePrice: '11.06',
//     totalQuantity: '1.000000',
//     tradeCount: 1
//   },
//   {
//     orderId: '448870',
//     side: 'BUY',
//     averagePrice: '11.06',
//     totalQuantity: '1.000000',
//     tradeCount: 1
//   },
//   {
//     orderId: '448916',
//     side: 'BUY',
//     averagePrice: '11.05',
//     totalQuantity: '1.000000',
//     tradeCount: 1
//   },
//   {
//     orderId: '448930',
//     side: 'BUY',
//     averagePrice: '11.05',
//     totalQuantity: '10.000000',
//     tradeCount: 1
//   },
//   {
//     orderId: '448967',
//     side: 'BUY',
//     averagePrice: '11.05',
//     totalQuantity: '100.000000',
//     tradeCount: 3
//   },
//   {
//     orderId: '449220',
//     side: 'SELL',
//     averagePrice: '11.02',
//     totalQuantity: '2.000000',
//     tradeCount: 1
//   },
//   {
//     orderId: '449227',
//     side: 'SELL',
//     averagePrice: '11.02',
//     totalQuantity: '2.000000',
//     tradeCount: 1
//   }
// ]