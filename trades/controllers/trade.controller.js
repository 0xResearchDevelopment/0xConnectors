const { success, error, validation } = require("../../binance/helpers/responseApi");
const tradeService = require('../services/trade.service');
const axios = require('axios');
const crypto = require('crypto');

exports.signalInput = async (req, res) => {
    try {
        console.log('===> Inside signalInput()');

        // Extracting values from request body
        const platform = req.body.platform;
        const clientIdCode = req.body.clientIdCode;
        const clientEmail = req.body.clientEmail;
        const tradeTimeframe = req.body.tradeTimeframe; 
        const baseCurrencyCode = req.body.baseCurrencyCode;
        const tokenCurrenyCode = req.body.tokenCurrenyCode; 
        const tradeSymbol = req.body.tradeSymbol;
        const allowSimulationFlag = req.body.allowSimulationFlag; 
        const tradeAction = req.body.tradeAction;  

        console.log('===> Trade Symbol:', tradeSymbol);
        console.log('===> Platform:', platform);
        console.log('===> Trade Action:', tradeAction);
        console.log('===> Trade Timeframe:', tradeTimeframe);

        const signals = await tradeService.getSignalInput(tradeAction, tradeSymbol, platform, tradeTimeframe)

        console.log('===> Signal Input Response:', signals);

        if(!signals) {
            res.status(500).json({
                statusCode: res.statusCode,
                statusMessage: 'error',
                message: `Error fetching signal input data.`,
            });
        }

        //Executing trades based on the received signal response
        await signals.forEach(async signal => {
            const executeTradeRes = await tradeService.executeTrade(signal.API_KEY, signal.API_SECRET, signal.ENDPOINT_URL, signal.BOT_SYMBOL, signal.TRADE_QUANTITY, signal.TRADE_ACTION)

            if(executeTradeRes != null) {
                let tradeObj = {
                    emailId: signal.EMAIL_ID,
                    botSymbol: signal.BOT_SYMBOL,
                    botExchange: signal.BOT_EXCHANGE,
                    botTimeframe: signal.BOT_TIMEFRAME,
                    botName: signal.BOT_NAME,
                    endpointURL: signal.ENDPOINT_URL+'/api/v3/order',
                    tradeSlippage: signal.TRADE_SLIPPAGE,
                    tradeQuantity: signal.TRADE_QUANTITY,
                    tradeAction: executeTradeRes.side,
                    tickerPrice: executeTradeRes.fills[0].price,
                    tradeConfirmationJSON: JSON.stringify(executeTradeRes),
                    tradeStatus: 1,
                    orderId: executeTradeRes.orderId,
                    orderType: executeTradeRes.type
                };

                console.log('###tradeObj###: ', tradeObj);

                const res = await tradeService.addTradeData(tradeObj);
                console.log('###final response###: ', res);
            }
        });

        //########To Do: Sending a success response after execute trade API call and insert table operation

        res.send({
            statusCode: res.statusCode,
            statusMessage: 'success',
            message: 'Successfully processed the signals',
        });

    } catch (error) {
        console.error('Error fetching trade history:', error.response ? error.response.data : error.message);
        res.status(500).json({
            statusCode: res.statusCode,
            statusMessage: 'error',
            message: `Error fetching trade history:', ${error.response ? error.response.data : error.message}`,
        });
    }
}

