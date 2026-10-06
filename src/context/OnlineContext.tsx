import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import socketService from '../services/socket';

interface OnlineContextType {
    onlineUsers: Set<string>;
    isUserOnline: (userId: string | number) => boolean;
    checkOnlineStatuses: (userIds: string[]) => void;
}

const OnlineContext = createContext<OnlineContextType>({
    onlineUsers: new Set(),
    isUserOnline: () => false,
    checkOnlineStatuses: () => {},
});

export const useOnlineStatus = () => useContext(OnlineContext);

export const OnlineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    // Use a ref to always have the latest setter in the socket handler
    const pendingCheckIds = useRef<string[]>([]);

    useEffect(() => {
        const handleUserStatus = (data: any) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                if (data.status === 'online') {
                    newSet.add(String(data.userId));
                } else {
                    newSet.delete(String(data.userId));
                }
                return newSet;
            });
        };

        const handleMultipleUserStatus = (statuses: any[]) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                statuses.forEach(s => {
                    if (s.status === 'online') {
                        newSet.add(String(s.userId));
                    } else {
                        newSet.delete(String(s.userId));
                    }
                });
                return newSet;
            });
        };

        // Attach listeners — called on every connect/reconnect
        const attachListeners = () => {
            const sock = socketService.socket;
            if (!sock) return;
            sock.off('user_status', handleUserStatus);
            sock.off('multiple_user_status', handleMultipleUserStatus);
            sock.on('user_status', handleUserStatus);
            sock.on('multiple_user_status', handleMultipleUserStatus);

            // If someone called checkOnlineStatuses before socket was ready, flush now
            if (pendingCheckIds.current.length > 0) {
                sock.emit('check_multiple_status', pendingCheckIds.current);
                pendingCheckIds.current = [];
            }
        };

        // Poll until the socket is created (it's created async after login)
        const initInterval = setInterval(() => {
            if (socketService.socket) {
                clearInterval(initInterval);
                attachListeners();

                // Re-attach on reconnect
                socketService.socket.on('connect', attachListeners);
            }
        }, 300);

        return () => {
            clearInterval(initInterval);
            if (socketService.socket) {
                socketService.socket.off('user_status', handleUserStatus);
                socketService.socket.off('multiple_user_status', handleMultipleUserStatus);
                socketService.socket.off('connect', attachListeners);
            }
        };
    }, []);

    const checkOnlineStatuses = (userIds: string[]) => {
        if (!userIds.length) return;
        if (socketService.socket?.connected) {
            socketService.socket.emit('check_multiple_status', userIds);
        } else {
            // Queue until socket is ready
            pendingCheckIds.current = [...new Set([...pendingCheckIds.current, ...userIds])];
        }
    };

    const isUserOnline = (userId: string | number) => onlineUsers.has(String(userId));

    return (
        <OnlineContext.Provider value={{ onlineUsers, isUserOnline, checkOnlineStatuses }}>
            {children}
        </OnlineContext.Provider>
    );
};
