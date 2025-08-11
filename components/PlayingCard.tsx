"use client";

import React, { useEffect, useState } from "react";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export interface PlayingCardProps {
  suit?: Suit;
  rank?: string;
  faceDown?: boolean;
  className?: string;
  showText?: boolean;
}

function getSuitSymbol(suit: Suit): string {
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

function isRed(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export default function PlayingCard({
  suit = "spades",
  rank = "A",
  faceDown = false,
  className = "",
  showText = false,
}: PlayingCardProps) {
  // Use locally downloaded assets prepared at build/install time
  const cdnBase = "/cards";

  const rankName = (() => {
    switch (rank) {
      case "A":
        return "ace";
      case "K":
        return "king";
      case "Q":
        return "queen";
      case "J":
        return "jack";
      case "10":
        return "10";
      default:
        return rank; // 2..9
    }
  })();

  const frontPng = `${cdnBase}/${rankName}_of_${suit}.png`;
  const frontSvg = `${cdnBase}/${rankName}_of_${suit}.svg`;
  const back = `${cdnBase}/back.svg`;

  const [imgSrc, setImgSrc] = useState(faceDown ? back : frontPng);

  useEffect(() => {
    setImgSrc(faceDown ? back : frontPng);
  }, [faceDown, frontPng]);

  const getCardText = () => {
    if (faceDown) return "";
    return (
      <div className="flex items-center justify-center gap-1">
        <span>{rank}</span>
        <span>{getSuitSymbol(suit)}</span>
      </div>
    );
  };

  return (
    <div
      className={`${className} flex gap-1 flex-col items-center justify-center`}
    >
      <div className="card relative">
        <img
          src={imgSrc}
          alt={`${faceDown ? "Card back" : `${rank} of ${suit}`}`}
          onError={() => {
            if (!faceDown && imgSrc === frontPng) {
              setImgSrc(frontSvg);
            }
          }}
        />
      </div>
      <div className="text-sm text-white font-mono">{getCardText()}</div>
    </div>
  );
}
