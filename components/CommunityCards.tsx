'use client'

interface Card {
  suit: string
  rank: string
}

interface CommunityCardsProps {
  cards: Card[]
  round: string
}

export default function CommunityCards({ cards, round }: CommunityCardsProps) {
  const getRoundDisplay = () => {
    switch (round) {
      case 'preflop': return 'Pre-Flop'
      case 'flop': return 'Flop'
      case 'turn': return 'Turn'
      case 'river': return 'River'
      case 'showdown': return 'Showdown'
      default: return round
    }
  }

  const getSuitSymbol = (suit: string): string => {
    switch (suit) {
      case 'hearts': return '♥'
      case 'diamonds': return '♦'
      case 'clubs': return '♣'
      case 'spades': return '♠'
      default: return ''
    }
  }

  return (
    <div className="text-center">
      {/* Round Display */}
      <div className="mb-4">
        <div className="text-lg font-bold text-poker-gold">{getRoundDisplay()}</div>
      </div>

      {/* Community Cards */}
      <div className="flex justify-center gap-2">
        {cards.map((card, index) => (
          <div key={index} className={`card ${card.suit}`}>
            <div className="text-center">
              <div className="text-sm font-bold">{card.rank}</div>
              <div className="text-sm">{getSuitSymbol(card.suit)}</div>
            </div>
          </div>
        ))}
        
        {/* Placeholder cards for future rounds */}
        {round === 'preflop' && (
          <>
            {[...Array(5)].map((_, index) => (
              <div key={`placeholder-${index}`} className="w-16 h-24 bg-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center">
                <div className="text-gray-600 text-xs">?</div>
              </div>
            ))}
          </>
        )}
        
        {round === 'flop' && cards.length === 3 && (
          <>
            {[...Array(2)].map((_, index) => (
              <div key={`placeholder-${index}`} className="w-16 h-24 bg-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center">
                <div className="text-gray-600 text-xs">?</div>
              </div>
            ))}
          </>
        )}
        
        {round === 'turn' && cards.length === 4 && (
          <>
            <div className="w-16 h-24 bg-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center">
              <div className="text-gray-600 text-xs">?</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 