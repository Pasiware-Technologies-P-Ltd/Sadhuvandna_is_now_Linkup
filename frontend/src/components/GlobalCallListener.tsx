import { ChatDBService } from '../services/ChatDBService';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, AppState } from 'react-native';
import { navigationRef, navigateWithRetry } from '../navigation/navigationRef';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import api, { WEBSITE_URL } from '../services/api';
import socketService from '../services/socket';
import notifee, { AndroidImportance } from '@notifee/react-native';

const GlobalCallListener = () => {
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [inAppNotif, setInAppNotif] = useState<any>(null);
    const soundRef = useRef<Audio.Sound | null>(null);
    const isProcessing = useRef(false);

    useEffect(() => {
        // Load user ID
        AsyncStorage.getItem('user').then(u => {
            if (u) setMyUserId(JSON.parse(u).id);
        });
        // Request notification permissions on mount
        notifee.requestPermission();
    }, []);

    useEffect(() => {
        if (!myUserId) return;

        // Connect to Socket.io server
        socketService.connect(myUserId);

        const handleBellNotification = (notif: any) => {
            if (isProcessing.current) return;
            if (!notif) return;
            
            // For chat messages, handleNewNotification already showed the in-app popup
            // AND BadgeContext already displayed the system notification via Notifee.
            // So skip both for message types.
            if (notif.type !== 'message') {
                setInAppNotif(notif);
                setTimeout(() => {
                    setInAppNotif(null);
                }, 4000);

                notifee.createChannel({ id: 'default', name: 'Default Channel' }).then(channelId => {
                    notifee.displayNotification({
                        id: notif.reference_id ? String(notif.reference_id) : (notif.id ? String(notif.id) : undefined),
                        title: notif.title,
                        body: notif.message,
                        android: {
                            channelId,
                            importance: AndroidImportance.HIGH,
                            smallIcon: 'ic_notification',
                            largeIcon: require('../../assets/icon.png'),
                        },
                    }).catch(() => {});
                });
            }
        };

        const handleNewNotification = (data: any) => {
            if (isProcessing.current) return;

            // If already in a call, don't show another popup
            if (navigationRef.isReady()) {
                const currentRoute = navigationRef.getCurrentRoute()?.name;
                if (currentRoute === 'AgoraCall') {
                    return;
                }
            }

            if (data && data.type === 'chat' && data.message) {
                const newMsg = data.message;
                const chatId = `user_${newMsg.sender_id}`;
                ChatDBService.saveMessages(chatId, [{ ...newMsg, is_mine: false, seen: 0 }]).catch(() => {}); 
                let timeStr = ""; try { const d = new Date(newMsg.created_at.replace(" ", "T")); timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) {} 
                ChatDBService.updateConversationLastMessage(chatId, newMsg.message || "Media", timeStr, true, false, false); 
                
                // Show notification if not on chat screen with this user
                let showPopup = true;
                if (navigationRef.isReady()) {
                    const currentRoute = navigationRef.getCurrentRoute();
                    const params = currentRoute?.params as any;
                    if (currentRoute?.name === 'Chat' && !params?.isGroup && String(params?.receiver?.id) === String(newMsg.sender_id)) {
                        showPopup = false;
                    }
                }
                if (showPopup) {
                    const notif = { title: 'New Message', message: newMsg.message || 'Sent an attachment' };
                    setInAppNotif(notif);
                    setTimeout(() => setInAppNotif(null), 4000);
                    // System notification comes via bell_notification from notification_worker (same as like/comment)
                }
            } 
            
            if (data && data.type === 'call') {
                const call = data;
                setIncomingCall((prev: any) => {
                    if (prev && prev.call_id === call.call_id) return prev;
                    return call;
                });
            }
            
            if (data && data.type === 'group_chat' && data.message) {
                const newMsg = data.message;
                const chatId = `group_${data.group_id}`;
                ChatDBService.saveMessages(chatId, [{ ...newMsg, is_mine: false, seen: 0 }]).catch(() => {}); 
                let timeStr = ""; try { const d = new Date(newMsg.created_at.replace(" ", "T")); timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) {} 
                ChatDBService.updateConversationLastMessage(chatId, newMsg.message || "Media", timeStr, true, false, false); 
                
                // Show notification if not on group chat screen
                let showPopup = true;
                if (navigationRef.isReady()) {
                    const currentRoute = navigationRef.getCurrentRoute();
                    const params = currentRoute?.params as any;
                    if (currentRoute?.name === 'Chat' && params?.isGroup && String(params?.receiver?.id) === String(data.group_id)) {
                        showPopup = false;
                    }
                }
                if (showPopup) {
                    const notif = { title: 'New Group Message', message: newMsg.message || 'Sent an attachment' };
                    setInAppNotif(notif);
                    setTimeout(() => setInAppNotif(null), 4000);
                    // System notification comes via bell_notification from notification_worker (same as like/comment)
                }
            } 
        };

        if (socketService.socket) {
            socketService.socket.on('new_notification', handleNewNotification);
            socketService.socket.on('new_group_notification', handleNewNotification);
            socketService.socket.on('bell_notification', handleBellNotification);
        }

        return () => {
            if (socketService.socket) {
                socketService.socket.off('new_notification', handleNewNotification);
                socketService.socket.off('new_group_notification', handleNewNotification);
                socketService.socket.off('bell_notification', handleBellNotification);
            }
        };
    }, [myUserId]);


    // Handle Ringtone
    useEffect(() => {
        const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;
        if (incomingCall && !isProcessing.current && currentRoute !== 'AgoraCall') {
            playRingtone();
        } else {
            stopRingtone();
        }

        return () => {
            stopRingtone();
        };
    }, [incomingCall]);

    const playRingtone = async () => {
        if (soundRef.current) return;
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3' },
                { shouldPlay: true, isLooping: true }
            );
            soundRef.current = sound;
        } catch (e) { console.log("Sound Error", e); }
    };

    const stopRingtone = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
        } catch (e) { }
    };

    const handleAccept = async () => {
        if (!incomingCall || isProcessing.current) return;
        isProcessing.current = true;

        const currentCall = incomingCall;
        setIncomingCall(null);
        await stopRingtone();

        // Notify server
        try {
            const payload = {
                call_id: currentCall.call_id,
                status: 'accepted'
            };
            await api.post('update_call_status.php', payload);
        } catch (e) { }

        let channelId = currentCall.peer_id;

        navigateWithRetry('AgoraCall', {
            channelId: channelId,
            isVideo: (currentCall.call_type === 'video'),
            isCaller: false,
            otherUserId: currentCall.caller_id,
            myProfileIdFallback: currentCall.my_profile_id_ref
        });

        setTimeout(() => {
            isProcessing.current = false;
        }, 3000);
    };

    const handleReject = async () => {
        if (!incomingCall || isProcessing.current) return;
        isProcessing.current = true;

        const currentCall = incomingCall;
        setIncomingCall(null);
        await stopRingtone();

        try {
            const payload = {
                call_id: currentCall.call_id,
                status: 'rejected'
            };
            await api.post('update_call_status.php', payload);
        } catch (e) { }

        setTimeout(() => {
            isProcessing.current = false;
        }, 3000);
    };

    const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;

    if (!incomingCall && !inAppNotif) return null;

    return (
        <>
            {incomingCall && currentRoute !== 'AgoraCall' && (
                <View style={styles.container}>
                    <View style={styles.card}>
                        <Text style={styles.title}>Incoming {incomingCall.call_type} Call</Text>
                        <Text style={styles.name}>{incomingCall.caller_name}</Text>

                        <View style={styles.row}>
                            <TouchableOpacity onPress={handleReject} style={[styles.btn, styles.reject]}>
                                <Text style={styles.btnText}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAccept} style={[styles.btn, styles.accept]}>
                                <Text style={styles.btnText}>Answer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
            
            {inAppNotif && (
                <TouchableOpacity 
                    style={styles.toastContainer} 
                    onPress={() => setInAppNotif(null)}
                    activeOpacity={0.9}
                >
                    <Text style={styles.toastTitle}>{inAppNotif.title}</Text>
                    <Text style={styles.toastBody}>{inAppNotif.message}</Text>
                </TouchableOpacity>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute', top: 50, left: 20, right: 20, zIndex: 10000,
        backgroundColor: '#ffffff', padding: 15, borderRadius: 10,
        elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 5
    },
    toastTitle: { color: '#172554', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
    toastBody: { color: '#64748B', fontSize: 14 },
    container: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center', alignItems: 'center', zIndex: 9999
    },
    card: {
        width: '80%', backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center',
        elevation: 5
    },
    title: { fontSize: 16, color: '#666', marginBottom: 10 },
    name: { fontSize: 22, fontWeight: 'bold', margin: 30 },
    row: { flexDirection: 'row', gap: 20 },
    btn: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 30 },
    reject: { backgroundColor: '#ef4444' },
    accept: { backgroundColor: '#22c55e' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default GlobalCallListener;





