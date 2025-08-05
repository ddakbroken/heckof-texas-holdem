# Texas Hold'em Poker Game

A multiplayer Texas Hold'em poker game built with Next.js, Tailwind CSS, and WebSocket support. The game supports up to 10 players per room with real-time gameplay and AI opponents.

## Features

- 🎮 **Multiplayer Texas Hold'em**: Support for up to 10 players per room
- 🤖 **AI Opponents**: AI players automatically join when rooms are empty
- 🔄 **Real-time Gameplay**: WebSocket-based real-time updates
- 🎨 **Modern UI**: Beautiful interface with Tailwind CSS
- 🃏 **Full Poker Rules**: Complete Texas Hold'em implementation
- 💰 **Chip Management**: Virtual chip system with betting
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io
- **Backend**: Node.js WebSocket server

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd texas-holdem-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

This will start both:
- Next.js frontend on `http://localhost:3000`
- WebSocket server on `http://localhost:3001`

## How to Play

1. **Join a Game**:
   - Enter your name
   - Create a new room or join an existing one using a room code
   - Share the room code with other players
   - **AI players will automatically join if the room is empty**

2. **Start the Game**:
   - Wait for at least 2 players to join (including AI players)
   - Click "Start Game" to begin

3. **Gameplay**:
   - Each player starts with 1000 chips
   - Small blind: $10, Big blind: $20
   - Follow standard Texas Hold'em rules
   - Use the action buttons: Fold, Call, Raise
   - **AI players will make decisions automatically with realistic delays**

## AI Players

The game features intelligent AI opponents that:

- **Automatic Joining**: AI players automatically join empty rooms
- **Smart Decision Making**: AI uses hand strength, position, and pot odds
- **Realistic Behavior**: Random delays and unpredictable actions
- **Visual Indicators**: AI players are clearly marked with "AI" badges
- **Thinking Animation**: Shows when AI is making decisions

### AI Strategy

AI players use a sophisticated decision-making system based on:
- **Hand Strength**: Evaluates starting hand quality
- **Position**: Considers early, middle, and late position
- **Pot Odds**: Calculates whether calling is profitable
- **Randomization**: Adds unpredictability to prevent exploitation

## Game Rules

- **Pre-flop**: Players receive 2 hole cards
- **Flop**: 3 community cards are dealt
- **Turn**: 1 additional community card
- **River**: Final community card
- **Showdown**: Best 5-card hand wins

## Deployment

### Important Note: WebSocket Support

**Vercel Free Tier does NOT support WebSocket connections.** For production deployment, consider:

1. **Railway** (Recommended)
   - Easy deployment with WebSocket support
   - Free tier available

2. **Render**
   - Good WebSocket support
   - Free tier available

3. **Heroku**
   - WebSocket support
   - Paid plans required

4. **Self-hosted**
   - DigitalOcean, AWS, Google Cloud
   - Full control over infrastructure

### Deployment Steps

1. **Separate Frontend and Backend**:
   ```bash
   # Frontend (Next.js)
   npm run build
   npm start
   
   # Backend (WebSocket server)
   node server/websocket-server.js
   ```

2. **Environment Variables**:
   - Update WebSocket server URL in `PokerTable.tsx`
   - Set production WebSocket server URL

3. **Deploy Backend First**:
   - Deploy WebSocket server to your chosen platform
   - Update frontend to connect to production WebSocket URL

## Project Structure

```
texas-holdem-game/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── BettingPanel.tsx   # Betting interface
│   ├── CommunityCards.tsx # Community cards display
│   ├── GameControls.tsx   # Game action buttons
│   ├── GameLobby.tsx      # Lobby interface
│   ├── PlayerSeat.tsx     # Individual player display
│   └── PokerTable.tsx     # Main game table
├── server/                # WebSocket server
│   └── websocket-server.js # Game logic server with AI
├── package.json           # Dependencies
├── tailwind.config.js     # Tailwind configuration
└── README.md             # This file
```

## Development

### Available Scripts

- `npm run dev` - Start both frontend and WebSocket server
- `npm run dev:next` - Start only Next.js frontend
- `npm run dev:websocket` - Start only WebSocket server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Adding Features

1. **New Game Actions**: Add to `websocket-server.js`
2. **UI Components**: Create in `components/` directory
3. **Styling**: Use Tailwind classes or add to `globals.css`
4. **AI Improvements**: Modify AI logic in `websocket-server.js`

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**:
   - Ensure WebSocket server is running on port 3001
   - Check CORS settings in server configuration

2. **Players Not Joining**:
   - Verify room codes match exactly
   - Check browser console for errors

3. **Game Not Starting**:
   - Ensure at least 2 players have joined (AI players count)
   - Check server logs for errors

4. **AI Players Not Appearing**:
   - AI players only join when rooms are completely empty
   - Check server logs for AI player creation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Support

For issues or questions:
- Check the troubleshooting section
- Review server logs for errors
- Ensure all dependencies are installed correctly 