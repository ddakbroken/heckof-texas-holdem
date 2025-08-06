"use client";

import { useMemo } from "react";

interface Player {
  id: string;
  name: string;
  chips: number;
  bet: number;
  hand: Array<{ suit: string; rank: string }>;
  folded: boolean;
  allIn: boolean;
  isActive: boolean;
  isAI?: boolean;
}

interface PlayerSeatProps {
  player: Player;
  position: number;
  totalPlayers: number;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  isCurrentTurn: boolean;
  gameState: string;
  currentPlayerIndex: number;
}

export default function PlayerSeat({
  player,
  position,
  totalPlayers,
  isCurrentPlayer,
  isDealer,
  isCurrentTurn,
  gameState,
  currentPlayerIndex,
}: PlayerSeatProps) {
  const seatPosition = useMemo(() => {
    // Always place current player at bottom center (6 o'clock position)
    if (isCurrentPlayer) {
      return { x: 50, y: 85 }; // Bottom center
    }

    // For other players, distribute them around the remaining positions
    // Calculate positions around the table, excluding bottom center
    const otherPlayers = totalPlayers - 1;
    const otherPlayerIndex =
      position > currentPlayerIndex ? position - 1 : position;

    // Calculate positions around the table, excluding bottom center
    // Start from 7 o'clock and go clockwise, skipping 6 o'clock
    const availablePositions = 11; // 12 positions minus 1 for current player
    const adjustedIndex = otherPlayerIndex % availablePositions;

    // Map to clock positions: 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5 (skipping 6)
    const clockPositions = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5];
    const clockPosition = clockPositions[adjustedIndex % clockPositions.length];

    // Convert clock position to angle (12 o'clock = -90 degrees, 3 o'clock = 0 degrees)
    const angle = clockPosition * 30 - 90;
    const radius = 35; // percentage from center
    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);

    return { x, y };
  }, [position, totalPlayers, isCurrentPlayer, currentPlayerIndex]);

  const getStatusText = () => {
    if (player.folded) return "FOLDED";
    if (player.allIn) return "ALL IN";
    if (isCurrentTurn) return player.isAI ? "AI THINKING..." : "YOUR TURN";
    return "";
  };

  const getStatusColor = () => {
    if (player.folded) return "text-gray-500";
    if (player.allIn) return "text-poker-gold";
    if (isCurrentTurn) return player.isAI ? "ai-thinking" : "text-green-400";
    return "text-white";
  };

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${seatPosition.x}%`,
        top: `${seatPosition.y}%`,
      }}
    >
      <div
        className={`player-seat ${
          isCurrentPlayer ? "ring-4 ring-poker-gold" : ""
        } ${isCurrentTurn ? "ring-4 ring-green-400" : ""}`}
      >
        {/* Player Name */}
        <div className="text-center mb-1 sm:mb-2">
          <div className="font-bold text-xs truncate max-w-24 flex items-center justify-center gap-1 sm:text-sm">
            {player.name}
            {player.isAI && <span className="ai-indicator">AI</span>}
            {isCurrentPlayer && (
              <span className="text-poker-gold font-bold">(YOU)</span>
            )}
          </div>
          {isDealer && <div className="text-xs text-poker-gold">DEALER</div>}
        </div>

        {/* Chips */}
        <div className="text-center mb-1 sm:mb-2">
          <div className="text-xs font-bold text-poker-gold sm:text-sm">
            ${player.chips}
          </div>
          {player.bet > 0 && (
            <div className="text-xs text-white">Bet: ${player.bet}</div>
          )}
        </div>

        {/* Status */}
        {getStatusText() && (
          <div
            className={`text-center text-xs font-bold ${getStatusColor()} sm:text-xs text-xs`}
          >
            {getStatusText()}
          </div>
        )}

        {/* Player Cards */}
        {gameState === "playing" && player.hand.length > 0 && (
          <div className="flex justify-center gap-0.5 mt-1 sm:gap-1 sm:mt-2">
            {player.hand.map((card, index) => (
              <div
                key={index}
                className={`card ${card.suit} ${
                  isCurrentPlayer ? "" : "other-player bg-gray-800"
                }`}
              >
                {isCurrentPlayer ? (
                  <div className="text-center">
                    <div className="text-xs">{card.rank}</div>
                    <div className="text-xs">{getSuitSymbol(card.suit)}</div>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-800 rounded border border-gray-600"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getSuitSymbol(suit: string): string {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
    default:
      return "";
  }
}
