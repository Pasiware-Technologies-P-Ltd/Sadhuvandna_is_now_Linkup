import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { navigationRef, navigateWithRetry } from '../navigation/navigationRef';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        const data = notification.request.content.data as any;
        const isCall = data && (data.is_call || data.type === 'incoming_call');
        
        // Suppress banner if chat screen is open for this specific user
        let isCurrentChatActive = false;
        if (data && data.type === 'chat' && data.sender_profile_id) {
            if (navigationRef.isReady()) {
                const currentRoute = navigationRef.getCurrentRoute();
                if (currentRoute && currentRoute.name === 'Chat') {
                    const params = currentRoute.params as any;
                    // Usually receiver is passed as an object
                    if (params && params.receiver && String(params.receiver.id) === String(data.sender_profile_id)) {
                        isCurrentChatActive = true;
                    }
                }
            }
        }
        
        const isRemote = notification.request.trigger && notification.request.trigger.type === 'push';
        const showNotification = !isCall && !isCurrentChatActive && !isRemote;

        return {
            shouldShowAlert: showNotification,
            shouldShowBanner: showNotification, 
            shouldShowList: showNotification,
            shouldPlaySound: showNotification,
            shouldSetBadge: false,
        };
    },
});

export const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('incoming_calls', {
            name: 'Incoming Calls',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 500, 500],
            lightColor: '#FF231F7C',
            sound: 'ringtone', // Matches android/app/src/main/res/raw/ringtone.mp3
            bypassDnd: true,
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification!');
            return;
        }

        // Get the token
        try {
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: 'e0e24b0e-4455-465b-baab-ee520d15958b' // Linked to pasiwaresocial@gmail.com
            })).data;
            console.log("Expo Push Token:", token);
        } catch (e: any) {
            console.log("[Notification] Could not fetch Expo Push Token (Expo server down):", e.message || e);
        }
    } else {
        alert('Must use physical device for Push Notifications');
    }

    return token;
};

Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any;
    console.log("Notification Clicked:", JSON.stringify(data));
    
    if (data && (data.is_call || data.type === 'incoming_call')) {
        // We do not navigate to AgoraCall directly here anymore.
        // Tapping the notification will simply open the app, and the GlobalCallListener
        // will show the Incoming Call Modal with Accept/Decline buttons.
        console.log("Incoming call notification tapped. Letting GlobalCallListener handle it.");
    }

    // New: Social Post/Like Deep-linking
    if (data && (data.type === 'post' || data.type === 'like') && data.postId) {
        navigateWithRetry('PostDetail', { postId: data.postId });
    }

    if (data && data.type === 'message' && data.sender_id) {
        navigateWithRetry('Chat', { 
            receiver: { id: data.sender_id, full_name: data.sender_name || 'User', photo: data.sender_photo || null, user_id: data.sender_user_id || data.sender_id }, 
            platform: data.platform || 'community' 
        });
    }
});

export const updateServerToken = async (userId: string) => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
        try {
            const payload = {
                user_id: userId,
                fcm_token: token
            };
            await api.post('/update_fcm_token.php', payload);
            console.log("Token updated on server");
        } catch (e) {
            console.error("Failed to update token on server", e);
        }
    }
};
