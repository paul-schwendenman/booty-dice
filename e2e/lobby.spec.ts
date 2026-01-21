import { test, expect } from '@playwright/test';

test.describe('Lobby', () => {
	test('should show player in lobby after creating room', async ({ page }) => {
		await page.goto('/');

		// Wait for socket connection
		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		// Should be in lobby
		await expect(page.getByText('Crew Assembly')).toBeVisible();
		await expect(page.getByText('Captain Jack')).toBeVisible();
		await expect(page.getByText('You')).toBeVisible();
	});

	test('should show room code in lobby', async ({ page }) => {
		await page.goto('/');

		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		await expect(page.getByText('Room Code:')).toBeVisible();
		// Room code button should be visible
		await expect(page.locator('.code')).toBeVisible();
	});

	test('should allow host to ready up', async ({ page }) => {
		await page.goto('/');

		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		// Should see Ready Up button
		const readyButton = page.getByRole('button', { name: 'Ready Up!' });
		await expect(readyButton).toBeVisible();

		await readyButton.click();

		// Should now show Not Ready button
		await expect(page.getByRole('button', { name: 'Not Ready' })).toBeVisible();
		await expect(page.getByText('Ready ✓')).toBeVisible();
	});

	test('should allow host to add AI player', async ({ page }) => {
		await page.goto('/');

		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		// Should see Add AI button
		const addAIButton = page.getByRole('button', { name: 'Add AI Pirate' });
		await expect(addAIButton).toBeVisible();

		await addAIButton.click();

		// Should see AI badge in player list
		await expect(page.locator('.badge.ai')).toBeVisible();
		await expect(page.getByText('Pirates (2/6)')).toBeVisible();
	});

	test('should show hint when not enough players', async ({ page }) => {
		await page.goto('/');

		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		await expect(page.getByText('Need at least 2 pirates to start')).toBeVisible();
	});

	test('should allow host to remove AI player', async ({ page }) => {
		await page.goto('/');

		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		// Add AI
		await page.getByRole('button', { name: 'Add AI Pirate' }).click();
		await expect(page.getByText('Pirates (2/6)')).toBeVisible();

		// Remove AI
		await page.locator('.remove-btn').click();

		await expect(page.getByText('Pirates (1/6)')).toBeVisible();
	});

	test('should enable Start Game button when conditions met', async ({ page }) => {
		await page.goto('/');

		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		// Start should be disabled initially
		const startButton = page.getByRole('button', { name: 'Start Game' });
		await expect(startButton).toBeDisabled();

		// Add AI and ready up
		await page.getByRole('button', { name: 'Add AI Pirate' }).click();
		await page.getByRole('button', { name: 'Ready Up!' }).click();

		// Start should now be enabled
		await expect(startButton).toBeEnabled();
	});
});

test.describe('Lobby - Multiplayer', () => {
	test('should allow second player to join via room code', async ({ context }) => {
		// Create room with first player
		const page1 = await context.newPage();
		await page1.goto('/');

		await page1.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page1.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page1.getByRole('button', { name: 'Create Room' }).click();

		// Get room code
		await expect(page1.locator('.code')).toBeVisible();
		const roomCode = await page1.locator('.code').textContent();

		// Join with second player
		const page2 = await context.newPage();
		await page2.goto('/');

		await page2.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page2.getByPlaceholder('Your Pirate Name').fill('Captain Barbossa');
		await page2.getByPlaceholder('Room Code').fill(roomCode!);
		await page2.getByRole('button', { name: 'Join' }).click();

		// Should be in lobby
		await expect(page2.getByText('Crew Assembly')).toBeVisible();
		await expect(page2.getByText('Captain Barbossa')).toBeVisible();

		// Both players should see 2 players
		await expect(page1.getByText('Pirates (2/6)')).toBeVisible();
		await expect(page2.getByText('Pirates (2/6)')).toBeVisible();
	});

	test('should allow second player to join via shared link', async ({ context }) => {
		// Create room with first player
		const page1 = await context.newPage();
		await page1.goto('/');

		await page1.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page1.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page1.getByRole('button', { name: 'Create Room' }).click();

		// Wait for lobby to load
		await expect(page1.getByText('Crew Assembly')).toBeVisible();

		// Get the lobby URL
		const lobbyUrl = page1.url();

		// Second player navigates directly to lobby URL
		const page2 = await context.newPage();
		await page2.goto(lobbyUrl);

		// Wait for page to load
		await page2.waitForLoadState('networkidle');

		// Wait for socket connection - look for any button on the page
		await page2.waitForSelector('button', { timeout: 10000 });

		// May see "Join Game" header if needs to join, or go straight to lobby
		const joinGameVisible = await page2.getByRole('heading', { name: 'Join Game' }).isVisible();

		if (joinGameVisible) {
			// Wait for join button to be enabled
			await page2.waitForFunction(() => {
				const btns = Array.from(document.querySelectorAll('button'));
				const joinBtn = btns.find((b) => b.textContent?.includes('Join Crew'));
				return joinBtn && !joinBtn.hasAttribute('disabled');
			});

			await page2.getByPlaceholder('Your Pirate Name').fill('Captain Barbossa');
			await page2.getByRole('button', { name: 'Join Crew' }).click();

			// Wait for join to complete
			await expect(page2.getByRole('heading', { name: 'Crew Assembly' })).toBeVisible({
				timeout: 10000
			});
		}

		// Should see crew assembly with 2 players
		await expect(page2.getByText('Pirates (2/6)')).toBeVisible({ timeout: 10000 });
	});
});
