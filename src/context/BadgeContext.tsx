import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import socketService from '../services/socket';
import { DeviceEventEmitter } from 'react-native';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';

interface BadgeContextData {
    notificationCount: number;
    chatCount: number;
    setNotificationCount: React.Dispatch<React.SetStateAction<number>>;
    setChatCount: React.Dispatch<React.SetStateAction<number>>;
    refreshCounts: () => void;
}

const BadgeContext = createContext<BadgeContextData>({
    notificationCount: 0,
    chatCount: 0,
    setNotificationCount: () => {},
    setChatCount: () => {},
    refreshCounts: () => {}
});

export const useBadge = () => useContext(BadgeContext);

export const BadgeProvider = ({ children }: { children: React.ReactNode }) => {
    const [notificationCount, setNotificationCount] = useState(0);
    const [chatCount, setChatCount] = useState(0);

    const refreshCounts = async () => {
        try {
            const userStr = await AsyncStorage.getItem('user');
            if (userStr) {
                const u = JSON.parse(userStr);
                const res = await api.get(`get_unread_counts.php?user_id=${u.id}`);
                if (res.data.status === 'success') {
                    setNotificationCount(res.data.notifications || 0);
                    setChatCount(res.data.chats || 0);
                }
            }
        } catch (e) {
            console.log("Badge fetch error:", e);
        }
    };

    useEffect(() => {
        refreshCounts();

        const onProfileSwitched = () => {
            refreshCounts();
        };

        const subscription = DeviceEventEmitter.addListener('profileSwitched', onProfileSwitched);
        const refreshSub = DeviceEventEmitter.addListener('refresh_badge_counts', refreshCounts);

        const showLocalNotification = async (data: any) => {
            console.log("Local Notification Triggered:", data);
            let title = data.title;
            let body = data.body;
            
            if (!body && data.message) {
                if (typeof data.message === 'string') {
                    body = data.message;
                } else if (typeof data.message === 'object') {
                    body = data.message.message || (data.message.file || data.message.attachment ? 'Sent an attachment' : '');
                }
            }
            
            let identifier = undefined;

            if (!title) {
                if (data.type === 'chat') {
                    title = data.sender_name || 'New Message';
                    const senderId = data.sender_profile_id || data.sender_id || 'unknown';
                    identifier = `chat_${senderId}`;
                }
                else if (data.type === 'group_chat') {
                    title = data.group_name || 'New Group Message';
                    const groupId = data.group_id || (data.message && data.message.group_id) || 'unknown';
                    identifier = `group_${groupId}`;
                }
                else title = 'Linkup';
            }

            if (title && body) {
                try {
                    const channelId = await notifee.createChannel({
                        id: 'chat_messages',
                        name: 'Chat Messages',
                        importance: AndroidImportance.HIGH,
                        sound: 'default'
                    });

                    let messages: any[] = [];

                    if (identifier) {
                        const displayed = await notifee.getDisplayedNotifications();
                        const existing = displayed.find(n => n.id === identifier);
                        
                        if (existing && existing.notification.android?.style?.type === AndroidStyle.MESSAGING) {
                            messages = existing.notification.android.style.messages || [];
                        }
                    }

                    messages.push({
                        text: body,
                        timestamp: Date.now(),
                        person: {
                            name: title
                        }
                    });

                    await notifee.displayNotification({
                        id: identifier,
                        title: title,
                        body: body,
                        data: data.data || data.payload || data,
                        android: {
                            channelId,
                            importance: AndroidImportance.HIGH,
                            style: {
                                type: AndroidStyle.MESSAGING,
                                person: {
                                    name: 'Me'
                                },
                                messages: messages
                            }
                        }
                    });
                } catch (e) {
                    console.log("Notifee error", e);
                }
            }
        };

        const handleAppNotification = (data: any) => {
            setNotificationCount(prev => prev + 1);
            showLocalNotification(data);
        };
        const handleNewNotification = (data: any) => {
            setChatCount(prev => prev + 1);
            showLocalNotification(data);
        };
        const handleNewGroupNotification = (data: any) => {
            setChatCount(prev => prev + 1);
            showLocalNotification(data);
        };

        const subApp = DeviceEventEmitter.addListener('app_notification', handleAppNotification);
        const subNew = DeviceEventEmitter.addListener('new_notification', handleNewNotification);
        const subGroup = DeviceEventEmitter.addListener('new_group_notification', handleNewGroupNotification);

        return () => {
            subscription.remove();
            refreshSub.remove();
            subApp.remove();
            subNew.remove();
            subGroup.remove();
        };
    }, []);

    return (
        <BadgeContext.Provider value={{
            notificationCount,
            chatCount,
            setNotificationCount,
            setChatCount,
            refreshCounts
        }}>
            {children}
        </BadgeContext.Provider>
    );
};
