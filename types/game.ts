import { Card } from './card';
import { Player } from './player';

export interface GameState {
  roomId: string;
  players: Player[];
  communityCards: Array<Card>;
  pot: number;
  sidePots?: Array<{ amount: number; players: string[] }>;
  currentBet: number;
  round: string;
  gameState: string;
  currentPlayerIndex: number;
  dealerIndex: number;
  endReason?: "early_end" | "showdown" | null;
  roomCreator?: string;
  lastRaiserIndex?: number;
  roundStartIndex?: number;
  showAllCards?: boolean;
  bigBlind: number;
  blindsPosted?: boolean;
}

export interface GameControlsProps {
  gameState: string;
  currentPlayer: Player | null;
  players: Player[];
  isMyTurn: boolean;
  roomCreator?: string;
  endReason?: "early_end" | "showdown" | null;
  currentBet: number;
  isStartingGame?: boolean;
  onStartGame: () => void;
  onFold: () => void;
  onCall: () => void;
  onCheck: () => void;
  onRaise: () => void;
  onNextRound: () => void;
  onForceRestart?: () => void;
  onExitToLobby?: () => void;
}

export interface BettingPanelProps {
  player: Player;
  currentBet: number;
  onBet: (amount: number) => void;
  onRaise: (amount: number) => void;
  onClose: () => void;
}

export interface PokerTableProps {
  roomId: string;
  playerName: string;
  onExitToLobby: () => void;
}
