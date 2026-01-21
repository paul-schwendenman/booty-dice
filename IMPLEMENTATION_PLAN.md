# Booty Dice - Multiplayer Web App Implementation Plan

## Overview

A real-time multiplayer web application for the pirate dice game "Booty Dice" using SvelteKit + Socket.io.

## Tech Stack

- **Frontend**: SvelteKit with TypeScript
- **Real-time**: Socket.io (integrated via Vite plugin for dev, custom Express server for prod)
- **Styling**: Basic CSS (functional MVP)
- **Adapter**: @sveltejs/adapter-node

## Project Structure

```
booty-dice/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── game/
│   │   │   │   ├── GameEngine.ts      # Core game state machine
│   │   │   │   ├── DiceRoller.ts      # Dice rolling + combo detection
│   │   │   │   └── ActionResolver.ts  # Resolve dice effects
│   │   │   ├── ai/
│   │   │   │   ├── AIPlayer.ts        # AI turn controller
│   │   │   │   └── AIStrategy.ts      # Decision-making logic
│   │   │   ├── rooms/
│   │   │   │   └── RoomManager.ts     # Room/lobby management
│   │   │   └── socket/
│   │   │       ├── socketServer.ts    # Socket.io setup
│   │   │       ├── lobbyHandlers.ts   # Lobby events
│   │   │       └── gameHandlers.ts    # Game events
│   │   ├── components/
│   │   │   ├── game/                  # Dice, PlayerCard, ActionPanel, etc.
│   │   │   ├── lobby/                 # LobbyPlayerList, RoomCode, etc.
│   │   │   └── ui/                    # Button, Modal, Toast
│   │   ├── stores/                    # Svelte stores for state
│   │   ├── socket/client.ts           # Client socket setup
│   │   └── types/                     # TypeScript definitions
│   └── routes/
│       ├── +page.svelte               # Landing (create/join room)
│       ├── lobby/[roomCode]/+page.svelte
│       └── game/[roomCode]/+page.svelte
├── server/index.ts                    # Production server
├── vite.config.ts                     # Dev socket plugin
└── svelte.config.js
```

## Implementation Phases

### Phase 1: Project Setup

1. Initialize SvelteKit project with TypeScript
2. Install dependencies: `socket.io`, `socket.io-client`, `@sveltejs/adapter-node`
3. Configure Vite plugin for dev Socket.io attachment
4. Create production Express server with Socket.io
5. Set up base styles

### Phase 2: Type System & Core Game Logic

