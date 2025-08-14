import { Card } from "../types";

// Poker hand evaluation utilities

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const HAND_RANKINGS = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10
} as const;


export interface HandEvaluation {
  rank: number;
  hand: Card[];
  handName: string;
}

export function getHandName(rank: number): string {
  const names: Record<number, string> = {
    [HAND_RANKINGS.HIGH_CARD]: 'High Card',
    [HAND_RANKINGS.PAIR]: 'Pair',
    [HAND_RANKINGS.TWO_PAIR]: 'Two Pair',
    [HAND_RANKINGS.THREE_OF_A_KIND]: 'Three of a Kind',
    [HAND_RANKINGS.STRAIGHT]: 'Straight',
    [HAND_RANKINGS.FLUSH]: 'Flush',
    [HAND_RANKINGS.FULL_HOUSE]: 'Full House',
    [HAND_RANKINGS.FOUR_OF_A_KIND]: 'Four of a Kind',
    [HAND_RANKINGS.STRAIGHT_FLUSH]: 'Straight Flush',
    [HAND_RANKINGS.ROYAL_FLUSH]: 'Royal Flush'
  };
  return names[rank] || 'Unknown';
}

export function evaluateHand(playerHand: Card[], communityCards: Card[]): HandEvaluation {
  const allCards = [...playerHand, ...communityCards];
  const combinations = getCombinations(allCards, 5);
  let bestHand: Card[] = [];
  let bestRank = 0;

  for (const combination of combinations) {
    const handRank = getHandRank(combination);
    if (handRank > bestRank) {
      bestRank = handRank;
      bestHand = combination;
    }
  }

  return { 
    rank: bestRank, 
    hand: bestHand, 
    handName: getHandName(bestRank) 
  };
}

function getCombinations(cards: Card[], r: number): Card[][] {
  if (r === 0) return [[]];
  if (cards.length === 0) return [];
  
  const combinations: Card[][] = [];
  for (let i = 0; i <= cards.length - r; i++) {
    const head = cards[i];
    const tailCombinations = getCombinations(cards.slice(i + 1), r - 1);
    for (const tailCombination of tailCombinations) {
      combinations.push([head, ...tailCombination]);
    }
  }
  return combinations;
}

function getHandRank(cards: Card[]): number {
  const sortedCards = cards.sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  const ranks = sortedCards.map(card => card.rank);
  const suits = sortedCards.map(card => card.suit);
  
  // Check for flush
  const isFlush = suits.every(suit => suit === suits[0]);
  
  // Check for straight
  const isStraight = isStraightHand(ranks);
  
  // Count rank frequencies
  const rankCounts: Record<string, number> = {};
  ranks.forEach(rank => {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });
  
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  // Royal Flush
  if (isFlush && isStraight && ranks[0] === 'A' && ranks[4] === '10') {
    return HAND_RANKINGS.ROYAL_FLUSH;
  }
  
  // Straight Flush
  if (isFlush && isStraight) {
    return HAND_RANKINGS.STRAIGHT_FLUSH;
  }
  
  // Four of a Kind
  if (counts[0] === 4) {
    return HAND_RANKINGS.FOUR_OF_A_KIND;
  }
  
  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return HAND_RANKINGS.FULL_HOUSE;
  }
  
  // Flush
  if (isFlush) {
    return HAND_RANKINGS.FLUSH;
  }
  
  // Straight
  if (isStraight) {
    return HAND_RANKINGS.STRAIGHT;
  }
  
  // Three of a Kind
  if (counts[0] === 3) {
    return HAND_RANKINGS.THREE_OF_A_KIND;
  }
  
  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return HAND_RANKINGS.TWO_PAIR;
  }
  
  // Pair
  if (counts[0] === 2) {
    return HAND_RANKINGS.PAIR;
  }
  
  // High Card
  return HAND_RANKINGS.HIGH_CARD;
}

function isStraightHand(ranks: string[]): boolean {
  const values = ranks.map(rank => RANK_VALUES[rank]).sort((a, b) => a - b);
  
  // Check for regular straight
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1] - values[i] !== 1) {
      return false;
    }
  }
  return true;
}

// Helper function to format hand description
export function formatHandDescription(evaluation: HandEvaluation): string {
  const { handName, hand } = evaluation;
  const sortedHand = hand.sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  
  switch (evaluation.rank) {
    case HAND_RANKINGS.ROYAL_FLUSH:
      return `${handName} of ${sortedHand[0].suit}`;
    case HAND_RANKINGS.STRAIGHT_FLUSH:
      return `${handName} ${sortedHand[0].rank} high of ${sortedHand[0].suit}`;
    case HAND_RANKINGS.FOUR_OF_A_KIND:
      return `${handName} of ${sortedHand[0].rank}s`;
    case HAND_RANKINGS.FULL_HOUSE:
      const threeRank = sortedHand[0].rank;
      const pairRank = sortedHand[3].rank;
      return `${handName} ${threeRank}s over ${pairRank}s`;
    case HAND_RANKINGS.FLUSH:
      return `${handName} ${sortedHand[0].rank} high of ${sortedHand[0].suit}`;
    case HAND_RANKINGS.STRAIGHT:
      return `${handName} ${sortedHand[0].rank} high`;
    case HAND_RANKINGS.THREE_OF_A_KIND:
      return `${handName} of ${sortedHand[0].rank}s`;
    case HAND_RANKINGS.TWO_PAIR:
      return `${handName} ${sortedHand[0].rank}s and ${sortedHand[2].rank}s`;
    case HAND_RANKINGS.PAIR:
      return `${handName} of ${sortedHand[0].rank}s`;
    case HAND_RANKINGS.HIGH_CARD:
      return `${handName} ${sortedHand[0].rank}`;
    default:
      return handName;
  }
}
