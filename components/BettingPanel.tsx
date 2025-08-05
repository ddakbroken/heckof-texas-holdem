'use client'

import { useState } from 'react'

interface Player {
  id: string
  name: string
  chips: number
  bet: number
  hand: Array<{ suit: string; rank: string }>
  folded: boolean
  allIn: boolean
  isActive: boolean
  isAI?: boolean
}

interface BettingPanelProps {
  player: Player
  currentBet: number
  onBet: (amount: number) => void
  onRaise: (amount: number) => void
  onClose: () => void
}

export default function BettingPanel({
  player,
  currentBet,
  onBet,
  onRaise,
  onClose
}: BettingPanelProps) {
  const [betAmount, setBetAmount] = useState(currentBet)
  const [action, setAction] = useState<'bet' | 'raise'>('bet')

  const handleSubmit = () => {
    if (action === 'bet') {
      onBet(betAmount)
    } else {
      onRaise(betAmount)
    }
  }

  const quickAmounts = [10, 25, 50, 100, 250, 500]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-poker-dark p-6 rounded-lg border-2 border-poker-gold max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-poker-gold mb-2">
            {action === 'bet' ? 'Place Bet' : 'Raise'}
          </h3>
          <p className="text-gray-300">
            Your chips: ${player.chips} | Current bet: ${currentBet}
          </p>
        </div>

        <div className="space-y-4">
          {/* Action Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setAction('bet')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${
                action === 'bet'
                  ? 'bg-poker-gold text-poker-dark'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Bet
            </button>
            <button
              onClick={() => setAction('raise')}
              className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${
                action === 'raise'
                  ? 'bg-poker-gold text-poker-dark'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              Raise
            </button>
          </div>

          {/* Bet Amount Input */}
          <div>
            <label htmlFor="betAmount" className="block text-sm font-medium text-gray-300 mb-2">
              Amount
            </label>
            <input
              type="number"
              id="betAmount"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min={action === 'bet' ? 0 : currentBet + 1}
              max={player.chips}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-poker-gold"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm text-gray-300 mb-2">Quick amounts:</p>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  disabled={amount > player.chips}
                  className="py-2 px-3 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={betAmount < (action === 'bet' ? 0 : currentBet + 1) || betAmount > player.chips}
              className="flex-1 py-2 px-4 bg-poker-gold text-poker-dark rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {action === 'bet' ? 'Bet' : 'Raise'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 