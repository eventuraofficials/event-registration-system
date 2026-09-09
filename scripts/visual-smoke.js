const { chromium } = require('playwright');

const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
const pages = [
  { name: 'landing', path: '/pages/landing.html', selectors: ['.brand-mark img', '#hero-title'] },
  { name: 'registration', path: '/pages/index.html', selectors: ['#siteHeaderLogo', '#heroTitle', '#guestForm'] },
  { name: 'admin', path: '/pages/admin.html', selectors: ['.app-sidebar', '.admin-sidebar-brand img', '#loginScreen'] },
  { name: 'checkin', path: '/pages/checkin.html', selectors: ['.app-header', '.boh-company-logo', '#loginGate'] }
];
const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1440, height: 1000 }
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      for (const entry of pages) {
        const response = await page.goto(`${baseUrl}${entry.path}`, { waitUntil: 'domcontentloaded' });
        if (!response || !response.ok()) failures.push(`${entry.name}/${viewport.name}: HTTP ${response?.status() || 'no response'}`);
        const missing = await page.evaluate((selectors) => selectors.filter((selector) => !document.querySelector(selector)), entry.selectors);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || [...document.querySelectorAll('body *')].some((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
        }));
        if (missing.length) failures.push(`${entry.name}/${viewport.name}: missing ${missing.join(', ')}`);
        if (overflow) failures.push(`${entry.name}/${viewport.name}: horizontal overflow`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log(`Visual smoke passed: ${pages.length} pages x ${viewports.length} viewports`);
})();
