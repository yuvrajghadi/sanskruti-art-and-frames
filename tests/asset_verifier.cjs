/**
 * Asset Reachability & Image Integrity Verifier
 */
const https = require('https');
const http = require('http');

const urls = [
  // Google CDN Images in Landing Page
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBJnUtQzCOcLX5rQD40Na7D_w3PHna1FYfgXntfnkzedcFg0tpNxdtG0XnIY_xAuAlu4D2LEU7bV4JbBRdCfy3UAqID8maVz3HFNpG1Y_fZeDA4jb82O4gAkf3A5PxaZ6QdazY2v6-LG3O3GkRtsSApLCwtFMCiTSQuIHoSGN9nZDmTOm1KoC5WAsKA9lAlldI35s6DGnGUuI88ZUqONkCNe3xlrCCPgojDvl0Dz8o",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCu_ZbPN4Xh--lu_eNw5mgOnLPRkcud40SPr37YnwB3ZP4Ez_IXuiXYkNIFj5eyWaG3wFPoPNT-ietmD4oLUCgrEn5wrUw8tjuB8cxC4mZR-9X-Wree1rhBKhwq-T53-d9MsZ9lFm_vuYflFfXTaZkOpHRHjbSR5kO2pPhZlwCgXegkEpUrnmynmx8bggANdcs8SntK6lOlB8MOFdgyO8pWpAJjIrsrszVB2K5rPsg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAzrJQ2wKQU_6zW8406B2f84oQTZr65gElKc4-kP1wTqflGydY2_4Va-NqtV-DZwsGlDALAvtMpw5IdQ9lyQgxjay2xKQuIjewXyvb7g329aQuC6GWQ4gmsHzAKSPqZLGBeRFHKr-kEEk6OBp33GkLxlnFkCO03RGAYmYDdInBjNDFkXAYLpeX8Yh6fYrxigzf0-gwQmmK9f_57i39j1tvrW5xlYTrOP_md7eDjZSQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCejEUm51IVBkhNH11XUFRh25EeoRL-eNJqhUfHgBMIGu_3lnl7EyxIGAOiOMkb8ZkUa40vv1NYSQnTDgPx_5OoRy-EERwjSkTBdj40DlwdNM1k91y6v8y7TKVB96RYSCs2KfMc3zXx_CK7X8Yc85hM3XHBBKIFDUYkW6MAk2fWPe-tgMMYb1bjisyqATLAIoqMq9eXaHFB1XVcgP56Y2r9XL5mQ3pkH9i2kalxxPM",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCy_kSGQ0Ik7cOOUgQcxWJiH0_XaERNOPmkIP_dtd1QoFBYa233XeGn0K5QYGYuQJOURXTljlb-wwmNogu8-8Y2iObXlLGGf7Qc1jiGHxmsuH_TVqwRiwu1-HFOuUJ-PEHFuhLF5WEX37NpRLL9nwUx_ibWwh8K2OvlomZStcmlMTAxTo1gzXNAXfzZ9WR-ZIQGjib6Kao47ImHOTGn-Wb2y00_w4sCKOsmxz-Ygdc",
  // Google Fonts CSS
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap"
];

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        resolve({ url, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
      });
      req.on('error', (err) => resolve({ url, status: 0, ok: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ url, status: 408, ok: false, error: 'Timeout' });
      });
      req.end();
    } catch (e) {
      resolve({ url, status: 0, ok: false, error: e.message });
    }
  });
}

async function run() {
  console.log('Testing asset URLs reachability...');
  for (const url of urls) {
    const res = await checkUrl(url);
    console.log(`[${res.ok ? 'PASS' : 'WARN'}] ${res.url.slice(0, 75)}... -> Status: ${res.status} ${res.error || ''}`);
  }
}

run();

