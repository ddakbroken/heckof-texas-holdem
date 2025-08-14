export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export interface Card {
  suit: Suit;
  rank: string;
}

export interface PlayingCardProps {
  suit?: Suit;
  rank?: string;
  faceDown?: boolean;
  className?: string;
}
