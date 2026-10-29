import { test, expect } from '@playwright/test';

const languages = [
  { code: 'nb', name: 'Norsk bokmål', heading: 'Lær alt raskere' },
  { code: 'nl', name: 'Nederlands', heading: 'Leer alles sneller' },
  { code: 'sv', name: 'Svenska', heading: 'Lär dig allt snabbare' },
  { code: 'he', name: 'עברית', heading: 'ללמוד הכול מהר יותר' },
  { code: 'fi', name: 'Suomi', heading: 'Opi kaikki nopeammin' },
  { code: 'da', name: 'Dansk', heading: 'Lær alt hurtigere' },
  { code: 'zh-Hans', name: '简体中文', heading: '学习各种知识 更快一步' },
];

for (const theme of ['light', 'dark'] as const) {
  test(`new languages update the website and persist in ${theme} mode`, async ({ page, context }, testInfo) => {
    await context.addInitScript((appearance) => {
      localStorage.setItem('mopiq-theme', appearance);
      localStorage.setItem('mopiq-analytics-consent', 'denied');
    }, theme);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    for (const { code, name, heading } of languages) {
      await page.locator('.language-trigger').click();
      await page.getByRole('menuitemradio', { name, exact: true }).click();
      await expect(page.locator('.hero h1')).toHaveText(heading);
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      await expect(page.locator('html')).toHaveAttribute('dir', code === 'he' ? 'rtl' : 'ltr');
      await expect(page).not.toHaveTitle('Mopiq Flashcards — Study faster with spaced repetition');
      await expect.poll(() => page.evaluate(() => localStorage.getItem('mopiq-language'))).toBe(code);

      await page.locator('.nav-actions > button').click();
      const login = page.getByRole('dialog');
      await expect(login).toBeVisible();
      await expect(login.locator('.lede')).not.toHaveText('Use the same account as the iOS app to study your decks in the browser.');
      await expect(login.locator('.switch')).not.toHaveText('Need an account? Register');
      await page.screenshot({ path: testInfo.outputPath(`${code}-login-${theme}.png`) });
      await page.keyboard.press('Escape');
      await expect(login).toHaveCount(0);

      await page.reload();
      await expect(page.locator('.hero h1')).toHaveText(heading);
      await expect(page.locator('.language-trigger')).toContainText(name);
      await page.screenshot({ path: testInfo.outputPath(`${code}-${theme}.png`) });
      await page.locator('.language-trigger').click();
      await page.screenshot({ path: testInfo.outputPath(`${code}-menu-${theme}.png`) });
      await page.keyboard.press('Escape');
    }

    // Returning to an existing language restores LTR and its original copy.
    await page.locator('.language-trigger').click();
    await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
    await expect(page.locator('.hero h1')).toHaveText('Learn everything faster');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
}
