import { io } from 'socket.io-client'

const base =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export const socket = io(base, {
    transports: ['websocket'], // más estable en producción
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
})