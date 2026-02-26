import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('renders title and main buttons', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'MegaTracker' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Create Session' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Quick Demo (offline)' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Join Session' })).toBeVisible();
	});

	test('Create Session button shows form', async ({ page }) => {
		await page.getByRole('button', { name: 'Create Session' }).click();
		await expect(page.getByRole('heading', { name: 'Create Session' })).toBeVisible();
		await expect(page.getByPlaceholder('Friday Night Empires')).toBeVisible();
		await expect(page.getByPlaceholder('Enter your name')).toBeVisible();
	});

	test('Rules Reference link navigates to /rules', async ({ page }) => {
		await page.getByRole('link', { name: /Rules Reference/ }).click();
		await expect(page).toHaveURL('/rules');
	});

	test('Join Session link navigates to /join', async ({ page }) => {
		await page.getByRole('link', { name: 'Join Session' }).click();
		await expect(page).toHaveURL('/join');
	});
});
