"use client";

import { useState } from "react";
import { formatMoney } from "../utils/formatters";

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

interface BettingPanelProps {
  player: Player;
  currentBet: number;
  onBet: (amount: number) => void;
  onRaise: (amount: number) => void;
  onCheck: () => void;
  onClose: () => void;
}

export default function BettingPanel({
  player,
  currentBet,
  onBet,
  onRaise,
  onCheck,
  onClose,
}: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState(currentBet);
  // Set initial action based on whether there's a current bet
  const [action, setAction] = useState<"bet" | "raise">(
    currentBet > 0 ? "raise" : "bet"
  );

  const handleSubmit = () => {
    if (action === "bet") {
      onBet(betAmount);
    } else {
      onRaise(betAmount);
    }
  };

  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    const minAmount = action === "bet" ? 1 : currentBet + 1;
    const maxAmount = player.chips;
    
    // Handle empty input or NaN
    if (e.target.value === "" || isNaN(value)) {
      setBetAmount(minAmount);
      return;
    }
    
    // Clamp value between min and max
    const clampedValue = Math.max(minAmount, Math.min(maxAmount, value));
    setBetAmount(clampedValue);
  };

  const quickAmounts = [10, 50, 100, 250];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-poker-dark p-4 rounded-lg border-2 border-poker-gold max-w-md w-full mx-4 sm:p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-poker-gold mb-2 sm:text-xl">
            {action === "bet" ? "Place Bet" : "Raise"}
          </h3>
          <p className="text-gray-300 text-sm mb-1">
            Your chips: {formatMoney(player.chips)}
          </p>
          <p className="text-gray-300 text-sm">
            Current bet: {formatMoney(currentBet)}
          </p>
        </div>

        <div className="space-y-4">
          {/* Action Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setAction("bet")}
              className={`flex-1 py-1 px-2 rounded-lg font-bold transition-colors sm:py-2 sm:px-4 text-sm ${
                action === "bet"
                  ? "bg-poker-gold text-poker-dark"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
            >
              Bet
            </button>
            <button
              onClick={() => setAction("raise")}
              className={`flex-1 py-1 px-2 rounded-lg font-bold transition-colors sm:py-2 sm:px-4 text-sm ${
                action === "raise"
                  ? "bg-poker-gold text-poker-dark"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
            >
              Raise
            </button>
          </div>

          {/* Bet Amount Input */}
          <div>
            <label
              htmlFor="betAmount"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Amount
            </label>
            <input
              type="number"
              id="betAmount"
              value={betAmount}
              onChange={handleBetAmountChange}
              min={action === "bet" ? 1 : currentBet + 1}
              max={player.chips}
              step="1"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-poker-gold"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-xs text-gray-300 mb-2 sm:text-sm">
              Quick amounts:
            </p>
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <button
                onClick={() =>
                  setBetAmount(action === "bet" ? 1 : currentBet + 1)
                }
                className="py-1 px-2 bg-gray-700 text-white rounded-lg text-xs hover:bg-gray-600 sm:py-2 sm:px-3"
              >
                Min ({formatMoney(action === "bet" ? 1 : currentBet + 1)})
              </button>
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={amount > player.chips}
                  className="py-1 px-2 bg-gray-700 text-white rounded-lg text-xs hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed sm:py-2 sm:px-3"
                >
                  {formatMoney(amount)}
                </button>
              ))}
              <button
                onClick={() => setBetAmount(player.chips)}
                className="py-1 px-2 bg-red-700 text-white rounded-lg text-xs hover:bg-red-600 sm:py-2 sm:px-3"
              >
                All In
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-1 px-2 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors sm:py-2 sm:px-4"
            >
              Cancel
            </button>
            {currentBet === 0 && (
              <button
                onClick={onCheck}
                className="flex-1 py-1 px-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors sm:py-2 sm:px-4 text-sm"
              >
                Check
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={
                betAmount < (action === "bet" ? 1 : currentBet + 1) ||
                betAmount > player.chips
              }
              className="flex-1 py-1 px-2 bg-poker-gold text-poker-dark rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:py-2 sm:px-4 text-sm"
            >
              {action === "bet" ? "Bet" : "Raise"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
