'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import PlayerSeat from './PlayerSeat'
import CommunityCards from './CommunityCards'
import GameControls from './GameControls'
import BettingPanel from './BettingPanel'

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

interface GameState {
  roomId: string
  players: Player[]
  communityCards: Array<{ suit: string; rank: string }>
  pot: number
  currentBet: number
  round: string
  gameState: string
  currentPlayerIndex: number
  dealerIndex: number
}

interface PokerTableProps {
  roomId: string
  playerName: string
}

export default function PokerTable({ roomId, playerName }: PokerTableProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [showBettingPanel, setShowBettingPanel] = useState(false)

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setIsConnected(true)
      newSocket.emit('joinRoom', { roomId, playerName })
    })

    newSocket.on('gameState', (state: GameState) => {
      setGameState(state)
      const player = state.players.find(p => p.name === playerName)
      setCurrentPlayer(player || null)
    })

    newSocket.on('playerJoined', ({ playerId, playerName }) => {
      console.log(`${playerName} joined the game`)
    })

    newSocket.on('playerLeft', ({ playerId }) => {
      console.log('Player left the game')
    })

    newSocket.on('gameStarted', () => {
      console.log('Game started!')
    })

    newSocket.on('error', ({ message }) => {
      console.error('Game error:', message)
    })

    return () => {
      newSocket.close()
    }
  }, [roomId, playerName])

  const handleStartGame = () => {
    socket?.emit('startGame')
  }

  const handleBet = (amount: number) => {
    socket?.emit('bet', { amount })
    setShowBettingPanel(false)
  }

  const handleFold = () => {
    socket?.emit('fold')
  }

  const handleCall = () => {
    socket?.emit('call')
  }

  const handleRaise = (amount: number) => {
    socket?.emit('raise', { amount })
    setShowBettingPanel(false)
  }

  const handleNextRound = () => {
    socket?.emit('nextRound')
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poker-gold mx-auto mb-4"></div>
          <p className="text-poker-gold">Connecting to game server...</p>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-poker-gold">Loading game...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 relative overflow-hidden">
      {/* Poker Table */}
      <div className="absolute inset-4 bg-green-700 rounded-full border-8 border-brown-800 shadow-2xl">
        <div className="absolute inset-8 bg-green-600 rounded-full border-4 border-green-800">
          {/* Community Cards */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <CommunityCards cards={gameState.communityCards} round={gameState.round} />
          </div>

          {/* Pot */}
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-center">
              <div className="text-2xl font-bold text-poker-gold">Pot: ${gameState.pot}</div>
              <div className="text-sm text-gray-300">Current Bet: ${gameState.currentBet}</div>
            </div>
          </div>

          {/* Player Seats */}
          <div className="absolute inset-0">
            {gameState.players.map((player, index) => (
              <PlayerSeat
                key={player.id}
                player={player}
                position={index}
                totalPlayers={gameState.players.length}
                isCurrentPlayer={currentPlayer?.id === player.id}
                isDealer={index === gameState.dealerIndex}
                isCurrentTurn={index === gameState.currentPlayerIndex}
                gameState={gameState.gameState}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Game Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <GameControls
          gameState={gameState.gameState}
          currentPlayer={currentPlayer}
          onStartGame={handleStartGame}
          onFold={handleFold}
          onCall={handleCall}
          onRaise={() => setShowBettingPanel(true)}
          onNextRound={handleNextRound}
        />
      </div>

      {/* Betting Panel */}
      {showBettingPanel && currentPlayer && (
        <BettingPanel
          player={currentPlayer}
          currentBet={gameState.currentBet}
          onBet={handleBet}
          onRaise={handleRaise}
          onClose={() => setShowBettingPanel(false)}
        />
      )}

      {/* Room Info */}
      <div className="absolute top-4 left-4 bg-poker-dark bg-opacity-80 p-3 rounded-lg">
        <div className="text-sm">
          <p className="text-poker-gold">Room: {roomId}</p>
          <p className="text-gray-300">Players: {gameState.players.length}/10</p>
          <p className="text-gray-300">Round: {gameState.round}</p>
        </div>
      </div>
    </div>
  )
} 