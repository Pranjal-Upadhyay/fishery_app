/**
 * iGOD Bihar Full Live Scraper — Playwright
 * Scrapes: Districts → Blocks → Panchayats
 * URL: https://igod.gov.in/sg/BR/E042/organizations
 *
 * Run: node scrape_igod_full.mjs
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

const BASE = 'https://igod.gov.in';
const START_URL = `${BASE}/sg/BR/E042/organizations`;
const OUTPUT_JSON = 'igod_bihar_full.json';
const DELAY_MS = 1000; // polite delay between requests

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(page, url) {
  try {
    const resp = await page.evaluate(async (u) => {
      const r = await fetch(u, {
        headers: { Accept: 'application/json, text/html, */*' },
      });
      const ct = r.headers.get('content-type') || '';
      const text = await r.text();
      return { status: r.status, contentType: ct, text };
    }, url);
    return resp;
  } catch (e) {
    return { status: 0, contentType: '', text: '' };
  }
}

async function extractDistrictLinks(page) {
  console.log('\n[Step 1] Loading Bihar Districts page...');
  await page.goto(START_URL, { waitUntil: 'networkidle', timeout: 45000 });
  await sleep(2000);

  // Extract all district block/subdistrict links AND district names
  const data = await page.evaluate(() => {
    const result = { districts: [] };
    const seen = new Set();

    // The page lists districts — find the district cards/rows
    // Look for links with pattern /district/<id>/blocks
    const links = document.querySelectorAll('a[href*="/district/"]');
    links.forEach((a) => {
      const href = a.href;
      const m = href.match(/\/district\/([^/]+)\/(blocks|sub_districts|panchayats)/);
      if (m) {
        const distId = m[1];
        if (!seen.has(distId)) {
          seen.add(distId);
          // Find the district name — look at surrounding elements
          let name = '';
          // Go up to find the parent card
          let el = a.closest('[class*="card"], [class*="item"], [class*="row"], li, tr, div');
          if (el) {
            // Find heading or strong text
            const heading = el.querySelector('h1, h2, h3, h4, h5, h6, strong, .name, .title, [class*="name"]');
            if (heading) name = heading.textContent.trim();
            else name = el.querySelector(':first-child')?.textContent?.trim() || '';
          }
          result.districts.push({
            id: distId,
            name: name || `District-${distId.slice(0, 8)}`,
            blocksUrl: `${window.location.origin}/district/${distId}/blocks`,
            subDistUrl: `${window.location.origin}/district/${distId}/sub_districts`,
          });
        }
      }
    });

    // Also try to get district names from the visible district list
    const nameEls = document.querySelectorAll(
      '.district-name, [class*="district"] h3, [class*="district"] h4, [class*="org-name"], .card-title, [class*="name"]'
    );
    const names = Array.from(nameEls).map((el) => el.textContent.trim()).filter((t) => t.length > 2);

    // Get full page text to find district names
    const bodyText = document.body.innerText;

    return { ...result, nameElements: names, bodySnippet: bodyText.slice(0, 2000) };
  });

  console.log(`  Found ${data.districts.length} district IDs`);
  console.log('  Name elements:', data.nameElements.slice(0, 10));

  // If we didn't get names, try to infer from page structure
  if (data.districts.length > 0 && data.districts[0].name.startsWith('District-')) {
    // Navigate to each district's page to get its name
    console.log('  District names not found in links — will infer from block pages');
  }

  return data.districts;
}

async function fetchBlocksForDistrict(page, district) {
  console.log(`\n  Fetching blocks for district: ${district.name} (${district.id.slice(0, 12)}...)`);
  
  try {
    await page.goto(district.blocksUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1500);

    const data = await page.evaluate((distId) => {
      const blocks = [];
      const seen = new Set();

      // Get district name from page title or breadcrumb
      const breadcrumb = document.querySelector('[class*="breadcrumb"], nav[aria-label="breadcrumb"]');
      const distName = breadcrumb?.textContent?.trim() || document.title || '';

      // Find all block links
      const links = document.querySelectorAll('a[href*="/block/"]');
      links.forEach((a) => {
        const href = a.href;
        const m = href.match(/\/block\/([^/]+)\/(panchayats|sub_districts)/);
        if (m) {
          const blockId = m[1];
          if (!seen.has(blockId)) {
            seen.add(blockId);
            let name = '';
            let el = a.closest('[class*="card"], [class*="item"], li, tr');
            if (el) {
              const heading = el.querySelector('h1,h2,h3,h4,h5,h6,strong,.name,.title');
              if (heading) name = heading.textContent.trim();
            }
            if (!name) name = a.textContent.trim();
            blocks.push({
              id: blockId,
              name: name || `Block-${blockId.slice(0, 8)}`,
              panchayatsUrl: `${window.location.origin}/block/${blockId}/panchayats`,
            });
          }
        }
      });

      // Also try to get all visible block names
      const blockNameEls = document.querySelectorAll(
        '.block-name, [class*="block"] h3, [class*="block"] h4, [class*="block"] .name, .card-title, .org-name'
      );
      const blockNames = Array.from(blockNameEls)
        .map((el) => el.textContent.trim())
        .filter((t) => t.length > 2);

      // Get page title to extract district name
      const title = document.title;
      const titleMatch = title.match(/Bihar\s*[:\|]\s*([^:\|]+)\s*[:\|]\s*Blocks/i);
      const inferredDistName = titleMatch ? titleMatch[1].trim() : '';

      return { blocks, blockNames, inferredDistName, title };
    }, district.id);

    // Update district name if we found it
    if (data.inferredDistName) {
      district.name = data.inferredDistName;
    }

    console.log(`    Found ${data.blocks.length} blocks (title: ${data.title})`);
    if (data.blocks.length === 0 && data.blockNames.length > 0) {
      console.log(`    Block names found: ${data.blockNames.slice(0, 5).join(', ')}`);
    }

    return { ...data, districtId: district.id, districtName: district.name };
  } catch (e) {
    console.log(`    Error fetching blocks: ${e.message}`);
    return { blocks: [], districtId: district.id, districtName: district.name };
  }
}

