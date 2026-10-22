import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL as BASE_SOCKET_URL } from './api';

// Dynamically use the API's IP address on port 3000
const getSocketUrl = () => {
    if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('192.168') || API_BASE_URL.includes('10.')) {
        try {
            const url = new URL(API_BASE_URL);
            return `http://${url.hostname}:3000`;
        } catch {
            // fallback
            return 'http://192.168.1.10:3000';
        }
    }
    // Production socket URL (Clean WSS via port 443)
    return BASE_SOCKET_URL; 
};

const SOCKET_URL = getSocketUrl();

class SocketService {
    public socket: Socket | null = null;
    private registeredUserId: string | null = null;
    private heartbeatInterval: any = null;

    connect(userId: string) {
        try {
            // Always store as string to avoid Map key type mismatch (42 !== "42")
            const uid = String(userId);
            this.registeredUserId = uid;

            if (!this.socket) {
                console.log(`[WebSocket] Connecting to ${SOCKET_URL} for user ${uid}`);
                this.socket = io(SOCKET_URL, {
                    transports: ['websocket', 'polling'],
                    timeout: 10000,
                    reconnection: true,
                    reconnectionAttempts: Infinity,
                    reconnectionDelay: 2000,
                    reconnectionDelayMax: 10000,
                    autoConnect: true,
                });

                this.socket.on('connect', () => {
                    console.log('[WebSocket] Successfully connected to server:', SOCKET_URL);
                    this.socket?.emit('register', uid);
                    
                    // Keep online status updated in MySQL
                    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
                    this.heartbeatInterval = setInterval(() => {
                        this.socket?.emit('heartbeat', uid);
                    }, 60000); // Send heartbeat every 1 minute
                });

                this.socket.on('connect_error', (error) => {
                    // Safe silent log — does NOT crash or disrupt app
                    console.log('[WebSocket Status] Waiting for server at', SOCKET_URL, `(${error.message})`);
                });

                this.socket.on('reconnect', () => {
                    console.log('[WebSocket] Reconnected to server — re-registering');
                    this.socket?.emit('register', uid);
                });

                this.socket.on('disconnect', (reason) => {
                    console.log('[WebSocket] Disconnected. Reason:', reason);
                    if (this.heartbeatInterval) {
                        clearInterval(this.heartbeatInterval);
                        this.heartbeatInterval = null;
                    }
                });

                // Set up global event forwarders
                const forwardToDevice = (eventName: string) => {
                    this.socket?.on(eventName, (data: any) => {
                        import('react-native').then(({ DeviceEventEmitter }) => {
                            DeviceEventEmitter.emit(eventName, data);
                        });
                    });
                };

                forwardToDevice('app_notification');
                forwardToDevice('new_notification');
                forwardToDevice('new_group_notification');
                forwardToDevice('post_comment_added');
                forwardToDevice('post_comment_deleted');
                forwardToDevice('post_like_updated');
                forwardToDevice('follow_counts_updated');
                forwardToDevice('call_status_update');

            } else if (this.registeredUserId !== uid) {
                // Different user logged in — re-register
                this.socket.emit('register', uid);
            } else if (!this.socket.connected) {
                // Already created but disconnected — reconnect
                this.socket.connect();
            }
        } catch (err) {
            console.log('[WebSocket] Safe catch during connect init:', err);
        }
    }

    disconnect() {
        try {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
                this.registeredUserId = null;
                if (this.heartbeatInterval) {
                    clearInterval(this.heartbeatInterval);
                    this.heartbeatInterval = null;
                }
            }
        } catch (e) {
            console.log('[WebSocket] Safe disconnect catch:', e);
        }
    }
}

const socketService = new SocketService();
export default socketService;
