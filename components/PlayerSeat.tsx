"use client";

interface Player {
  id: string;
  name: string;
  chips: number;
  bet: number;
  hand: Array<{ suit: string; rank: string }>;
  folded: boolean;
  allIn: boolean;
  isActive: boolean;
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
  const seatPosition = (() => {
    // Calculate positions around the table in a circle
    const angle = (position * 45) - 90; // 8 positions, 45 degrees apart, starting from top
    const radius = 35; // percentage from center
    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
    return { x, y };
  })();

  const getCardDisplay = () => {
    if (player.folded) {
      return (
        <div className="flex gap-1">
          <div className="card back"></div>
          <div className="card back"></div>
        </div>
      );
    }

    if (isCurrentPlayer && gameState === "playing") {
      return (
        <div className="flex gap-1">
          {player.hand.map((card, index) => (
            <div key={index} className="card">
              <div className="card-inner">
                <div className="card-rank">{card.rank}</div>
                <div className="card-suit">{getSuitSymbol(card.suit)}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex gap-1">
        <div className="card back"></div>
        <div className="card back"></div>
      </div>
    );
  };

  const getSuitSymbol = (suit: string) => {
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
        className={`player-seat text-center flex flex-col items-center justify-center ${
          isCurrentPlayer ? "current-player" : ""
        } ${player.folded ? "folded" : ""} ${
          isCurrentTurn ? "current-turn" : ""
        }`}
      >
        <div className="player-info mb-2">
          <div className="player-name text-sm font-bold">
            {player.name}
            {isCurrentPlayer && " (YOU)"}
          </div>
          {isDealer && (
            <div className="dealer-badge text-xs bg-poker-gold text-black px-1 rounded">
              DEALER
            </div>
          )}
        </div>

        <div className="player-chips text-xs mb-1">
          ${player.chips}
        </div>

        {player.bet > 0 && (
          <div className="player-bet text-xs bg-poker-gold text-black px-1 rounded mb-1">
            Bet: ${player.bet}
          </div>
        )}

        {player.folded && (
          <div className="folded-badge text-xs bg-gray-600 text-white px-1 rounded mb-1">
            FOLDED
          </div>
        )}

        {player.allIn && (
          <div className="allin-badge text-xs bg-poker-red text-white px-1 rounded mb-1">
            ALL IN
          </div>
        )}

        <div className="player-cards">{getCardDisplay()}</div>
      </div>
    </div>
  );
}
