const db = require("../../config/db");
const axios = require('axios');
const crypto = require('crypto');

const queries = {
    GET_SIGNAL_INPUT: `select 
                            botProfile.BOT_ID, 
                            botProfile.BOT_SYMBOL, 
                            botProfile.BOT_TIMEFRAME, 
                            botProfile.BOT_EXCHANGE, 
                            botProfile.BOT_NAME,
                            userSubscribed.EMAIL_ID, 
                            authProfile.API_KEY, 
                            authProfile.API_SECRET,
                            "0.0006" as TRADE_SLIPPAGE, 
                            20 AS TRADE_QUANTITY, 
                            1 AS ENDPOINT_STATUS, 
                            "https://testnet.binance.vision" AS ENDPOINT_URL, 
                            ? AS TRADE_ACTION
                        from DBD_TBL_BOT_USER_SUBSCRIBE userSubscribed, DBD_TBL_BOT_PROFILE botProfile, AUTH_USER_PROFILE authProfile
                        where botProfile.BOT_ID = userSubscribed.BOT_ID and userSubscribed.SUBSCRIBE_STATUS = 1 and botProfile.BOT_SYMBOL = ?
                        and botProfile.BOT_EXCHANGE = ? and upper(botProfile.BOT_TIMEFRAME) = upper(?)
                        and authProfile.EMAIL_ID = userSubscribed.EMAIL_ID and authProfile.STATUS = 1
                        order by userSubscribed.EMAIL_ID;`,
    INSERT_TRADE_DATA: 'INSERT INTO DBD_TBL_TRADE_CONFIRMATION(EMAIL_ID,TRADE_SYMBOL,BOT_EXCHANGE,TRADE_TIMEFRAME,BOT_NAME,ENDPOINT_URL,TRADE_SLIPPAGE, TRADE_QUANTITY, TRADE_ACTION, TICKER_PRICE, TRADE_CONFIRMATION_JSON, TRADE_STATUS) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  };

module.exports.getSignalInput = async (tradeAction, tradeSymbol, platform, tradeTimeframe) => {
    const [record] = await db.query(queries.GET_SIGNAL_INPUT, [tradeAction, tradeSymbol, platform, tradeTimeframe])
    return record;
}

module.exports.addTradeData = async (tradeObj) => {
    const [record] = await db.query(queries.INSERT_TRADE_DATA,
        [tradeObj.emailId, tradeObj.botSymbol, tradeObj.botExchange, tradeObj.botTimeframe, tradeObj.botName, 
        tradeObj.endpointURL, tradeObj.tradeSlippage, tradeObj.tradeQuantity, tradeObj.tradeAction,
        tradeObj.tickerPrice, tradeObj.tradeConfirmationJSON, tradeObj.tradeStatus])
    return record;
}

// Main function to execute trade
module.exports.executeTrade = async (apiKey, apiSecret, endpointBaseUrl, symbol, quantity, side) => {
    // Step 1: Get the current order book depth
    const orderBookDepth = await getOrderBookDepth(endpointBaseUrl, symbol);
    if (!orderBookDepth) return; // Exit if unable to fetch order book depth

    // Step 2: Get the symbol info to determine the price filter
    const symbolInfo = await getSymbolInfo(endpointBaseUrl, symbol);
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

    const endpointOrderUrl = endpointBaseUrl + '/api/v3/order';

    // Step 3: Place a limit order
    const limitOrderResponse = await placeLimitOrder(apiKey, apiSecret, endpointOrderUrl, symbol, quantity, roundedLimitPrice, side);
    if (!limitOrderResponse) return; // Exit if the limit order failed

    const orderId = limitOrderResponse.orderId;

    // Step 4: Wait for 10 seconds
    console.log('Waiting for 10 seconds to check order status...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 5: Check the order status
    const orderStatus = await checkOrderStatus(apiKey, apiSecret, endpointOrderUrl, symbol, orderId);
    if (!orderStatus) return; // Exit if there was an error checking the order status

    // Step 6: If the order is not filled, cancel it and place a market order
    if (orderStatus.status === 'NEW') {
        console.log('Limit order not filled, cancelling the order...');
        await cancelOrder(apiKey, apiSecret, endpointOrderUrl, symbol, orderId);
        console.log('Placing a market order...');
        const markerOrderResponse = await placeMarketOrder(apiKey, apiSecret, endpointOrderUrl, symbol, quantity, side);
        return markerOrderResponse;
    } else {
        console.log('Limit order filled, no action needed.');
        return limitOrderResponse;
    }
}

// Function to get the current order book depth
async function getOrderBookDepth(endpointBaseUrl, symbol) {
    const BINANCE_TESTNET_API_URL = endpointBaseUrl + '/api/v3/depth';

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
async function getSymbolInfo(endpointBaseUrl, symbol) {
    const BINANCE_TESTNET_API_URL = endpointBaseUrl + '/api/v3/exchangeInfo';

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
async function placeLimitOrder(apiKey, apiSecret, endpointOrderUrl, symbol, quantity, price, side) {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&side=${side}&type=LIMIT&quantity=${quantity}&price=${price}&timeInForce=GTC&timestamp=${timestamp}`;

    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const headers = {
        'X-MBX-APIKEY': apiKey,
    };

    try {
        const response = await axios.post(endpointOrderUrl, null, {
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
async function checkOrderStatus(apiKey, apiSecret, endpointOrderUrl, symbol, orderId) {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;

    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const headers = {
        'X-MBX-APIKEY': apiKey,
    };

    try {
        const response = await axios.get(endpointOrderUrl, {
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
async function cancelOrder(apiKey, apiSecret, endpointOrderUrl, symbol, orderId) {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;

    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const headers = {
        'X-MBX-APIKEY': apiKey,
    };

    try {
        const response = await axios.delete(endpointOrderUrl, {
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
async function placeMarketOrder(apiKey, apiSecret, endpointOrderUrl, symbol, quantity, side) {
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;

    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const headers = {
        'X-MBX-APIKEY': apiKey,
    };

    try {
        const response = await axios.post(endpointOrderUrl, null, {
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
        return response.data; // Return the order response
    } catch (error) {
        console.error('Error placing market order:', error.response ? error.response.data : error.message);
        return null;
    }
}


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