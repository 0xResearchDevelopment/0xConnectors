const { success, error, validation } = require("../../binance/helpers/responseApi");
const tradeService = require('../services/trade.service');
const axios = require('axios');
const crypto = require('crypto');

exports.signalInput = async (req, res) => {
    try {
        console.log('===> Inside signalInput()');

        const tradeSignals = await tradeService.getTradeSignal();

        if(!tradeSignals) {
            res.status(500).json({
                statusCode: res.statusCode,
                statusMessage: 'error',
                message: `Error fetching trade signal data.`,
            });
        }

        console.log('===> Trade Signal Response:', tradeSignals);

        for (let tradeSignal of tradeSignals) {

            console.log('===> tradeSignal.TRADE_ACTION:', tradeSignal.TRADE_ACTION);
            console.log('===> tradeSignal.TRADE_SYMBOL:', tradeSignal.TRADE_SYMBOL);
            console.log('===> tradeSignal.PLATFORM:', tradeSignal.PLATFORM);
            console.log('===> tradeSignal.TRADE_TIMEFRAME:', tradeSignal.TRADE_TIMEFRAME);

            const signals = await tradeService.getSignalInput(tradeSignal.TRADE_ACTION, tradeSignal.TRADE_SYMBOL, tradeSignal.PLATFORM, tradeSignal.TRADE_TIMEFRAME)
            
            console.log('===> Signal Input Response:', signals);

            //Executing trades based on the received signal response
            for (let signal of signals) {

                const limitOrderRes = await tradeService.executeLimitTrade(signal.API_KEY, signal.API_SECRET, signal.ENDPOINT_URL, signal.BOT_SYMBOL, signal.TRADE_QUANTITY, signal.TRADE_ACTION)
                
                console.log('limitOrderRes: ', limitOrderRes)
                 
                if(limitOrderRes != null) {
                    let tradeObj = {
                        emailId: signal.EMAIL_ID,
                        botSymbol: signal.BOT_SYMBOL,
                        botExchange: signal.BOT_EXCHANGE,
                        botTimeframe: signal.BOT_TIMEFRAME,
                        botName: signal.BOT_NAME,
                        apiKey: signal.API_KEY,
                        apiSecret: signal.API_SECRET,
                        endpointURL: signal.ENDPOINT_URL+'/api/v3/order',
                        tradeSlippage: signal.TRADE_SLIPPAGE,
                        tradeQuantity: signal.TRADE_QUANTITY,
                        tradeAction: limitOrderRes.side,
                        tickerPrice: limitOrderRes?.fills[0]?.price,
                        tradeConfirmationJSON: JSON.stringify(limitOrderRes),
                        tradeStatus: 1,
                        orderId: limitOrderRes.orderId,
                        orderType: limitOrderRes.type
                    };

                    console.log('### tradeObj ###: ', tradeObj);

                    const res = await tradeService.addTradeData(tradeObj);
                    console.log('### trade confirmation insert response ===> : ', res);
                }
            };
        };

        res.send({
            statusCode: res.statusCode,
            statusMessage: 'success',
            message: 'Successfully processed the signals with limit orders',
        });

    } catch (error) {
        console.error('Error processing trade signals:', error.response ? error.response.data : error.message);
        res.status(500).json({
            statusCode: res.statusCode,
            statusMessage: 'error',
            message: `Error processing trade signals:', ${error.response ? error.response.data : error.message}`,
        });
    }
}

exports.executeMarketOrder = async (req, res) => {
    try {
        console.log('===> Inside executeMarketOrder()');

        const trades = await tradeService.getTradeConfirmationData();

        if(!trades) {
            res.status(500).json({
                statusCode: res.statusCode,
                statusMessage: 'error',
                message: `Error fetching trade confirmation data.`,
            });
        }

        console.log('===> ## Trade Confirmation Data Response:', trades);

        for (let trade of trades) {
            //apiKey, apiSecret, endpointOrderUrl, symbol, quantity, side, orderId

            console.log('===> trade.API_KEY:', trade.API_KEY);
            console.log('===> trade.API_SECRET:', trade.API_SECRET);
            console.log('===> trade.ENDPOINT_URL:', trade.ENDPOINT_URL);
            console.log('===> trade.TRADE_SYMBOL:', trade.TRADE_SYMBOL);
            console.log('===> trade.TRADE_QUANTITY:', trade.TRADE_QUANTITY);
            console.log('===> trade.TRADE_ACTION:', trade.TRADE_ACTION);

            const tradeRes = await tradeService.checkAndExecuteMarketOrder(trade.API_KEY, trade.API_SECRET, trade.ENDPOINT_URL, trade.TRADE_SYMBOL, trade.TRADE_QUANTITY, trade.TRADE_ACTION, trade.ORDER_ID)
            
            console.log('tradeRes: ', tradeRes)

            if(tradeRes != null) {
                let tradeObj = {
                    tradeId: trade.TRADE_ID,
                    tickerPrice: tradeRes?.fills ? tradeRes?.fills[0]?.price : tradeRes.price,
                    tradeConfirmationJSON: JSON.stringify(tradeRes),
                    tradeStatus: 0,
                    orderId: tradeRes.orderId,
                    orderType: tradeRes.type
                };

                console.log('###tradeObj###: ', tradeObj);

                const res = await tradeService.updateTradeConfirmation(tradeObj);
                console.log('### trade confirmation update response ===> : ', res);
            }
        };

        res.send({
            statusCode: res.statusCode,
            statusMessage: 'success',
            message: 'Successfully processed pending trades with market order',
        });

    } catch (error) {
        console.error('Error processing pending trades:', error.response ? error.response.data : error.message);
        res.status(500).json({
            statusCode: res.statusCode,
            statusMessage: 'error',
            message: `Error processing pending trades:', ${error.response ? error.response.data : error.message}`,
        });
    }
}