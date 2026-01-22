# Booty Dice - Project Guide

A multiplayer web application for the pirate dice game "Booty Dice" built with SvelteKit and Socket.io.

## Quick Start

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Tech Stack

- **Frontend**: SvelteKit 2 with Svelte 5 (runes syntax: `$state`, `$derived`, `$effect`)
- **Real-time**: Socket.io for WebSocket communication
- **Language**: TypeScript throughout
- **Adapter**: @sveltejs/adapter-node for production

## Project Structure

```
src/
├── lib/
│   ├── server/              # Server-side only (runs in Node)
│   │   ├── game/
│   │   │   ├── GameEngine.ts      # Core game state machine
│   │   │   ├── DiceRoller.ts      # Dice rolling + combo detection
│   │   │   └── ActionResolver.ts  # Resolves dice effects on players
│   │   ├── ai/
│   │   │   ├── AIPlayer.ts        # AI turn execution with delays
│   │   │   └── AIStrategy.ts      # Decision logic for AI
│   │   ├── rooms/
│   │   │   └── RoomManager.ts     # Room creation, joining, player tracking
│   │   └── socket/
│   │       ├── socketServer.ts    # Socket.io setup
│   │       ├── lobbyHandlers.ts   # Lobby events (create, join, ready)
│   │       └── gameHandlers.ts    # Game events (roll, attack, end turn)
│   ├── components/
│   │   ├── game/            # Dice.svelte, DiceBoard.svelte, PlayerCard.svelte, etc.
│   │   ├── lobby/           # LobbyPlayerList.svelte, ReadyButton.svelte
│   │   └── ui/              # Button.svelte, Modal.svelte, Toast.svelte
│   ├── stores/              # Svelte stores for client state
│   ├── socket/client.ts     # Client-side Socket.io connection
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Helpers (room code generation, etc.)
├── routes/
│   ├── +page.svelte              # Landing page (create/join room)
│   ├── +layout.svelte            # Root layout with global styles
│   ├── lobby/[roomCode]/         # Lobby waiting room
│   └── game/[roomCode]/          # Active game page
```

## Game Rules Summary

- 2-6 players, each starts with 5 doubloons and 10 lives
- Win by: reaching 25 doubloons OR being the last pirate alive
- On your turn: roll up to 3 times, locking dice between rolls
- 6 dice faces: Doubloon (+2 coins), X Marks Spot (-2 coins), Jolly Roger (steal 2), Cutlass (attack), Walk Plank (lose 1 life), Shield (+1 shield)
- Combos: Mutiny (3+ planks), Shipwreck (3+ X's), Blackbeard's Curse (all 6 different faces)
- Captain's Plunder: if you eliminate someone, you get all their doubloons

## Key Patterns

### Socket.io Integration

The Vite dev server attaches Socket.io via a plugin in `vite.config.ts`. It uses `server.ssrLoadModule()` to load the socket handlers with proper `$lib` alias resolution.

For production, use `server/index.ts` which creates an Express server with Socket.io and uses the SvelteKit handler.

### State Management

- Server is authoritative - all game logic runs on server
- Client receives state via `game:state` events and renders it
- Svelte stores (`gameStore`, `lobbyStore`, `playerStore`) hold client-side state
- Derived stores compute things like `isMyTurn`, `currentPlayer`, etc.

### AI Players

AI runs on the server in `AIPlayer.ts`. It simulates thinking delays and makes decisions via `AIStrategy.ts`. AI emits the same socket events as human players.

## Socket Events

**Client → Server:**

- `lobby:create`, `lobby:join`, `lobby:ready`, `lobby:addAI`, `lobby:startGame`
- `game:lockDice`, `game:roll`, `game:selectTarget`, `game:endTurn`

**Server → Client:**

- `lobby:state`, `lobby:playerJoined`, `lobby:gameStarting`
- `game:state`, `game:diceRolled`, `game:turnChanged`, `game:playerEliminated`, `game:ended`

## Common Tasks

### Adding a new dice face

1. Add to `DiceFace` type in `src/lib/types/dice.ts`
2. Add emoji to `FACE_EMOJI` map
3. Add resolution logic in `ActionResolver.ts`
4. Update AI strategy in `AIStrategy.ts` if needed

### Modifying game rules

Core game logic is in `src/lib/server/game/`:

- `GameEngine.ts` - turn flow, win conditions
- `DiceRoller.ts` - combo detection
- `ActionResolver.ts` - what each dice face does

### Adding UI features

Components are in `src/lib/components/`. Use Svelte 5 runes:

- `let x = $state(initialValue)` for reactive state
- `let y = $derived(expression)` for computed values
- `$effect(() => { ... })` for side effects

## Testing

```bash
npm run check          # TypeScript + Svelte checks
npm run test:run       # Unit tests
npm run dev            # Manual testing locally
```

Open multiple browser tabs to test multiplayer. Use incognito for separate sessions.

## CI Requirements

Before pushing changes, ensure all CI checks pass. Run `/ci` to execute the full CI pipeline locally:

1. `npm run lint` - Prettier formatting + ESLint
2. `npm run check` - TypeScript + Svelte type checking
3. `npm run build` - Production build
4. `npm run test:run` - Unit tests

A pre-commit hook runs `lint` and `check` automatically on commit. If formatting fails, run `npm run format` to auto-fix.
