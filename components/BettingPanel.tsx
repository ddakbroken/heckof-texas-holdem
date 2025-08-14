"use client";

import { useState } from "react";
import { formatMoney } from "../utils/formatters";
import { BettingPanelProps } from "../types";

export default function BettingPanel({
  player,
  currentBet,
  onBet,
  onRaise,
  onClose,
}: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState(currentBet > 0 ? currentBet + 20 : 20);

  const handleSubmit = () => {
    if (currentBet === 0) {
      onBet(betAmount);
    } else {
      onRaise(betAmount);
    }
  };

  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    const minAmount = currentBet === 0 ? 20 : currentBet + 20; // Minimum bet/raise is big blind
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-poker-dark/90 backdrop-blur-md p-4 rounded-lg border border-poker-gold/60 max-w-md w-full mx-4 sm:p-6 shadow-2xl">
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-poker-gold mb-2 sm:text-xl">
            {currentBet === 0 ? "Place Bet" : "Raise"}
          </h3>
          <p className="text-gray-300 text-sm">
            {currentBet === 0 ? "No current bet - you can bet any amount" : `Current bet: ${formatMoney(currentBet)}`}
          </p>
          <p className="text-gray-300 text-sm mb-1">
            Your chips: {formatMoney(player.chips)}
          </p>
        </div>

        <div className="space-y-4">
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
              min={currentBet === 0 ? 20 : currentBet + 20}
              max={player.chips}
              step="1"
              className="w-full px-4 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-600/60 rounded-lg text-white focus:outline-none focus:border-poker-gold/80 focus:bg-gray-800/90"
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
                  setBetAmount(currentBet === 0 ? 20 : currentBet + 20)
                }
                className="py-1 px-2 bg-gray-700/80 backdrop-blur-sm text-white rounded-lg text-xs hover:bg-gray-600/80 transition-colors border border-gray-500/20 sm:py-2 sm:px-3"
              >
                Min ({formatMoney(currentBet === 0 ? 20 : currentBet + 20)})
              </button>
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={amount > player.chips}
                  className="py-1 px-2 bg-gray-700/80 backdrop-blur-sm text-white rounded-lg text-xs hover:bg-gray-600/80 transition-colors border border-gray-500/20 disabled:opacity-50 disabled:cursor-not-allowed sm:py-2 sm:px-3"
                >
                  {formatMoney(amount)}
                </button>
              ))}
              <button
                onClick={() => setBetAmount(player.chips)}
                className="py-1 px-2 bg-red-700/80 backdrop-blur-sm text-white rounded-lg text-xs hover:bg-red-600/80 transition-colors border border-red-500/20 sm:py-2 sm:px-3"
              >
                All In
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-1 px-2 bg-gray-600/80 backdrop-blur-sm text-white rounded-lg font-bold hover:bg-gray-700/80 transition-colors border border-gray-500/20 sm:py-2 sm:px-4"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                betAmount < (currentBet === 0 ? 20 : currentBet + 20) ||
                betAmount > player.chips
              }
              className="flex-1 py-1 px-2 bg-poker-gold/90 backdrop-blur-sm text-poker-dark rounded-lg font-bold hover:bg-yellow-400/90 transition-colors border border-yellow-300/30 disabled:opacity-50 disabled:cursor-not-allowed sm:py-2 sm:px-4 text-sm"
            >
              {currentBet === 0 ? "Bet" : "Raise"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
