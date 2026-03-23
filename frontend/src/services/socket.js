import { io } from 'socket.io-client';

let socket = null;

export function getSocket() { return socket; }

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
    auth:            { token },
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay:    1000,
  });

  socket.on('connect',       () => console.log('[socket] connected'));
  socket.on('disconnect',    (r) => console.log('[socket] disconnected:', r));
  socket.on('connect_error', (e) => console.error('[socket] error:', e.message));

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
