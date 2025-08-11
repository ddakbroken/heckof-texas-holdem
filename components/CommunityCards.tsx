"use client";

import PlayingCard from "./PlayingCard";

interface Card {
  suit: string;
  rank: string;
}

interface CommunityCardsProps {
  cards: Card[];
  round: string;
}

export default function CommunityCards({ cards, round }: CommunityCardsProps) {
  const getRoundDisplay = () => {
    switch (round) {
      case "preflop":
        return "Pre-Flop";
      case "flop":
        return "Flop";
      case "turn":
        return "Turn";
      case "river":
        return "River";
      case "showdown":
        return "Showdown";
      default:
        return round;
    }
  };

  return (
    <div className="text-center">
      {/* Round Display */}
      <div className="mb-4">
        <div className="text-lg font-bold text-poker-gold">
          {getRoundDisplay()}
        </div>
      </div>

      {/* Community Cards */}
      <div className="flex justify-center gap-1 xs:gap-2 sm:gap-3">
        {cards.map((card, index) => (
          <div key={index} className="flex flex-col items-center">
            <PlayingCard
              suit={card.suit as any}
              rank={card.rank}
              className="comminity-cards"
            />
          </div>
        ))}

        {/* Placeholder cards for future rounds */}
        {round === "preflop" && (
          <>
            {[...Array(5)].map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="flex flex-col items-center"
              >
                <div className="card-placeholder"></div>
              </div>
            ))}
          </>
        )}

        {round === "flop" && cards.length === 3 && (
          <>
            {[...Array(2)].map((_, index) => (
              <div
                key={`placeholder-${index}`}
                className="flex flex-col items-center"
              >
                <div className="card-placeholder"></div>
                <div className="text-xs text-gray-400 mt-1">?</div>
              </div>
            ))}
          </>
        )}

        {round === "turn" && cards.length === 4 && (
          <>
            <div className="flex flex-col items-center">
              <div className="card-placeholder"></div>
              <div className="text-xs text-gray-400 mt-1">?</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
