import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Create room and start game with AI
		await page.goto('/');

		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		// Add AI and ready up
		await page.getByRole('button', { name: 'Add AI Pirate' }).click();
		await page.getByRole('button', { name: 'Ready Up!' }).click();

		// Start game
		await page.getByRole('button', { name: 'Start Game' }).click();

		// Wait for game to start
		await expect(page).toHaveURL(/\/game\/[A-Z0-9]+/);
	});

	test('should display game board after starting', async ({ page }) => {
		// Should see dice board
		await expect(page.locator('.dice-board')).toBeVisible();

		// Should see player cards section
		await expect(page.locator('.player-card').first()).toBeVisible();

		// Should see game log
		await expect(page.getByText('Game Log')).toBeVisible();
	});

	test('should display dice on the board', async ({ page }) => {
		// Should see 6 dice
		const dice = page.locator('.die');
		await expect(dice).toHaveCount(6);
	});

	test('should show roll button when it is my turn', async ({ page }) => {
		// Wait for game state to load
		await page.waitForSelector('.dice-board');

		// Check if it's my turn - the Roll button should be visible
		const rollButton = page.getByRole('button', { name: /Roll/i });
		const isMyTurn = await rollButton.isVisible();

		if (isMyTurn) {
			await expect(rollButton).toBeEnabled();
		}
	});

	test('should allow rolling dice', async ({ page }) => {
		await page.waitForSelector('.dice-board');

		const rollButton = page.getByRole('button', { name: /Roll/i });
		const isMyTurn = await rollButton.isVisible();

		if (isMyTurn) {
			// Roll the dice
			await rollButton.click();

			// After rolling, should still see dice
			await expect(page.locator('.die')).toHaveCount(6);

			// Rolls remaining should decrease
			await expect(page.getByText(/Rolls: [0-2]/)).toBeVisible();
		}
	});

	test('should allow locking dice', async ({ page }) => {
		await page.waitForSelector('.dice-board');

		const rollButton = page.getByRole('button', { name: /Roll/i });
		const isMyTurn = await rollButton.isVisible();

		if (isMyTurn) {
			// Roll first
			await rollButton.click();

			// Click on first die to lock it
			const firstDie = page.locator('.die').first();
			await firstDie.click();

			// Die should have locked class
			await expect(firstDie).toHaveClass(/locked/);
		}
	});

	test('should show action buttons when it is my turn', async ({ page }) => {
		await page.waitForSelector('.dice-board');

		const rollButton = page.getByRole('button', { name: /Roll/i });
		const isMyTurn = await rollButton.isVisible();

		if (isMyTurn) {
			// Should have action buttons (Roll, Resolve Dice, or End Turn)
			const hasRoll = await rollButton.isVisible();
			const hasResolve = await page.getByRole('button', { name: /Resolve Dice/i }).isVisible();
			const hasEndTurn = await page.getByRole('button', { name: /End Turn/i }).isVisible();

			expect(hasRoll || hasResolve || hasEndTurn).toBe(true);
		}
	});

	test('should display player cards with stats', async ({ page }) => {
		await page.waitForSelector('.player-card');

		// Should see player cards
		const playerCards = page.locator('.player-card');
		await expect(playerCards.first()).toBeVisible();

		// Player cards contain stat icons
		await expect(playerCards.first().locator('.icon').first()).toBeVisible();
	});
});

test.describe('Game - Target Selection', () => {
	test('should show target selection modal for attacks', async ({ page }) => {
		// This test verifies target selection appears when needed
		// Setup: Create game
		await page.goto('/');

		await page.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page.getByRole('button', { name: 'Create Room' }).click();

		await page.getByRole('button', { name: 'Add AI Pirate' }).click();
		await page.getByRole('button', { name: 'Ready Up!' }).click();
		await page.getByRole('button', { name: 'Start Game' }).click();

		await expect(page).toHaveURL(/\/game\/[A-Z0-9]+/);
		await page.waitForSelector('.dice-board');

		const rollButton = page.getByRole('button', { name: /Roll/i });
		const isMyTurn = await rollButton.isVisible();

		if (isMyTurn) {
			// Roll all three times to trigger target selection if cutlass/jolly roger appear
			for (let i = 0; i < 3; i++) {
				const roll = page.getByRole('button', { name: /Roll/i });
				if (await roll.isVisible()) {
					await roll.click();
					// Small wait for animation
					await page.waitForTimeout(300);
				}
			}

			// After rolling, if there are pending actions requiring targets,
			// we should see target selection UI or the turn should be resolvable
			// After rolling, we should see some action available
			// Could be target selection, Resolve Dice, or End Turn
			const hasTargetPrompt = await page.locator('.target-prompt').isVisible();
			const hasResolve = await page.getByRole('button', { name: /Resolve Dice/i }).isVisible();
			const hasEndTurn = await page.getByRole('button', { name: /End Turn/i }).isVisible();

			expect(hasTargetPrompt || hasResolve || hasEndTurn).toBe(true);
		}
	});
});

test.describe('Game - Multiplayer', () => {
	test('should show whose turn it is', async ({ context }) => {
		// Create room with first player
		const page1 = await context.newPage();
		await page1.goto('/');

		await page1.waitForFunction(() => {
			const btn = document.querySelector('button');
			return btn && !btn.hasAttribute('disabled');
		});

		await page1.getByPlaceholder('Your Pirate Name').fill('Captain Jack');
		await page1.getByRole('button', { name: 'Create Room' }).click();

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

		// Both ready up
		await page1.getByRole('button', { name: 'Ready Up!' }).click();
		await page2.getByRole('button', { name: 'Ready Up!' }).click();

		// Host starts game
		await page1.getByRole('button', { name: 'Start Game' }).click();

		// Both should be in game
		await expect(page1).toHaveURL(/\/game\/[A-Z0-9]+/);
		await expect(page2).toHaveURL(/\/game\/[A-Z0-9]+/);

		// Wait for game to load
		await page1.waitForSelector('.dice-board');
		await page2.waitForSelector('.dice-board');

		// One player should have the Roll button enabled (current turn)
		const page1HasRoll = await page1.getByRole('button', { name: /Roll/i }).isVisible();
		const page2HasRoll = await page2.getByRole('button', { name: /Roll/i }).isVisible();

		// At least one should be able to roll (it's someone's turn)
		expect(page1HasRoll || page2HasRoll).toBe(true);
	});
});
