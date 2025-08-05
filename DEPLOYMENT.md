# Free WebSocket Deployment Guide

## 🆓 Free WebSocket Hosting Options

### 1. **Railway** (Recommended) ⭐
**Free tier**: $5 credit monthly (enough for small projects)

#### Quick Setup:
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will automatically detect and deploy your WebSocket server

#### Environment Variables:
- `PORT`: Automatically set by Railway
- `FRONTEND_URL`: Your frontend URL (e.g., `https://your-app.vercel.app`)

### 2. **Render** 
**Free tier**: Available with limitations

#### Setup:
1. Go to [render.com](https://render.com)
2. Sign up and connect GitHub
3. Click "New" → "Web Service"
4. Select your repository
5. Set build command: `npm install`
6. Set start command: `node server/websocket-server.js`

### 3. **Fly.io**
**Free tier**: 3 shared-cpu VMs, 3GB persistent volume

#### Setup:
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run: `fly launch`
3. Follow the prompts
4. Deploy: `fly deploy`

### 4. **Glitch**
**Free tier**: Available

#### Setup:
1. Go to [glitch.com](https://glitch.com)
2. Click "New Project" → "Import from GitHub"
3. Paste your repository URL
4. Glitch will automatically deploy

### 5. **Replit**
**Free tier**: Available

#### Setup:
1. Go to [replit.com](https://replit.com)
2. Click "Create Repl" → "Import from GitHub"
3. Select your repository
4. Replit will automatically set up the environment

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository
Make sure your repository includes:
- `package.json` with all dependencies
- `server/websocket-server.js` (WebSocket server)
- `railway.json` (for Railway deployment)

### Step 2: Deploy Backend First
1. Deploy your WebSocket server to one of the free platforms above
2. Note the deployment URL (e.g., `https://your-app.railway.app`)

### Step 3: Update Frontend
Update the WebSocket connection URL in your frontend:

```typescript
// In components/PokerTable.tsx
const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001');
```

### Step 4: Deploy Frontend
Deploy your Next.js frontend to Vercel:
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variable: `NEXT_PUBLIC_WEBSOCKET_URL=https://your-app.railway.app`

## 🔧 Environment Variables

### Backend (WebSocket Server)
```env
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app
```

### Frontend (Next.js)
```env
NEXT_PUBLIC_WEBSOCKET_URL=https://your-backend.railway.app
```

## 📊 Cost Comparison

| Platform | Free Tier | WebSocket Support | Ease of Use |
|----------|-----------|-------------------|-------------|
| **Railway** | $5/month credit | ✅ Full | ⭐⭐⭐⭐⭐ |
| **Render** | Available | ✅ Full | ⭐⭐⭐⭐ |
| **Fly.io** | 3 VMs free | ✅ Full | ⭐⭐⭐ |
| **Glitch** | Available | ✅ Limited | ⭐⭐⭐⭐⭐ |
| **Replit** | Available | ✅ Full | ⭐⭐⭐⭐ |
| **Vercel** | Available | ❌ None | ⭐⭐⭐⭐⭐ |

## 🎯 Recommendation

**For beginners**: Use **Railway** - it's the easiest to set up and has the most generous free tier.

**For learning**: Use **Glitch** or **Replit** - they're completely free and great for development.

**For production**: Use **Railway** or **Render** - they're reliable and scalable.

## 🚨 Important Notes

1. **Vercel Free Tier**: Does NOT support WebSocket connections
2. **Free Tier Limits**: Most free tiers have usage limits
3. **CORS**: Make sure to configure CORS properly for production
4. **Environment Variables**: Always use environment variables for URLs in production

## 🔍 Troubleshooting

### Common Issues:
1. **CORS errors**: Check your `FRONTEND_URL` environment variable
2. **Connection refused**: Verify your WebSocket server is running
3. **Port issues**: Use `process.env.PORT` for production deployments

### Testing:
1. Test locally first: `npm run dev`
2. Deploy backend and test connection
3. Deploy frontend and test full application 