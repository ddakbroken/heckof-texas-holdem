"use client";

import { useState, useEffect } from "react";
import { GameLobbyProps } from "../types";

interface RoomInfo {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  gameState: "waiting" | "playing" | "finished";
  roomCreator: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-poker-dark/95 backdrop-blur-md p-6 rounded-lg shadow-2xl border border-poker-gold/60 max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

export default function GameLobby({ onJoinGame }: GameLobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [availableRooms, setAvailableRooms] = useState<RoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(false);

  const fetchAvailableRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const response = await fetch("/api/rooms");
      if (response.ok) {
        const rooms = await response.json();
        setAvailableRooms(rooms);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleRefreshRooms = async () => {
    if (refreshCooldown) return;
    
    setRefreshCooldown(true);
    await fetchAvailableRooms();
    
    // Enable the button after 5 seconds
    setTimeout(() => {
      setRefreshCooldown(false);
    }, 5000);
  };

  useEffect(() => {
    // Fetch rooms on component mount
    fetchAvailableRooms();

    // Set up polling to refresh rooms every 10 seconds
    const interval = setInterval(fetchAvailableRooms, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleJoinRoom = () => {
    if (playerName.trim() && roomId.trim()) {
      onJoinGame(roomId, playerName);
    }
  };

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      const newRoomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      onJoinGame(newRoomId, playerName);
    }
  };

  const handleJoinAvailableRoom = (room: RoomInfo) => {
    if (playerName.trim()) {
      setRoomId(room.roomId);
      onJoinGame(room.roomId, playerName);
    } else {
      // Focus on the player name input if it's empty
      const playerNameInput = document.getElementById(
        "playerName"
      ) as HTMLInputElement;
      if (playerNameInput) {
        playerNameInput.focus();
      }
    }
  };

  const openJoinModal = () => {
    if (!playerName.trim()) {
      const playerNameInput = document.getElementById(
        "playerName"
      ) as HTMLInputElement;
      if (playerNameInput) {
        playerNameInput.focus();
      }
      return;
    }
    setShowJoinModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-800 to-teal-900">
      {/* Sticky Header */}
      <div className="sticky top-2 mx-2 xs:mx-4 mb-8">
        <div className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl max-w-2xl mx-auto">
          {/* Glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-2xl"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-poker-gold/10 via-transparent to-poker-gold/5 rounded-2xl"></div>
          
          {/* Main header content */}
          <div className="relative text-center py-4 xs:py-6 sm:py-8 px-4">
            <div className="flex items-center justify-center mb-3">
              <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold bg-gradient-to-r from-poker-gold via-yellow-300 to-poker-gold bg-clip-text text-transparent drop-shadow-lg">
                Heck of Texas Hold&apos;em
              </h1>
            </div>
            
            <p className="text-gray-300 text-sm xs:text-base sm:text-lg font-medium tracking-wide">
              Play a poker game with up to 8 players
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 xs:p-4 gap-4">
        <div className="bg-poker-dark/90 backdrop-blur-md p-4 sm:p-8 rounded-lg shadow-2xl border border-poker-gold/60 max-w-2xl w-full">
          {/* Main Input Section */}
          <div className="space-y-6">
            <div>
              <label
                htmlFor="playerName"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
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

            <div className="space-y-3">
              <button
                onClick={handleCreateRoom}
                disabled={!playerName.trim()}
                className="w-full game-button disabled:bg-poker-dark enabled:bg-cyan-600/90 text-white px-6 py-2 rounded-lg font-bold enabled:hover:bg-cyan-700/90 transition-colors border enabled:border-cyan-300/20 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create New Room
              </button>
              <button
                onClick={openJoinModal}
                disabled={!playerName.trim()}
                className="w-full game-button disabled:opacity-50 px-6 py-2 font-bold disabled:cursor-not-allowed"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>

        <div className="bg-poker-dark/90 backdrop-blur-md p-4 sm:p-8 rounded-lg shadow-2xl border border-poker-gold/60 max-w-2xl w-full">
          {/* Available Rooms Section - Separate Box */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-poker-gold">Available Rooms</h3>
            <button
              onClick={handleRefreshRooms}
              disabled={isLoadingRooms || refreshCooldown}
              className="text-sm bg-gray-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg hover:bg-gray-700/90 transition-colors border border-gray-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingRooms ? 'Loading...' : refreshCooldown ? 'Wait 5s' : 'Refresh'}
            </button>
          </div>

          {availableRooms.length === 0 ? (
            <div className="text-center py-8 bg-gray-700/80 backdrop-blur-sm rounded-lg border border-gray-500/60">
              <p className="text-gray-300">No available rooms</p>
              <p className="text-sm text-gray-400 mt-1">
                Create a new room to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="bg-gray-700/80 backdrop-blur-sm p-4 rounded-lg border border-gray-500/60 hover:border-poker-gold/60 hover:bg-gray-600/80 transition-all duration-200 cursor-pointer transform hover:scale-[1.02]"
                  onClick={() => handleJoinAvailableRoom(room)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-poker-gold">{room.roomId}</p>
                      <p className="text-sm text-gray-300">
                        {room.playerCount}/{room.maxPlayers} players
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 text-xs bg-green-600/90 backdrop-blur-sm text-white rounded-full">
                        {room.gameState === "waiting" ? "Waiting" : "Playing"}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">Click to join</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Join Room Modal */}
      <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)}>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-poker-gold">Join Room</h2>
          <div>
            <label
              htmlFor="modalRoomId"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Room Code
            </label>
            <input
              type="text"
              id="modalRoomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-600/60 rounded-lg text-white focus:outline-none focus:border-poker-gold/80 focus:bg-gray-800/90"
              placeholder="Enter room code"
              maxLength={6}
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowJoinModal(false)}
              className="flex-1 px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-colors border border-gray-400/20"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleJoinRoom();
                setShowJoinModal(false);
              }}
              disabled={!roomId.trim()}
              className="flex-1 game-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