1. Define types: `Die`, `DiceFace`, `Player`, `GameState`, `ComboType`
2. Implement `DiceRoller.ts`:
   - Roll unlocked dice
   - Detect combos: Mutiny (3+ Walk Planks), Shipwreck (3+ X's), Blackbeard's Curse
3. Implement `ActionResolver.ts`:
   - Apply dice effects (doubloons, damage, shields, stealing)
   - Handle targeted actions (Cutlass, Jolly Roger)
4. Implement `GameEngine.ts`:
   - Turn flow: roll (up to 3x) -> select targets -> resolve -> next player
   - Win conditions: 25 doubloons OR last pirate standing
   - Captain's Plunder: eliminator gets victim's doubloons

### Phase 3: Room & Lobby System

1. `RoomManager.ts`: Create/join rooms with 5-char codes, player tracking
2. Socket events: `lobby:create`, `lobby:join`, `lobby:ready`, `lobby:addAI`, `lobby:startGame`
3. Landing page: Name input, create room button, join with code
4. Lobby page: Player list, ready toggles, add AI button, start game

### Phase 4: Game UI Components

1. `Dice.svelte`: Die display with face emoji, locked state, roll animation
2. `DiceBoard.svelte`: 6 dice grid with selection
3. `PlayerCard.svelte`: Name, doubloons, lives, shields, current turn indicator
4. `ActionPanel.svelte`: Roll button, dice lock toggles, target selection, end turn
5. `GameLog.svelte`: Scrolling action history
6. `WinnerModal.svelte`: Game over overlay

### Phase 5: Game Flow Integration

1. Socket events: `game:roll`, `game:lockDice`, `game:selectTarget`, `game:endTurn`
2. State sync: Server broadcasts `game:state` after each action
3. Turn phases: rolling -> selecting_targets -> resolving
4. Handle eliminations and win conditions

### Phase 6: AI Players

1. `AIStrategy.ts`: Decide which dice to keep, whether to roll again, who to target
2. `AIPlayer.ts`: Execute turn with delays for realistic pacing
3. AI runs on server, emits same events as humans

### Phase 7: Polish

1. Reconnection handling (30-second grace period)
2. Error toasts
3. Room cleanup after inactivity

---

## Key Design Decisions

### Server Authoritative

All game logic runs on the server. Clients only render state received from the server. This prevents cheating and ensures consistency across all players.

### Targeted Actions

Cutlass (attack) and Jolly Roger (steal) require the player to select a target from the other players. The UI will highlight targetable players when these dice are rolled.

### AI on Server

AI players are controlled entirely server-side. They emit the same socket events as human players, so the game flow is identical. Delays are added to simulate "thinking time."

### Room Codes

5-character alphanumeric codes using only unambiguous characters (no O/0, I/1/l). Example: `AB3XY`

---

## Socket Events

### Client -> Server

| Event               | Payload                    | Description                           |
| ------------------- | -------------------------- | ------------------------------------- |
| `lobby:create`      | `playerName`               | Create new room, returns room code    |
| `lobby:join`        | `roomCode, playerName`     | Join existing room                    |
| `lobby:ready`       | `isReady`                  | Toggle ready state                    |
| `lobby:addAI`       | -                          | Add AI player (host only)             |
| `lobby:startGame`   | -                          | Start the game (host only)            |
| `game:lockDice`     | `diceIndices[]`            | Lock dice for next roll               |
| `game:roll`         | -                          | Roll unlocked dice                    |
| `game:selectTarget` | `dieIndex, targetPlayerId` | Select target for cutlass/jolly roger |
| `game:endTurn`      | -                          | End turn and resolve actions          |

### Server -> Client

| Event                   | Payload                  | Description             |
| ----------------------- | ------------------------ | ----------------------- |
| `lobby:state`           | `players[], canStart`    | Full lobby state update |
| `lobby:playerJoined`    | `player`                 | New player joined       |
| `lobby:gameStarting`    | -                        | Game is about to start  |
| `game:state`            | `GameState`              | Full game state update  |
| `game:diceRolled`       | `dice[], combo`          | Dice roll result        |
| `game:turnChanged`      | `currentPlayerIndex`     | Next player's turn      |
| `game:playerEliminated` | `playerId, eliminatorId` | Player eliminated       |
| `game:ended`            | `winnerId, reason`       | Game over               |

---

## Game Rules Summary (from booty_dice_rules.md)

### Setup

- 2-6 players
- Each player starts with 5 doubloons and 10 lives

### Turn Flow

1. Roll some or all of 6 dice (up to 3 rolls per turn)
2. After each roll, you may lock dice to keep them
3. Resolve all dice actions
4. Pass to next player

### Dice Faces

| Face             | Effect                                                      |
| ---------------- | ----------------------------------------------------------- |
| Doubloon         | Gain 2 doubloons from treasure                              |
| X Marks the Spot | Lose 2 doubloons to treasure                                |
| Jolly Roger      | Steal 2 doubloons from another player                       |
| Cutlass          | Attack a player (removes 1 shield, or 1 life if no shields) |
| Walk the Plank   | Lose 1 life (shields don't protect)                         |
| Shield           | Gain 1 shield                                               |

### Combos

| Combo              | Trigger                                         | Effect                                       |
| ------------------ | ----------------------------------------------- | -------------------------------------------- |
| Mutiny             | 3+ Walk the Plank                               | All others lose 1 life (+1 per extra plank)  |
| Shipwreck          | 3+ X Marks the Spot                             | All others lose 3 doubloons (+1 per extra X) |
| Blackbeard's Curse | X + Jolly Roger + Walk Plank + Cutlass + Shield | All others lose 2 lives AND 5 doubloons      |

### Win Conditions

- **Reach 25 doubloons** OR
- **Be the last pirate standing**

### Captain's Plunder

If you eliminate a player on your turn, you get ALL their doubloons!

---

## Verification Plan

### Unit Tests

- Dice rolling randomness
- Combo detection (Mutiny, Shipwreck, Blackbeard's Curse)
- Action resolution (correct doubloon/life/shield changes)
- Win condition detection

### Integration Tests

- Room creation and joining
- Player ready states
- Full game flow with multiple players
- AI turn execution

### Manual Testing Checklist

- [ ] Create room, get shareable code
- [ ] Join room from different browser/device
- [ ] Add AI players to lobby
- [ ] Start game with mix of humans and AI
- [ ] Roll dice, lock some, re-roll
- [ ] Use Cutlass to attack (with and without target having shields)
- [ ] Use Jolly Roger to steal
- [ ] Trigger Mutiny combo
- [ ] Trigger Shipwreck combo
- [ ] Trigger Blackbeard's Curse
- [ ] Eliminate a player and receive their doubloons
- [ ] Win by reaching 25 doubloons
- [ ] Win by being last standing
- [ ] Disconnect and reconnect mid-game
- [ ] AI takes reasonable turns

### Running Locally

```bash
npm run dev
# Opens http://localhost:5173
# Socket.io runs on same port via Vite plugin
```
