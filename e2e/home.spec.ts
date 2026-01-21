import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
	test('should display the home page title and tagline', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('heading', { name: /Booty Dice/i })).toBeVisible();
		await expect(page.getByText('Roll for the gold or die trying!')).toBeVisible();
	});

	test('should have input for pirate name', async ({ page }) => {
		await page.goto('/');

		const nameInput = page.getByPlaceholder('Your Pirate Name');
		await expect(nameInput).toBeVisible();
	});

	test('should have Create Room button', async ({ page }) => {
		await page.goto('/');

		const createButton = page.getByRole('button', { name: 'Create Room' });
		await expect(createButton).toBeVisible();
	});

	test('should have Join section with room code input', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText('or join existing')).toBeVisible();
		await expect(page.getByPlaceholder('Room Code')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Join' })).toBeVisible();
	});

	test('should show error when creating room without name', async ({ page }) => {
		await page.goto('/');

		// Wait for socket connection
		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByRole('button', { name: 'Create Room' }).click();

		await expect(page.getByText('Enter your pirate name!')).toBeVisible();
	});

	test('should navigate to lobby when creating room with valid name', async ({ page }) => {
		await page.goto('/');

		// Wait for socket connection
		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		// Should navigate to lobby with room code
		await expect(page).toHaveURL(/\/lobby\/[A-Z0-9]+/);
		await expect(page.getByText('Crew Assembly')).toBeVisible();
	});

	test('should show error when joining without name', async ({ page }) => {
		await page.goto('/');

		// Wait for socket connection
		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Room Code').fill('ABC123');
		await page.getByRole('button', { name: 'Join' }).click();

		await expect(page.getByText('Enter your pirate name!')).toBeVisible();
	});

	test('should show error when joining without room code', async ({ page }) => {
		await page.goto('/');

		// Wait for socket connection
		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Join' }).click();

		await expect(page.getByText('Enter a room code!')).toBeVisible();
	});
});
