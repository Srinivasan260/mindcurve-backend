import puppeteer, { type Browser } from 'puppeteer';
import { logger } from '../utils/logger.js';

// Single browser instance kept warm across requests. Puppeteer's cold-start is
// ~1-2s; on a long-running server we amortize that across all PDF renders.
let browserPromise: Promise<Browser> | null = null;

const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const b = await browserPromise;
    b.on('disconnected', () => {
      logger.warn('Puppeteer browser disconnected — will relaunch on next render');
      browserPromise = null;
    });
    return b;
  }
  return browserPromise;
};

export const pdfService = {
  /** Renders an HTML string to a Letter-size PDF buffer with default margins. */
  renderHtml: async (html: string): Promise<Buffer> => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      // Template has no external resources (images, fonts, scripts), so
      // domcontentloaded is sufficient and avoids the wait-for-network timeout.
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      });
      return Buffer.from(buffer);
    } finally {
      await page.close();
    }
  },
};
