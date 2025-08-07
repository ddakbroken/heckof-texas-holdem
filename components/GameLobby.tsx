'use client'

import { useState } from 'react'

interface GameLobbyProps {
  onJoinGame: (roomId: string, playerName: string) => void
}

export default function GameLobby({ onJoinGame }: GameLobbyProps) {
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)

  const handleJoinRoom = () => {
    if (playerName.trim() && roomId.trim()) {
      onJoinGame(roomId, playerName)
    }
  }

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      setRoomId(newRoomId)
      setIsCreatingRoom(true)
    }
  }

  const handleStartGame = () => {
    if (playerName.trim()) {
      onJoinGame(roomId, playerName)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-poker-green to-green-900">
      <div className="bg-poker-dark p-8 rounded-lg shadow-2xl border-2 border-poker-gold max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-poker-gold mb-2">Texas Hold'em</h1>
          <p className="text-gray-300">Join a poker game with up to 8 players</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-poker-gold"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          {!isCreatingRoom ? (
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 mb-2">
                Room Code
              </label>
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-poker-gold"
                placeholder="Enter room code"
                maxLength={6}
              />
            </div>
          ) : (
            <div className="bg-gray-800 p-4 rounded-lg border border-poker-gold">
              <p className="text-sm text-gray-300 mb-2">Room Code:</p>
              <p className="text-2xl font-bold text-poker-gold">{roomId}</p>
              <p className="text-xs text-gray-400 mt-1">Share this code with other players</p>
            </div>
          )}

          <div className="space-y-3">
            {!isCreatingRoom ? (
              <>
                <button
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || !roomId.trim()}
                  className="w-full game-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Room
                </button>
                <div className="text-center">
                  <span className="text-gray-400">or</span>
                </div>
                <button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim()}
                  className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create New Room
                </button>
              </>
            ) : (
              <button
                onClick={handleStartGame}
                disabled={!playerName.trim()}
                className="w-full game-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Game
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-400">
          <p>• Up to 8 players per room</p>
          <p>• Minimum 2 players to start</p>
          <p>• Each player starts with 1000 chips</p>
          <p>• Human players only - no AI opponents</p>
        </div>
      </div>
    </div>
  )
} 