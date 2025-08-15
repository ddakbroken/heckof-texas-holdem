import { NextResponse } from 'next/server'

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'

export async function GET() {
  try {
    // Make a request to the WebSocket server to get available rooms
    const response = await fetch(`${WEBSOCKET_URL}/api/rooms`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const rooms = await response.json()
    return NextResponse.json(rooms)
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json([], { status: 500 })
  }
}
