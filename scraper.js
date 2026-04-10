const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LISTING_URL =
  'https://www.sreality.cz/detail/prodej/pozemek/louka/semily-bitouchov-/3764540236';
const CSV_PATH = path.join(__dirname, 'data', 'visits.csv');

async function scrape() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'cs-CZ',
  });
  const page = await context.newPage();

  console.log('Navigating to listing...');
  await page.goto(LISTING_URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Dismiss cookie consent banner if present
  try {
    const consentBtn = page.locator(
      'button[data-testid="cmpAcceptAllBtn"], button:has-text("Přijmout vše"), button:has-text("Souhlasím")'
    );
    await consentBtn.first().click({ timeout: 5000 });
    await page.waitForTimeout(1500);
  } catch {
    // No consent banner shown
  }

  // Wait for the detail content to load
  await page.waitForTimeout(2000);

  const bodyText = await page.locator('body').innerText();

  // sreality.cz shows visit count as e.g. "1 234 × zobrazeno" or "zobrazeno 1234×"
  const patterns = [
    /(\d[\d\s]*)\s*×\s*zobrazeno/i,
    /zobrazeno\s*(\d[\d\s]*)\s*×/i,
    /(\d[\d\s]*)\s*zobrazení/i,
    /zobrazení[:\s]+(\d[\d\s]*)/i,
  ];

  let visits = null;
  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match) {
      visits = parseInt(match[1].replace(/\s/g, ''), 10);
      break;
    }
  }

  await browser.close();

  if (visits === null) {
    console.error('ERROR: Could not find visit count on the page.');
    console.error('Page text snippet:', bodyText.slice(0, 500));
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
