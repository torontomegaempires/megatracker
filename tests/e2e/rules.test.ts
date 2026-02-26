import { test, expect } from '@playwright/test';

test.describe('Rules Reference', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/rules');
	});

	test('loads with Rules Reference heading', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Rules Reference' })).toBeVisible();
	});

	test('all section anchors are present', async ({ page }) => {
		for (const id of ['phases', 'token-pool', 'vp', 'cards', 'calamities', 'commodities', 'ast']) {
			await expect(page.locator(`#${id}`)).toBeAttached();
		}
	});

	test('section jump nav buttons are visible', async ({ page }) => {
		await expect(page.getByRole('button', { name: 'Phases', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Cards', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Calamities', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Commodities', exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'AST', exact: true })).toBeVisible();
	});

	test('search filters civilization cards in real-time', async ({ page }) => {
		const searchInput = page.getByPlaceholder('Search cards, calamities…');
		await searchInput.fill('pottery');

		// Pottery card should be visible
		await expect(page.getByText('Pottery')).toBeVisible();
	});

	test('Eastern deck filter hides Western-only cards', async ({ page }) => {
		// Pottery is a Western card — it should be visible before filtering
		await expect(page.getByText('Pottery')).toBeVisible();

		// Click Eastern filter
		await page.getByRole('button', { name: 'Eastern' }).click();

		// Pottery (Western) should no longer appear in the list
		await expect(page.getByText('Pottery')).not.toBeVisible();
	});

	test('calamity expand/collapse toggle works', async ({ page }) => {
		// Find the first calamity button (e.g. "Epidemic")
		const calamityBtn = page.getByRole('button', { name: /Epidemic/ });
		await expect(calamityBtn).toBeVisible();

		// Resolution steps should not be visible before expanding
		const resolutionText = page.getByText(/resolution/i).first();

		// Expand
		await calamityBtn.click();
		// After clicking, expanded content should appear (a div after the button)
		const calamitySection = page.locator('#calamities');
		await expect(calamitySection.locator('text=Resolution').first()).toBeVisible();

		// Collapse — click again
		await calamityBtn.click();
		await expect(calamitySection.locator('text=Resolution').first()).not.toBeVisible();
	});
});
