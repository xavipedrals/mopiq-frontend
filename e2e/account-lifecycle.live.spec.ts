import { test, expect, prepareNewVisitor } from './support/disposable-account';

test('new visitor signs up, completes first-use study, and deletes their account', async ({ page, account }, testInfo) => {
  test.skip(process.env.E2E_LIVE_ACCOUNTS !== '1', 'Set E2E_LIVE_ACCOUNTS=1 to create and delete a real disposable account.');
  if (!process.env.E2E_CLEANUP_PROJECT_DIR) {
    throw new Error('Set E2E_CLEANUP_PROJECT_DIR to the linked Supabase checkout while owned-deck account deletion is broken. No test account has been created.');
  }
  await prepareNewVisitor(page);

  await test.step('Create an account from the main page', async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
    const login = page.getByRole('dialog', { name: 'Log in', exact: true });
    await login.getByRole('button', { name: 'Need an account? Register', exact: true }).click();
    const signup = page.getByRole('dialog', { name: 'Create account', exact: true });
    await signup.getByLabel('Name', { exact: true }).fill(account.name);
    await signup.getByLabel('Email', { exact: true }).fill(account.email);
    await signup.getByLabel('Password (6+ characters)', { exact: true }).fill(account.password);
    await signup.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page).toHaveURL(/\/decks$/, { timeout: 60_000 });
    await expect(page.getByText('No decks yet. Create one to start studying.', { exact: true })).toBeVisible();
    await account.ready();
  });

  const deckName = `Playwright first deck ${Date.now()}`;
  account.createdDeckName = deckName;
  await test.step('Create a first deck and card through the website', async () => {
    await page.getByRole('button', { name: 'Add a deck', exact: true }).click();
    await page.getByRole('button', { name: 'Create a Deck With custom cards', exact: true }).click();
    await page.getByPlaceholder('Deck name', { exact: true }).fill(deckName);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('option', { name: 'Geography', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('heading', { name: deckName, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add cards', exact: true }).click();
    const editor = page.locator('.creator-root');
    // Tiptap exposes two contenteditable fields in question/answer order.
    await editor.locator('[contenteditable="true"]').nth(0).fill('What is the capital of France?');
    await editor.locator('[contenteditable="true"]').nth(1).fill('Paris');
    const saved = page.waitForResponse(response => response.url().includes('/functions/v1/save_owned_card') && response.request().method() === 'POST');
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await saved).ok()).toBeTruthy();
    await expect(editor.locator('[contenteditable="true"]').nth(0)).toHaveText('');
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('What is the capital of France?', { exact: true })).toBeVisible();
  });

  await test.step('Complete the first-study tutorial and review the new card', async () => {
    await page.getByRole('button', { name: 'Study', exact: true }).click();
    await expect(page.getByRole('button', { name: /Custom study Choose your cards/ })).toBeVisible();
    await page.getByRole('button', { name: /Study smarter Review cards/ }).click();
    const tutorial = page.locator('.tutorial-root');
    await expect(tutorial).toBeVisible();
    await expect(tutorial.getByRole('heading', { name: 'Let’s try one', exact: true })).toBeVisible();
    await tutorial.getByRole('button', { name: 'Show answer', exact: true }).last().click();
    await tutorial.getByRole('button', { name: 'Good', exact: true }).click();
    await expect(tutorial.getByText('In 2 days', { exact: true }).last()).toBeVisible();
    await tutorial.getByRole('button', { name: 'Start Studying', exact: true }).click();
    await expect(tutorial).toHaveCount(0);
    await page.getByRole('button', { name: /Show answer$/ }).click();
    await page.locator('button.grade.easy').click();
    await expect(page.getByRole('heading', { name: 'You’re done for now', exact: true })).toBeVisible();
    await testInfo.attach('first-study-complete', { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Close study', exact: true }).click();
    await expect(page.getByRole('heading', { name: deckName, exact: true })).toBeVisible();
  });

  await test.step('Delete the disposable account from Settings', async () => {
    await page.locator('a.profile-card').click();
    await expect(page).toHaveURL(/\/profile$/);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('button.settings-row').filter({ hasText: account.email }).click();
    await page.getByRole('button', { name: 'Delete my account', exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'Are you sure?', exact: true });
    const deletedFirebase = page.waitForResponse(response => response.url().includes('/accounts:delete?') && response.request().method() === 'POST');
    const deletedSupabase = page.waitForResponse(response => response.url().includes('/functions/v1/delete_current_user') && response.request().method() === 'DELETE');
    await confirmation.getByRole('button', { name: 'Delete my account', exact: true }).click();
    expect((await deletedFirebase).ok()).toBeTruthy();
    const supabaseResponse = await deletedSupabase;
    expect(supabaseResponse.ok(), `Account deletion must remove the Supabase identity with owned decks (HTTP ${supabaseResponse.status()})`).toBeTruthy();
    await expect(page).toHaveURL(/\/$/);
    await account.verifyDeleted();
    await page.goto('/profile');
    await expect(page.getByRole('dialog', { name: 'Log in', exact: true })).toBeVisible();
  });
});
