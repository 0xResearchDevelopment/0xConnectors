const { success, error, validation } = require("../../binance/helpers/responseApi");
const tradeService = require('../services/trade.service');

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
                    tickerPrice: executeTradeRes.price,
                    tradeConfirmationJSON: JSON.stringify(executeTradeRes),
                    tradeStatus: 1
                };

                console.log('###tradeObj###: ', tradeObj);

                console.log('###executeTradeRes STRINGIFY###: ', JSON.stringify(executeTradeRes));


                const res = await tradeService.addTradeData(tradeObj);
                console.log('###final response###: ', res);
            }
        });

        //########To Do: Sending a success response after execute trade API call and insert table operation

        // res.send({
        //     statusCode: res.statusCode,
        //     statusMessage: 'success',
        //     message: 'Successfully processed the signals',
        // });

    } catch (error) {
        console.error('Error fetching trade history:', error.response ? error.response.data : error.message);
        res.status(500).json({
            statusCode: res.statusCode,
            statusMessage: 'error',
            message: `Error fetching trade history:', ${error.response ? error.response.data : error.message}`,
        });
    }
}