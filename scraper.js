const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LISTING_URL = 'https://www.sreality.cz/detail/prodej/pozemek/louka/semily-bitouchov-/3764540236';
const CSV_PATH = path.join(__dirname, 'data', 'visits.csv');

async function scrape() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'cs-CZ',
  });
  const page = await context.newPage();

  console.log('Navigating to listing...');
  await page.goto(LISTING_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Dismiss cookie consent banner if present
  try {
    await page.waitForSelector('button:has-text("Souhlasím")', { timeout: 5000 });
    await page.click('button:has-text("Souhlasím")');
    console.log('Cookie souhlas potvrzen');
  } catch {
    // No consent banner
  }

  // Wait until "Zobrazeno" text appears on page
  await page.waitForFunction(
    () => document.body.innerText.includes('Zobrazeno'),
    { timeout: 30000 }
  );

  const visits = await page.evaluate(() => {
    const text = document.body.innerText;
    const match = text.match(/Zobrazeno[:\s]*([\d\s\u00a0]+)/);
    if (!match) return null;
    return parseInt(match[1].replace(/[\s\u00a0]/g, ''), 10);
  });

  await browser.close();

  if (!visits || isNaN(visits)) {
    console.error('ERROR: Could not find visit count on the page.');
    process.exit(1);
  }

  const timestamp = new Date().toISOString();
  const csvLine = `${timestamp},${visits}\n`;
  fs.appendFileSync(CSV_PATH, csvLine, 'utf8');
  console.log(`Recorded: ${timestamp}  visits: ${visits}`);
}

scrape().catch((err) => {
  console.error(err);
  process.exit(1);
});