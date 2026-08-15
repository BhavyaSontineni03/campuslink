import { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import redis from '../config/redis';
import { verifyToken } from '../utils/jwt';

// Redis channel used to fan events out across every backend instance. A
// user's socket might be connected to instance A while the event (e.g. a
// waitlist promotion) is produced on instance B handling their reservation
// request - Pub/Sub is what lets B's message reach A's local socket map.
const EVENTS_CHANNEL = 'campuslink:events';

export type WsEventType = 'reservation_updated' | 'waitlist_promoted' | 'notification' | 'seats_changed';

export interface WsEvent {
  type: WsEventType;
  payload: unknown;
}

interface FanoutMessage {
  userId: number;
  event: WsEvent;
}

interface TrackedSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

// Sockets connected to *this* process, keyed by userId. A user can have
// multiple sockets (e.g. two browser tabs), hence the Set.
const localConnectionsByUser = new Map<number, Set<TrackedSocket>>();

const HEARTBEAT_INTERVAL_MS = 30000;

function addLocalConnection(userId: number, socket: TrackedSocket): void {
  let sockets = localConnectionsByUser.get(userId);
  if (!sockets) {
    sockets = new Set();
    localConnectionsByUser.set(userId, sockets);
  }
  sockets.add(socket);
}

function removeLocalConnection(userId: number, socket: TrackedSocket): void {
  const sockets = localConnectionsByUser.get(userId);
  if (!sockets) return;
  sockets.delete(socket);
  if (sockets.size === 0) localConnectionsByUser.delete(userId);
}

function deliverLocally(userId: number, event: WsEvent): void {
  const sockets = localConnectionsByUser.get(userId);
  if (!sockets || sockets.size === 0) return;

  const message = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}

function extractToken(requestUrl: string | undefined): string | null {
  if (!requestUrl) return null;
  try {
    const url = new URL(requestUrl, 'http://localhost');
    return url.searchParams.get('token');
  } catch {
    return null;
  }
}

let subscribed = false;

// Subscribes exactly once per process. A Redis connection in subscribe mode
// can only issue subscribe/unsubscribe/ping commands, so this uses a
// dedicated duplicated connection and leaves the shared `redis` client free
// for normal GET/SET/publish use elsewhere in the app.
function ensureSubscribed(): void {
  if (subscribed) return;
  subscribed = true;

  const subscriber = redis.duplicate({ enableOfflineQueue: true });
  subscriber.on('ready', () => {
    subscriber.subscribe(EVENTS_CHANNEL).catch((error) => {
      console.error('Failed to subscribe to events channel:', error);
    });
  });

  subscriber.on('message', (_channel, raw) => {
    try {
      const { userId, event } = JSON.parse(raw) as FanoutMessage;
      deliverLocally(userId, event);
    } catch (error) {
      console.error('Failed to process fanout message:', error);
    }
  });

  subscriber.on('error', (error) => {
    console.error('Redis WS subscriber error:', error.message);
  });
}

// Publishes an event for a user to every backend instance. Each instance's
// subscriber checks its own localConnectionsByUser map and only delivers if
// that user actually has a socket open on that instance.
export async function broadcastToUser(userId: number, event: WsEvent): Promise<void> {
  // Deliver on this process immediately so a single-instance deploy still
  // works if Redis pub/sub is briefly unavailable. Other instances pick the
  // event up via the subscriber below (duplicate local delivery is harmless).
  deliverLocally(userId, event);

  const message: FanoutMessage = { userId, event };
  try {
    await redis.publish(EVENTS_CHANNEL, JSON.stringify(message));
  } catch (error) {
    console.error('Failed to publish websocket event:', error);
  }
}

// Attaches a ws server to the existing HTTP server (same port, /ws path) and
// wires up JWT auth plus Redis-backed fanout. Call once from server.ts.
export function attachWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });
  ensureSubscribed();

  wss.on('connection', (socket: TrackedSocket, request) => {
    const token = extractToken(request.url);
    if (!token) {
      socket.close(1008, 'Missing token');
      return;
    }

    let userId: number;
    try {
      userId = verifyToken(token).userId;
    } catch {
      socket.close(1008, 'Invalid or expired token');
      return;
    }

    socket.userId = userId;
    socket.isAlive = true;
    addLocalConnection(userId, socket);

    try {
      socket.send(JSON.stringify({ type: 'connected', payload: { userId } }));
    } catch {
      // ignore send failures on brand-new sockets
    }

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('close', () => {
      removeLocalConnection(userId, socket);
    });

    socket.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error.message);
    });
  });

  // Detects half-open connections (client vanished without a clean close,
  // e.g. laptop lid closed) that would otherwise leak entries in
  // localConnectionsByUser forever.
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients as Set<TrackedSocket>) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}
