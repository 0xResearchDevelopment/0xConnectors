//Place Limit order based on input signal
//get current ticker price
//Wait for 10 seconds for the confirmation
//if no confirmation from limit order, then it cancels Limit order 
//and places as market order


//pass apikey, secret as input

const axios = require('axios');
const crypto = require('crypto');

// Binance Testnet API keys (replace with your own)
const API_KEY = 'oS1UaFODwH7tGrpYRvsX1BD3ETjDZYcGD1lTUp3u3dtMlbIOAnIDsow5MKpF7uDQ';
const SECRET_KEY = 'vTx3T7BGkFPgJrwxTVLLxMQOLYCYWah92jWnwdL54HUuaTBEKcsctlNiAJiE8h3O';

// Function to get the current order book depth
async function getOrderBookDepth(symbol) {
    const BINANCE_TESTNET_API_URL = 'https://testnet.binance.vision/api/v3/depth';

    try {
        const response = await axios.get(BINANCE_TESTNET_API_URL, {
            params: { symbol: symbol.toUpperCase() }
        });

        const { bids, asks } = response.data;
        const bestBid = bids[0]; // Highest buy order
        const bestAsk = asks[0]; // Lowest sell order

        console.log(`Best Bid Price for ${symbol}: ${bestBid[0]}, Quantity: ${bestBid[1]}`);
        console.log(`Best Ask Price for ${symbol}: ${bestAsk[0]}, Quantity: ${bestAsk[1]}`);

        return {
            bestBidPrice: parseFloat(bestBid[0]),
            bestAskPrice: parseFloat(bestAsk[0]),
        };
    } catch (error) {
        console.error('Error fetching order book depth:', error.response ? error.response.data : error.message);
    }
}


// Function to get symbol info
async function getSymbolInfo(symbol) {
    const BINANCE_TESTNET_API_URL = 'https://testnet.binance.vision/api/v3/exchangeInfo';

    try {
        const response = await axios.get(BINANCE_TESTNET_API_URL);
        const symbolInfo = response.data.symbols.find(s => s.symbol === symbol.toUpperCase());

        if (symbolInfo) {
            //console.log(`Symbol Info for ${symbol}:`, symbolInfo);
            return symbolInfo;
        } else {
            console.error(`Symbol ${symbol} not found.`);
        }
    } catch (error) {
        console.error('Error fetching symbol info:', error.response ? error.response.data : error.message);
    }
}