async function fetchPanchayatsForBlock(page, block, districtName) {
  try {
    await page.goto(block.panchayatsUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(800);

    const data = await page.evaluate(() => {
      const panchayats = [];
      
      // Get page title for block/panchayat name inference
      const title = document.title;
      const titleMatch = title.match(/Bihar\s*[:\|][^:\|]+[:\|]\s*([^:\|]+)\s*[:\|]\s*Gram Panchayat/i);
      const blockName = titleMatch ? titleMatch[1].trim() : '';

      // Find all panchayat entries
      const panLinks = document.querySelectorAll('a[href*="/panchayat/"], a[href*="/gram_panchayat/"]');
      panLinks.forEach((a) => {
        const name = a.textContent.trim();
        if (name && name.length > 2) {
          panchayats.push({ name, href: a.href });
        }
      });

      // Fallback: get all card titles / list items that look like panchayat names
      if (panchayats.length === 0) {
        const els = document.querySelectorAll('.card-title, .org-name, [class*="panchayat"] .name, h3, h4');
        els.forEach((el) => {
          const name = el.textContent.trim();
          if (name.length > 3 && name.length < 100 && !name.match(/block|district|bihar|home|menu/i)) {
            panchayats.push({ name });
          }
        });
      }

      return { panchayats, title, blockName };
    });

    if (data.blockName) block.name = data.blockName;

    return data.panchayats;
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('iGOD Bihar Full Scraper (Playwright)');
  console.log('Target: ' + START_URL);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const fullData = {
    state: 'Bihar',
    igod_url: START_URL,
    districts: [],
    scraped_at: new Date().toISOString(),
  };

  try {
    // Step 1: Get all district IDs and names
    const districts = await extractDistrictLinks(page);
    console.log(`\nTotal districts found: ${districts.length}`);

    if (districts.length === 0) {
      console.log('No districts found! Checking page source...');
      const html = await page.content();
      fs.writeFileSync('igod_debug.html', html);
      console.log('Saved page HTML to igod_debug.html');
      await browser.close();
      return;
    }

    // Step 2: For each district, get blocks
    for (let i = 0; i < districts.length; i++) {
      const district = districts[i];
      console.log(`\n[${i + 1}/${districts.length}] District: ${district.name}`);

      const blockData = await fetchBlocksForDistrict(page, district);
      const distEntry = {
        id: district.id,
        name: blockData.inferredDistName || district.name,
        blocks: [],
      };

      // Step 3: For each block, get panchayats
      if (blockData.blocks.length > 0) {
        for (let j = 0; j < blockData.blocks.length; j++) {
          const block = blockData.blocks[j];
          console.log(`  [${j + 1}/${blockData.blocks.length}] Block: ${block.name}`);

          const panchayats = await fetchPanchayatsForBlock(page, block, distEntry.name);
          console.log(`    → ${panchayats.length} panchayats`);

          distEntry.blocks.push({
            id: block.id,
            name: block.name,
            panchayats: panchayats.map((p) => p.name),
          });

          await sleep(DELAY_MS);
        }
      }

      fullData.districts.push(distEntry);
      await sleep(DELAY_MS);
    }
  } catch (e) {
    console.error('Fatal error:', e.message);
  } finally {
    await browser.close();
  }

  // Save JSON output
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(fullData, null, 2));
  console.log(`\n✅ Saved: ${OUTPUT_JSON}`);
  console.log(`   Districts: ${fullData.districts.length}`);
  console.log(`   Total blocks: ${fullData.districts.reduce((s, d) => s + d.blocks.length, 0)}`);
  console.log(`   Total panchayats: ${fullData.districts.reduce((s, d) => s + d.blocks.reduce((bs, b) => bs + b.panchayats.length, 0), 0)}`);

  return fullData;
}

main().catch(console.error);
