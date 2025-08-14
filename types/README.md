# Types Organization

This folder contains all TypeScript interfaces and types used throughout the Texas Hold'em poker game application.

## File Structure

### `card.ts`
Contains card-related types and interfaces:
- `Suit` - Type for card suits (hearts, diamonds, clubs, spades)
- `Card` - Interface for a playing card with suit and rank
- `PlayingCardProps` - Props interface for the PlayingCard component

### `player.ts`
Contains player-related interfaces:
- `Player` - Interface for a poker player with all their game state

### `game.ts`
Contains game state and game-related interfaces:
- `GameState` - Main game state interface
- `GameControlsProps` - Props for the GameControls component
- `BettingPanelProps` - Props for the BettingPanel component
- `PokerTableProps` - Props for the PokerTable component

### `ui.ts`
Contains UI component interfaces:
- `GameLobbyProps` - Props for the GameLobby component
- `CommunityCardsProps` - Props for the CommunityCards component

### `index.ts`
Main export file that re-exports all types for easy importing throughout the application.

## Usage

Import types from the main types folder:

```typescript
import { Card, Player, GameState } from '../types';
```

Or import specific types from individual files:

```typescript
import { Card } from '../types/card';
import { Player } from '../types/player';
```
