import { Card } from './card';

export interface Player {
  id: string;
  name: string;
  chips: number;
  startingChips?: number;
  bet: number;
  hand: Array<Card>;
  folded: boolean;
  allIn: boolean;
  isActive: boolean;
  isAI?: boolean;
}