// Function to place a limit order
async function placeLimitOrder(symbol, quantity, price, side) {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&side=${side}&type=LIMIT&quantity=${quantity}&price=${price}&timeInForce=GTC&timestamp=${timestamp}`;

    const signature = crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');

    const headers = {
        'X-MBX-APIKEY': API_KEY,
    };

    try {
        const response = await axios.post('https://testnet.binance.vision/api/v3/order', null, {
            headers: headers,
            params: {
                symbol: symbol,
                side: side,
                type: 'LIMIT',
                quantity: quantity,
                price: price,
                timeInForce: 'GTC',
                timestamp: timestamp,
                signature: signature,
            },
        });

        console.log('Limit Order Response:', response.data);
        return response.data; // Return the order response
    } catch (error) {
        console.error('Error placing limit order:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Function to check the order status
async function checkOrderStatus(symbol, orderId) {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;

    const signature = crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');

    const headers = {
        'X-MBX-APIKEY': API_KEY,
    };

    try {
        const response = await axios.get('https://testnet.binance.vision/api/v3/order', {
            headers: headers,
            params: {
                symbol: symbol,
                orderId: orderId,
                timestamp: timestamp,
                signature: signature,
            },
        });

        return response.data; // Return the order status
    } catch (error) {
        console.error('Error checking order status:', error.response ? error.response.data : error.message);
        return null;
    }
}

// Function to cancel an order
async function cancelOrder(symbol, orderId) {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;

    const signature = crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');

    const headers = {
        'X-MBX-APIKEY': API_KEY,
    };

    try {
        const response = await axios.delete('https://testnet.binance.vision/api/v3/order', {
            headers: headers,
            params: {
                symbol: symbol,
                orderId: orderId,
                timestamp: timestamp,
                signature: signature,
            },
        });

        console.log('Order Cancelled:', response.data);
    } catch (error) {
        console.error('Error cancelling order:', error.response ? error.response.data : error.message);
    }
}

// Function to place a market order
async function placeMarketOrder(symbol, quantity, side) {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;

    const signature = crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');

    const headers = {
        'X-MBX-APIKEY': API_KEY,
    };

    try {
        const response = await axios.post('https://testnet.binance.vision/api/v3/order', null, {
            headers: headers,
            params: {
                symbol: symbol,
                side: side,
                type: 'MARKET',
                quantity: quantity,
                timestamp: timestamp,
                signature: signature,
            },
        });

        console.log('Market Order Response:', response.data);
    } catch (error) {
        console.error('Error placing market order:', error.response ? error.response.data : error.message);
    }
}

// Main function to execute trade
async function executeTrade(symbol, quantity, side) {
    // Step 1: Get the current order book depth
    const orderBookDepth = await getOrderBookDepth(symbol);
    if (!orderBookDepth) return; // Exit if unable to fetch order book depth

    // Step 2: Get the symbol info to determine the price filter
    const symbolInfo = await getSymbolInfo(symbol);
    if (!symbolInfo) return; // Exit if unable to fetch symbol info

    // Step 2: Set the limit price
    let limitPrice;
    // Round the limit price to the nearest tick size
    let roundedLimitPrice;

    //Calculate limit price
    const tickSize = parseFloat(symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER').tickSize);

    if (side === 'BUY') {
        limitPrice = (orderBookDepth.bestBidPrice * 1.0006).toFixed(8); // Set limit price to 0.05% above the highest bid
        roundedLimitPrice = (Math.floor(limitPrice / tickSize) * tickSize).toFixed(8);
        console.log('Current Price - bestBidPrice:', orderBookDepth.bestBidPrice);
        console.log('limitPrice (buy - before):', limitPrice);
        console.log('Limit Price to set (buy-rounded):', roundedLimitPrice);
    } else {
        limitPrice = (orderBookDepth.bestAskPrice * 0.9994).toFixed(8); // Set limit price to 0.05% below the lowest ask
        roundedLimitPrice = (Math.floor(limitPrice / tickSize) * tickSize).toFixed(8);
        console.log('Current Price - bestAskPrice:', orderBookDepth.bestAskPrice);
        console.log('limitPrice (sell - before):', limitPrice);
        console.log('Limit Price to set (sell-rounded):', roundedLimitPrice);
    }

    // Step 3: Place a limit order
    const limitOrderResponse = await placeLimitOrder(symbol, quantity, roundedLimitPrice, side);
    if (!limitOrderResponse) return; // Exit if the limit order failed

    const orderId = limitOrderResponse.orderId;

    // Step 4: Wait for 10 seconds
    console.log('Waiting for 10 seconds to check order status...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 5: Check the order status
    const orderStatus = await checkOrderStatus(symbol, orderId);
    if (!orderStatus) return; // Exit if there was an error checking the order status

    // Step 6: If the order is not filled, cancel it and place a market order
    if (orderStatus.status === 'NEW') {
        console.log('Limit order not filled, cancelling the order...');
        await cancelOrder(symbol, orderId);
        console.log('Placing a market order...');
        await placeMarketOrder(symbol, quantity, side);
    } else {
        console.log('Limit order filled, no action needed.');
    }
}

// Execute the trade (replace with your desired parameters)
const symbol = 'ARBBTC'; // take "tradeSymbol" as Trading pair
const quantity = '20'; //keep 25 as default Quantity to trade
const side = 'BUY'; // take "tradeAction" .. B is BUY, S is SELL

executeTrade(symbol, quantity, side);











// Best Bid Price for LINKBTC: 0.00016340, Quantity: 43.46000000
// Best Ask Price for LINKBTC: 0.00016350, Quantity: 37.10000000
// Current Price - bestAskPrice: 0.0001635
// limitPrice (sell - before): 0.00016340
// Limit Price to set (sell-rounded): 0.00016340
// Limit Order Response: {
//   symbol: 'LINKBTC',
//   orderId: 584044,
//   orderListId: -1,
//   clientOrderId: 'ijCVPwS9K6bzPPO9yCGjXh',
//   transactTime: 1729212764953,
//   price: '0.00016340',
//   origQty: '10.00000000',
//   executedQty: '10.00000000',
//   cummulativeQuoteQty: '0.00163400',
//   status: 'FILLED',
//   timeInForce: 'GTC',
//   type: 'LIMIT',
//   side: 'SELL',
//   workingTime: 1729212764953,
//   fills: [
//     {
//       price: '0.00016340',
//       qty: '10.00000000',
//       commission: '0.00000000',
//       commissionAsset: 'BTC',
//       tradeId: 36181
//     }
//   ],
//   selfTradePreventionMode: 'EXPIRE_MAKER'
// }
// Waiting for 10 seconds to check order status...
// Limit order filled, no action needed.