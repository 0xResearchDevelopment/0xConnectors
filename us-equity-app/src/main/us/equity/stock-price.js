const yahooFinance = require('yahoo-finance2').default;

// Function to get stock price by ticker
async function getStockPrice(ticker) {
  try {
    const quote = await yahooFinance.quote(ticker);
    console.log(`\n${ticker.toUpperCase()} Stock Price`);
    console.log('--------------------------');
    console.log(`Current Price: $${quote.regularMarketPrice}`);
    console.log(`Previous Close: $${quote.regularMarketPreviousClose}`);
    console.log(`Open: $${quote.regularMarketOpen}`);
    console.log(`Day's Range: ${quote.regularMarketDayRange}`);
    console.log(`52 Week Range: ${quote.fiftyTwoWeekRange}`);
  } catch (error) {
    console.error('Error fetching stock data:', error.message);
  }
}

// Run the function with a sample ticker (e.g., AAPL)
const ticker = process.argv[2] || 'AAPL'; // You can pass a ticker via the command line
getStockPrice(ticker);
