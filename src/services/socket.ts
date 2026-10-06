import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

// Dynamically use the API's IP address but on port 3000
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
    // Production socket URL (replace when going live)
    return 'https://www.sadhuvandna.co.in:3000'; 
};

const SOCKET_URL = getSocketUrl();

class SocketService {
    public socket: Socket | null = null;
    private registeredUserId: string | null = null;
    private heartbeatInterval: any = null;

    connect(userId: string) {
        // Always store as string to avoid Map key type mismatch (42 !== "42")
        const uid = String(userId);
        this.registeredUserId = uid;

        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
            });

            this.socket.on('connect', () => {
                console.log('Connected to WebSocket server');
                this.socket?.emit('register', uid);
                
                // Keep online status updated in MySQL
                this.heartbeatInterval = setInterval(() => {
                    this.socket?.emit('heartbeat', uid);
                }, 60000); // Send heartbeat every 1 minute
            });

            this.socket.on('reconnect', () => {
                console.log('Reconnected to WebSocket server — re-registering');
                this.socket?.emit('register', uid);
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from WebSocket server');
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

        } else if (this.registeredUserId !== uid) {
            // Different user logged in — re-register
            this.socket.emit('register', uid);
        } else if (!this.socket.connected) {
            // Already created but disconnected — reconnect
            this.socket.connect();
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.registeredUserId = null;
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
        }
    }
}

const socketService = new SocketService();
export default socketService;
