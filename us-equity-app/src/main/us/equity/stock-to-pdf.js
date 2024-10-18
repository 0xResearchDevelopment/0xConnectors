const yahooFinance = require('yahoo-finance');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// List of stock tickers you want to retrieve
const tickers = ['AAPL', 'GOOGL', 'AMZN', 'MSFT', 'TSLA'];

// Function to fetch stock data
async function fetchStockData(tickers) {
    try {
        const stockData = await yahooFinance.quote({
            symbols: tickers,
            modules: ['price', 'summaryDetail'] // Fetching price and summary detail
        });
        return stockData;
    } catch (error) {
        console.error('Error fetching stock data:', error);
        throw error;
    }
}

// Function to generate PDF with stock data
function generatePDF(stockData) {
    const doc = new PDFDocument();
    const filePath = './stock_report.pdf';
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // PDF Header
    doc.fontSize(20).text('Stock Price Report', { align: 'center' });
    doc.moveDown();

    // Create Table Header
    doc.fontSize(12);
    doc.text('Ticker', 100, doc.y, { continued: true, width: 150 });
    doc.text('Price (USD)', 250, doc.y, { continued: true, width: 150 });
    doc.text('Change (%)', 400, doc.y, { align: 'right', width: 150 });
    doc.moveDown().moveDown();

    // Loop through stock data and add rows to the table
    for (const ticker of Object.keys(stockData)) {
        const { price } = stockData[ticker];
        const { regularMarketPrice, regularMarketChangePercent } = price;

        doc.text(ticker, 100, doc.y, { continued: true, width: 150 });
        doc.text(regularMarketPrice.toFixed(2), 250, doc.y, { continued: true, width: 150 });
        doc.text(regularMarketChangePercent.toFixed(2) + '%', 400, doc.y, { align: 'right', width: 150 });
        doc.moveDown();
    }

    // Finalize PDF and save the file
    doc.end();
    console.log(`PDF generated successfully at: ${filePath}`);
}

// Main Function to Run the Program
async function main() {
    try {
        const stockData = await fetchStockData(tickers);
        generatePDF(stockData);
    } catch (error) {
        console.error('Failed to generate PDF:', error);
    }
}

// Run the Program
main();
