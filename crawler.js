/**
 * btdig.com Crawler for Browser Console
 * 
 * Usage: Paste this script into browser console on any btdig page, then run:
 * 
 * Basic usage (first 5 pages):
 *   const results = await crawlBtdig('nicollubin', { maxPages: 5, delay: 2000 });
 * 
 * Crawl specific pages (pages 3-7):
 *   const results = await crawlBtdig('nicollubin', { startPage: 3, endPage: 7, delay: 2000 });
 * 
 * Download results as markdown:
 *   downloadMarkdown(results, 'nicollubin.md');
 * 
 * Parameters:
 *   - query: search term (required)
 *   - startPage: start from this page (default: 1)
 *   - endPage: stop at this page (default: 0 = no limit)
 *   - maxPages: max pages from startPage (default: 0 = no limit)
 *   - delay: milliseconds between requests (default: 1000)
 *   - verbose: log to console (default: true)
 */

async function crawlBtdig(query, options = {}) {
  const {
    maxPages = 0,
    startPage = 1,
    endPage = 0,
    delay = 1000,  // ms between requests
    verbose = true,
  } = options;

  const results = [];
  let page = startPage;
  let emptyPages = 0;

  // Calculate total pages for progress tracking
  let totalPages = 0;
  if (endPage) {
    totalPages = endPage - startPage + 1;
  } else if (maxPages) {
    totalPages = maxPages;
  }

  const log = (msg) => {
    if (verbose) console.log(`[Crawler] ${msg}`);
  };

  while (true) {
    // Stop if we reach endPage
    if (endPage && page > endPage) break;
    // Stop if we reach maxPages (legacy: maxPages is offset from startPage)
    if (maxPages && page > startPage + maxPages - 1) break;

    const url = `https://en.btdig.com/search?q=${encodeURIComponent(query)}&p=${page}&order=2`;
    log(`Fetching page ${page}: ${url}`);

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Detect CAPTCHA
      if (html.includes('Please complete the security check') || html.includes('g-recaptcha')) {
        log('CAPTCHA detected! Solve it and try again.');
        break;
      }

      // Find all torrent name divs
      const nameElems = doc.querySelectorAll('div.torrent_name');
      if (nameElems.length === 0) {
        emptyPages++;
        if (emptyPages >= 2) {
          log('No results on page, stopping.');
          break;
        }
      } else {
        emptyPages = 0;
      }

      // Extract torrent info
      for (const nameElem of nameElems) {
        const name = nameElem.textContent.trim();
        let magnet = '';

        // Try to find magnet link
        let parent = nameElem.parentElement;
        if (parent) {
          const magnetDiv = parent.querySelector('div.torrent_magnet');
          if (magnetDiv) {
            const link = magnetDiv.querySelector('a[href^="magnet:"]');
            if (link) {
              magnet = link.href;
            }
          }
        }

        // Fallback: search next anchor
        if (!magnet) {
          const nextLink = nameElem.querySelector('a[href^="magnet:"]');
          if (nextLink) {
            magnet = nextLink.href;
          }
        }

        // Fallback: search in document for nearby magnet
        if (!magnet) {
          const allLinks = doc.querySelectorAll('a[href^="magnet:"]');
          // This is crude but may help in some cases
          if (allLinks.length > 0) {
            magnet = allLinks[0].href;
          }
        }

        if (name) {
          results.push({ name, magnet: magnet || '' });
          log(`  - ${name}`);
          if (magnet) {
            log(`    Magnet: ${magnet}`);
          }
        }
      }

      page++;

      // Log progress if we have a known total
      if (totalPages > 0) {
        const pagesProcessed = page - startPage;
        const progress = Math.min(100, (pagesProcessed / totalPages) * 100).toFixed(1);
        log(`Progress: ${progress}% (${pagesProcessed}/${totalPages} pages, ${results.length} torrents)`);
      } else {
        log(`Processed page ${page - startPage + 1} (${results.length} torrents so far)`);
      }

      // Respect delay between requests
      if (page <= (maxPages || 999)) {
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (e) {
      log(`Error fetching page ${page}: ${e.message}`);
      break;
    }
  }

  log(`\nCrawl complete: ${results.length} torrents found.`);
  return results;
}

function downloadMarkdown(results, filename = 'results.md') {
  let md = `# Crawled Results\n\n`;
  for (const it of results) {
    md += `- **Name**: ${it.name}  \n`;
    if (it.magnet) {
      md += `  - Magnet: ${it.magnet}  \n\n`;
    } else {
      md += `  - Magnet: (not found)  \n\n`;
    }
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log(`Downloaded ${filename}`);
}

// Export for use in console
window.crawlBtdig = crawlBtdig;
window.downloadMarkdown = downloadMarkdown;

console.log('✓ Crawler loaded. Usage:');
console.log('  Crawl first 5 pages: await crawlBtdig("query", { maxPages: 5, delay: 2000 })');  
console.log('  Crawl pages 3-7: await crawlBtdig("query", { startPage: 3, endPage: 7, delay: 2000 })');  
console.log('  Download: downloadMarkdown(results, "output.md");');
