'use client'

import { useState } from 'react'
import { GameLobbyProps } from '../types'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-800 to-teal-900">
      <div className="bg-poker-dark/90 backdrop-blur-md p-8 rounded-lg shadow-2xl border border-poker-gold/60 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-poker-gold mb-2">Texas Hold&apos;em</h1>
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
              className="w-full px-4 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-600/60 rounded-lg text-white focus:outline-none focus:border-poker-gold/80 focus:bg-gray-800/90"
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
                className="w-full px-4 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-600/60 rounded-lg text-white focus:outline-none focus:border-poker-gold/80 focus:bg-gray-800/90"
                placeholder="Enter room code"
                maxLength={6}
              />
            </div>
          ) : (
            <div className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg border border-poker-gold/60">
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
                  className="w-full bg-cyan-600/90 backdrop-blur-sm text-white px-6 py-2 rounded-lg font-bold hover:bg-cyan-700/90 transition-colors border border-cyan-300/20 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p>• Room creator controls when to start the game</p>
        </div>
      </div>
    </div>
  )
} 