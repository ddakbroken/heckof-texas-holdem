'use client'

import { useState } from 'react'
import GameLobby from '@/components/GameLobby'
import PokerTable from '@/components/PokerTable'

export default function Home() {
  const [gameState, setGameState] = useState<'lobby' | 'game'>('lobby')
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')

  const handleJoinGame = (room: string, name: string) => {
    setRoomId(room)
    setPlayerName(name)
    setGameState('game')
  }

  const handleExitToLobby = () => {
    setGameState('lobby')
    setRoomId('')
    setPlayerName('')
  }

  return (
    <main className="min-h-screen bg-poker-dark">
      {gameState === 'lobby' ? (
        <GameLobby onJoinGame={handleJoinGame} />
      ) : (
        <PokerTable 
          roomId={roomId} 
          playerName={playerName} 
          onExitToLobby={handleExitToLobby}
        />
      )}
    </main>
  )
} 