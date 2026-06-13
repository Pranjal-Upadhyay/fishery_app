/**
 * iGOD Bihar Live Scraper — uses Playwright to navigate the JS-rendered site
 * URL: https://igod.gov.in/sg/BR/E042/organizations
 * 
 * Run: node scrape_igod_bihar.mjs
 * Requires: npm install playwright xlsx
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

const BASE_URL = 'https://igod.gov.in/sg/BR/E042/organizations';
const OUTPUT_JSON = 'igod_bihar_live.json';
const TIMEOUT = 30000;

async function scrapeIGOD() {
  console.log('='.repeat(60));
  console.log('iGOD Bihar Live Scraper (Playwright)');
  console.log('URL:', BASE_URL);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Intercept API calls to find backend data endpoints
  const apiCalls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('api') || url.includes('organization') || url.includes('district') || url.includes('block') || url.includes('json')) {
      apiCalls.push({ url, method: req.method() });
      console.log('  API call:', url);
    }
  });

  console.log('\n[1/4] Loading iGOD Bihar page...');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
    await page.waitForTimeout(3000); // Let JS render
  } catch (e) {
    console.log('  Page load warning:', e.message);
  }

  // Get page title
  const title = await page.title();
  console.log('  Page title:', title);

  // Try to find any list of districts/organizations
  console.log('\n[2/4] Extracting organization data...');

  // Look for links that might be district links
  const links = await page.evaluate(() => {
    const anchors = document.querySelectorAll('a[href*="BR"], a[href*="district"], a[href*="block"], a[href*="organizations"]');
    return Array.from(anchors).map(a => ({
      text: a.textContent.trim(),
      href: a.href,
    })).filter(a => a.text && a.text.length > 2);
  });

  console.log('  Found links:', links.length);
  links.slice(0, 20).forEach(l => console.log('   -', l.text, '|', l.href));

  // Get all visible text
  const pageText = await page.evaluate(() => document.body.innerText);
  
  // Look for district names in the text
  const districtPattern = /(ARARIA|ARWAL|AURANGABAD|BANKA|BEGUSARAI|BHAGALPUR|BHOJPUR|BUXAR|DARBHANGA|EAST CHAMPARAN|GAYA|GOPALGANJ|JAMUI|JEHANABAD|KAIMUR|KATIHAR|KHAGARIA|KISHANGANJ|LAKHISARAI|MADHEPURA|MADHUBANI|MUNGER|MUZAFFARPUR|NALANDA|NAWADA|PATNA|PURNIA|ROHTAS|SAHARSA|SAMASTIPUR|SARAN|SHEIKHPURA|SHEOHAR|SITAMARHI|SIWAN|SUPAUL|VAISHALI|WEST CHAMPARAN|CHAMPARAN)/gi;
  const foundDistricts = [...new Set(pageText.match(districtPattern) || [])];
  console.log('  Districts found in page text:', foundDistricts);

  // Look for organization cards/list items
  const orgs = await page.evaluate(() => {
    // Try common patterns for organization listings
    const selectors = [
      '.org-name', '.organization-name', '.org-item', '.org-card',
      '.district-name', '.block-name', '.list-item', 
      '[data-type="district"]', '[data-type="block"]',
      'li.org', 'div.org', 'article.org',
      '.card-title', '.item-title',
    ];
    
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        return {
          selector: sel,
          items: Array.from(els).map(el => el.textContent.trim()),
        };
      }
    }
    
    // Fallback: get all list items
    const lis = document.querySelectorAll('main li, #content li, .content li');
    if (lis.length > 0) {
      return {
        selector: 'li (fallback)',
        items: Array.from(lis).map(li => li.textContent.trim()).filter(t => t.length > 3),
      };
    }
    
    return null;
  });

  if (orgs) {
    console.log(`  Found ${orgs.items.length} items via selector: ${orgs.selector}`);
    orgs.items.slice(0, 10).forEach(item => console.log('   -', item));
  }

  // Take a screenshot for debugging
  await page.screenshot({ path: 'igod_screenshot.png', fullPage: true });
  console.log('\n  Screenshot saved: igod_screenshot.png');

  console.log('\n[3/4] API calls intercepted:');
  apiCalls.forEach(c => console.log('  -', c.method, c.url));

  const result = {
    url: BASE_URL,
    title,
    links_found: links.length,
    districts_in_text: foundDistricts,
    org_items: orgs ? orgs.items : [],
    api_calls: apiCalls,
    scraped_at: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
  console.log(`\n[4/4] Saved raw scrape data to: ${OUTPUT_JSON}`);

  await browser.close();
  return result;
}

scrapeIGOD()
  .then(data => {
    console.log('\n✅ Scraping complete');
    console.log('Districts found in page:', data.districts_in_text.length);
    console.log('Organization items:', data.org_items.length);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