exports.signalInputDirect = async (req, res) => {
    try {
        console.log('===> Inside signalInput()');

        // Extracting values from request body
        const platform = req.body.platform;
        const clientIdCode = req.body.clientIdCode;
        const clientEmail = req.body.clientEmail;
        const tradeTimeframe = req.body.tradeTimeframe; 
        const baseCurrencyCode = req.body.baseCurrencyCode;
        const tokenCurrenyCode = req.body.tokenCurrenyCode; 
        const tradeSymbol = req.body.tradeSymbol;
        const allowSimulationFlag = req.body.allowSimulationFlag; 
        const tradeAction = req.body.tradeAction;  

        console.log('===> Trade Symbol:', tradeSymbol);
        console.log('===> Platform:', platform);
        console.log('===> Trade Action:', tradeAction);
        console.log('===> Trade Timeframe:', tradeTimeframe);

        const signals = await tradeService.getSignalInput(tradeAction, tradeSymbol, platform, tradeTimeframe)

        console.log('===> Signal Input Response:', signals);

        if(!signals) {
            res.status(500).json({
                statusCode: res.statusCode,
                statusMessage: 'error',
                message: `Error fetching signal input data.`,
            });
        }

        //Executing trades based on the received signal response
        await signals.forEach(async signal => {

            console.log('inside getOrderBookDepth');
            
            console.log('getOrderBookDepth params ', signal.ENDPOINT_URL + '/api/v3/depth', signal.BOT_SYMBOL);
            const response = await axios.get(signal.ENDPOINT_URL + '/api/v3/depth', {
                params: { symbol: signal.BOT_SYMBOL.toUpperCase() }
            });

            console.log('getOrderBookDepth res ', response);

            const { bids, asks } = response.data;
            const bestBid = bids[0]; // Highest buy order
            const bestAsk = asks[0]; // Lowest sell order

            console.log(`Best Bid Price for ${signal.BOT_SYMBOL}: ${bestBid[0]}, Quantity: ${bestBid[1]}`);
            console.log(`Best Ask Price for ${signal.BOT_SYMBOL}: ${bestAsk[0]}, Quantity: ${bestAsk[1]}`);

            const orderBookDepth = {
                bestBidPrice: parseFloat(bestBid[0]),
                bestAskPrice: parseFloat(bestAsk[0])
            };
            
            console.log('inside getSymbolInfo');

            const exchangeInfoResponse = await axios.get(signal.ENDPOINT_URL + '/api/v3/exchangeInfo');
            
            const symbolInfo = exchangeInfoResponse.data.symbols.find(s => s.symbol === signal.BOT_SYMBOL.toUpperCase());

            // Step 2: Set the limit price
            let limitPrice;
            // Round the limit price to the nearest tick size
            let roundedLimitPrice;
            //Setting the side based on trade action
            let side = (signal.TRADE_ACTION === 'B') ? 'BUY' : 'SELL';

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
                
            console.log('inside placeLimitOrder');

            const timestamp = Date.now();
            const queryString = `symbol=${signal.BOT_SYMBOL}&side=${side}&type=LIMIT&quantity=${signal.TRADE_QUANTITY}&price=${roundedLimitPrice}&timeInForce=GTC&timestamp=${timestamp}`;

            const signature = crypto.createHmac('sha256', signal.API_SECRET).update(queryString).digest('hex');

            const headers = {
                'X-MBX-APIKEY': signal.API_KEY,
            };

            const limitOrderDirectResponse = await axios.post(signal.ENDPOINT_URL + '/api/v3/order', null, {
                headers: headers,
                params: {
                    symbol: signal.BOT_SYMBOL,
                    side: side,
                    type: 'LIMIT',
                    quantity: signal.TRADE_QUANTITY,
                    price: roundedLimitPrice,
                    timeInForce: 'GTC',
                    timestamp: timestamp,
                    signature: signature,
                },
            });

            console.log('Limit Order Response:', limitOrderDirectResponse.data);

            const limitOrderResponse = limitOrderDirectResponse.data;

            const orderId = limitOrderResponse.orderId;

            // Step 4: Wait for 10 seconds
            console.log('Waiting for 10 seconds to check order status...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            console.log('inside checkOrderStatus');

            const orderStatusTimestamp = Date.now();
            const orderStatusQueryString = `symbol=${signal.BOT_SYMBOL}&orderId=${orderId}&timestamp=${orderStatusTimestamp}`;

            const orderStausSignature = crypto.createHmac('sha256', signal.API_SECRET).update(orderStatusQueryString).digest('hex');

            const orderStausHeaders = {
                'X-MBX-APIKEY': signal.API_KEY,
            };

            const orderStausResponse = await axios.get(signal.ENDPOINT_URL + '/api/v3/order', {
                headers: orderStausHeaders,
                params: {
                    symbol: signal.BOT_SYMBOL,
                    orderId: orderId,
                    timestamp: orderStatusTimestamp,
                    signature: orderStausSignature,
                },
            });

            const orderStatus = orderStausResponse.data; // Return the order status
            
            let executeTradeRes = null;
            // Step 6: If the order is not filled, cancel it and place a market order
            if (orderStatus.status === 'NEW') {
                console.log('Limit order not filled, cancelling the order...');
                
                const cancelOrdertimestamp = Date.now();
                const cancelOrderQueryString = `symbol=${signal.BOT_SYMBOL}&orderId=${orderId}&timestamp=${cancelOrdertimestamp}`;

                const cancelOrderSignature = crypto.createHmac('sha256', signal.API_SECRET).update(cancelOrderQueryString).digest('hex');

                const cancelOrderHeaders = {
                    'X-MBX-APIKEY': signal.API_KEY,
                };

                const cancelOrderResponse = await axios.delete(signal.ENDPOINT_URL + '/api/v3/order', {
                    headers: cancelOrderHeaders,
                    params: {
                        symbol: signal.BOT_SYMBOL,
                        orderId: orderId,
                        timestamp: cancelOrdertimestamp,
                        signature: cancelOrderSignature,
                    },
                });

                console.log('Order Cancelled:', cancelOrderResponse.data);
                
                console.log('Placing a market order...');
                
                console.log('inside placeMarketOrder');

                const marketOrderTimestamp = Date.now();
                const marketOrderQueryString = `symbol=${signal.BOT_SYMBOL}&side=${side}&type=MARKET&quantity=${signal.TRADE_QUANTITY}&timestamp=${marketOrderTimestamp}`;

                const marketOrderSignature = crypto.createHmac('sha256', signal.API_SECRET).update(marketOrderQueryString).digest('hex');

                const marketOrderHeaders = {
                    'X-MBX-APIKEY': signal.API_KEY,
                };

                const marketOrderResponse = await axios.post(signal.ENDPOINT_URL + '/api/v3/order', null, {
                    headers: marketOrderHeaders,
                    params: {
                        symbol: signal.BOT_SYMBOL,
                        side: side,
                        type: 'MARKET',
                        quantity: signal.TRADE_QUANTITY,
                        timestamp: marketOrderTimestamp,
                        signature: marketOrderSignature,
                    },
                });
        
                console.log('Market Order Response:', marketOrderResponse.data);

                executeTradeRes = marketOrderResponse.data;         
                // return markerOrderResponse;
            } 
                
            else {
                console.log('Limit order filled, no action needed.');
                console.log('==> final res: ', limitOrderResponse)
                executeTradeRes = limitOrderResponse;         
                // return limitOrderResponse;
            }

            if(executeTradeRes != null) {
                let tradeObj = {
                    emailId: signal.EMAIL_ID,
                    botSymbol: signal.BOT_SYMBOL,
                    botExchange: signal.BOT_EXCHANGE,
                    botTimeframe: signal.BOT_TIMEFRAME,
                    botName: signal.BOT_NAME,
                    endpointURL: signal.ENDPOINT_URL+'/api/v3/order',
                    tradeSlippage: signal.TRADE_SLIPPAGE,
                    tradeQuantity: signal.TRADE_QUANTITY,
                    tradeAction: executeTradeRes.side,
                    tickerPrice: executeTradeRes.fills[0].price,
                    tradeConfirmationJSON: JSON.stringify(executeTradeRes),
                    tradeStatus: 1,
                    orderId: executeTradeRes.orderId,
                    orderType: executeTradeRes.type
                };

                console.log('###tradeObj###: ', tradeObj);

                const res = await tradeService.addTradeData(tradeObj);
                console.log('###final response###: ', res);
            }

        });

        //########To Do: Sending a success response after execute trade API call and insert table operation

        res.send({
            statusCode: res.statusCode,
            statusMessage: 'success',
            message: 'Successfully processed the signals',
        });

    } catch (error) {
        console.error('Error fetching trade history:', error.response ? error.response.data : error.message);
        res.status(500).json({
            statusCode: res.statusCode,
            statusMessage: 'error',
            message: `Error fetching trade history:', ${error.response ? error.response.data : error.message}`,
        });
    }
}

exports.signalInputCapture = async (req, res) => {
    try {
        console.log('===> Inside signalInputCapture()');

        // Extracting values from request body
        const platform = req.body.platform;
        const clientIdCode = req.body.clientIdCode;
        const clientEmail = req.body.clientEmail;
        const tradeTimeframe = req.body.tradeTimeframe; 
        const baseCurrencyCode = req.body.baseCurrencyCode;
        const tokenCurrenyCode = req.body.tokenCurrenyCode; 
        const tradeSymbol = req.body.tradeSymbol;
        const allowSimulationFlag = req.body.allowSimulationFlag; 
        const tradeAction = req.body.tradeAction;  

        console.log('===> Trade Symbol:', tradeSymbol);
        console.log('===> Platform:', platform);
        console.log('===> Trade Action:', tradeAction);
        console.log('===> Trade Timeframe:', tradeTimeframe);

        const signals = await tradeService.getSignalInput(tradeAction, tradeSymbol, platform, tradeTimeframe)

        console.log('===> Signal Input Response:', signals);

        if(!signals) {
            res.status(500).json({
                statusCode: res.statusCode,
                statusMessage: 'error',
                message: `Error fetching signal input data.`,
            });
        }

        //Executing trades based on the received signal response
        signals.forEach(async signal => {
            // const executeTradeRes = await tradeService.executeTrade(signal.API_KEY, signal.API_SECRET, signal.ENDPOINT_URL, signal.BOT_SYMBOL, signal.TRADE_QUANTITY, signal.TRADE_ACTION)
            let signalCaptureObj = {
                botSymbol: signal.BOT_SYMBOL,
                botTimeframe: signal.BOT_TIMEFRAME,
                botExchange: signal.BOT_EXCHANGE,
                botName: signal.BOT_NAME,
                emailId: signal.EMAIL_ID,
                apiKey: signal.API_KEY,
                apiSecret: signal.API_SECRET,
                tradeSlippage: signal.TRADE_SLIPPAGE,
                tradeQuantity: signal.TRADE_QUANTITY,
                endpointStatus: signal.ENDPOINT_STATUS,
                endpointURL: signal.ENDPOINT_URL,
                tradeAction: signal.TRADE_ACTION,
                toBeExecuted: 1
            };

            console.log('###signalCaptureObj###: ', signalCaptureObj);

            const res = await tradeService.addSignalCaptureData(signalCaptureObj);
            console.log('###final response###: ', res);
        });

        //########To Do: Sending a success response after execute trade API call and insert table operation

        res.send({
            statusCode: res.statusCode,
            statusMessage: 'success',
            message: 'Successfully captured the signals',
        });

    } catch (error) {
        console.error('Error capturing the signals:', error.response ? error.response.data : error.message);
        res.status(500).json({
            statusCode: res.statusCode,
            statusMessage: 'error',
            message: `Error capturing the signals:', ${error.response ? error.response.data : error.message}`,
        });
    }
}

exports.fetchAPITest = async (req, res) => {
    try {
        console.log('===> Inside fetchAPITest()');

        const baseUrl = 'https://testnet.binance.vision/api/v3/depth';
        const queryParams = {
            symbol: 'ARBBTC'        
        };

        const url = new URL(baseUrl);
        Object.keys(queryParams).forEach(key => url.searchParams.append(key, queryParams[key]));
        
        console.log('fetch url: ', url);

        const result = await fetch(url);

        const fecthAPIres = await result.json();

        console.log('fecthAPIres: ', fecthAPIres);

        res.send({
            statusCode: res.statusCode,
            statusMessage: 'success',
            message: 'Successfully tested fetch api',
        });

    } catch (error) {
        console.error('Error fetch api test:', error.response ? error.response.data : error.message);
        res.status(500).json({
            statusCode: res.statusCode,
            statusMessage: 'error',
            message: `Error fetch api test:', ${error.response ? error.response.data : error.message}`,
        });
    }
}