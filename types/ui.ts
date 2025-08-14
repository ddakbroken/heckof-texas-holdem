import { Card } from './card';

export interface GameLobbyProps {
  onJoinGame: (roomId: string, playerName: string) => void;
}

export interface CommunityCardsProps {
  cards: Card[];
  round: string;
}
