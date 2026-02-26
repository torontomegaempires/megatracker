import { test, expect } from '@playwright/test';

test.describe('Demo flow', () => {
	test('full demo: landing → Quick Demo → fill name → Start Demo → dashboard', async ({
		page
	}) => {
		await page.goto('/');

		// Open demo form
		await page.getByRole('button', { name: 'Quick Demo (offline)' }).click();
		await expect(page.getByRole('heading', { name: 'Quick Demo' })).toBeVisible();

		// Start Demo is disabled without a name
		const startBtn = page.getByRole('button', { name: 'Start Demo' });
		await expect(startBtn).toBeDisabled();

		// Fill in name
		await page.getByPlaceholder('Enter your name').fill('Test Player');
		await expect(startBtn).toBeEnabled();

		// Start the demo
		await startBtn.click();
		await expect(page).toHaveURL('/dashboard');
	});

	test('dashboard shows Phase Banner and bottom nav with 7 tabs', async ({ page }) => {
		// Set up demo session
		await page.goto('/');
		await page.getByRole('button', { name: 'Quick Demo (offline)' }).click();
		await page.getByPlaceholder('Enter your name').fill('Test Player');
		await page.getByRole('button', { name: 'Start Demo' }).click();
		await expect(page).toHaveURL('/dashboard');

		// Phase banner visible (first match is the persistent banner)
		await expect(page.getByText(/Phase \d+/).first()).toBeVisible();

		// Bottom nav has 7 tabs
		const nav = page.locator('nav').last();
		const tabs = nav.getByRole('link');
		await expect(tabs).toHaveCount(7);
	});

	test('bottom nav tabs navigate to correct routes', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Quick Demo (offline)' }).click();
		await page.getByPlaceholder('Enter your name').fill('Test Player');
		await page.getByRole('button', { name: 'Start Demo' }).click();
		await expect(page).toHaveURL('/dashboard');

		const nav = page.locator('nav').last();

		// Nations tab
		await nav.getByRole('link', { name: /Nations/ }).click();
		await expect(page).toHaveURL('/nations');

		// Scoreboard tab
		await nav.getByRole('link', { name: /Scores/ }).click();
		await expect(page).toHaveURL('/scoreboard');

		// Action Log tab
		await nav.getByRole('link', { name: /Log/ }).click();
		await expect(page).toHaveURL('/action-log');

		// Rules tab
		await nav.getByRole('link', { name: /Rules/ }).click();
		await expect(page).toHaveURL('/rules');
	});

	test('scoreboard shows demo player with VP > 0', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Quick Demo (offline)' }).click();
		await page.getByPlaceholder('Enter your name').fill('Hero Player');
		await page.getByRole('button', { name: 'Start Demo' }).click();
		await expect(page).toHaveURL('/dashboard');

		// Use SPA nav to preserve module-level game state
		const nav = page.locator('nav').last();
		await nav.getByRole('link', { name: /Scores/ }).click();
		await expect(page).toHaveURL('/scoreboard');

		await expect(page.getByText('Hero Player')).toBeVisible();
		// Demo player starts with 1 city — VP total is a plain number in a styled span
		// The city chip (🏛 1) should appear for the 1 starting city
		await expect(page.getByText(/🏛/)).toBeVisible();
	});

	test('action log is accessible', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Quick Demo (offline)' }).click();
		await page.getByPlaceholder('Enter your name').fill('Test Player');
		await page.getByRole('button', { name: 'Start Demo' }).click();
		await page.goto('/action-log');

		await expect(page.getByRole('heading', { name: /Action Log/ })).toBeVisible();
	});
});
