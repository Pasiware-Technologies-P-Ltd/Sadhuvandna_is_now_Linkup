import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Platform, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

import './global.css';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef, navigateWithRetry } from './src/navigation/navigationRef';
import { RootStackParamList } from './src/navigation/types';
import { updateServerToken } from './src/services/NotificationService';
import GlobalCallListener from './src/components/GlobalCallListener';
import api from './src/services/api';
import socketService from './src/services/socket';
import { initDB } from './src/services/database';
import { MediaCacheService } from './src/services/MediaCacheService';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LanguageProvider } from './src/context/LanguageContext';
import { FontProvider } from './src/context/FontContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import mobileAds from 'react-native-google-mobile-ads';
// import { usePreventScreenCapture } from 'expo-screen-capture';
import { Audio } from 'expo-av';

// Removed synchronous mobileAds initialization from here


import { UploadProvider } from './src/context/UploadContext';
import { OnlineProvider } from './src/context/OnlineContext';
import { BadgeProvider } from './src/context/BadgeContext';
import UploadProgressBanner from './src/components/UploadProgressBanner';
import CustomAlertManager, { CustomAlertProvider } from './src/components/CustomAlert';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';

// Globally override React Native Alert with Instagram-style client friendly titles
const originalAlert = Alert.alert;
Alert.alert = (title: string, message?: string, buttons?: any[], options?: any) => {
  let friendlyTitle = title;
  if (!friendlyTitle || friendlyTitle.trim().toLowerCase() === 'error') {
    const lowerMsg = (message || '').toLowerCase();
    if (lowerMsg.includes('required') || lowerMsg.includes('please enter') || lowerMsg.includes('must be') || lowerMsg.includes('match') || lowerMsg.includes('select') || lowerMsg.includes('fill') || lowerMsg.includes('invalid') || lowerMsg.includes('check')) {
      friendlyTitle = "Please Check";
    } else if (lowerMsg.includes('network') || lowerMsg.includes('connection') || lowerMsg.includes('offline') || lowerMsg.includes('internet') || lowerMsg.includes('server')) {
      friendlyTitle = "Couldn't Connect";
    } else {
      friendlyTitle = "Something Went Wrong";
    }
  }
  CustomAlertManager.show(friendlyTitle, message, buttons, options);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
    },
  },
});

import * as Notifications from 'expo-notifications';

import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';

function ThemedAppContent({ initialRoute, linking }: { initialRoute: any; linking: any }) {
  const { isDarkMode, theme } = useTheme();

  const navTheme = isDarkMode ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
      <StatusBar style={isDarkMode ? "light" : "dark"} backgroundColor={theme.background} />
      <RootNavigator initialRoute={initialRoute} />
      <GlobalCallListener />
    </NavigationContainer>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.notification.request.content.data &&
      lastNotificationResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastNotificationResponse.notification.request.content.data as any;
      console.log("[App] Cold start notification clicked:", JSON.stringify(data));
      
      setTimeout(() => {
        if (data && (data.type === 'post' || data.type === 'like') && data.postId) {
          navigateWithRetry('PostDetail', { postId: data.postId });
        }
        if (data && data.type === 'message' && data.sender_id) {
          navigateWithRetry('Chat', { 
              receiver: { id: data.sender_id, full_name: data.sender_name || 'User', photo: data.sender_photo || null, user_id: data.sender_user_id || data.sender_id },
              platform: data.platform || 'community' 
          });
        }
      }, 1000);
    }
  }, [lastNotificationResponse]);

  useEffect(() => {
    console.log("[App] Initializing...");
    
    // Non-blocking secondary setup
    setTimeout(() => {
      setupAudio();
      initDB().then(() => {
        MediaCacheService.cleanupOldCache(24).catch(e => console.error("Cache Cleanup Error:", e));
      }).catch(e => console.error("DB Init Error:", e));
    }, 100);
    
    checkAuth();
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 2, // InterruptionModeIOS.MixWithOthers (Important for video+audio)
        shouldDuckAndroid: true,
        interruptionModeAndroid: 2, // InterruptionModeAndroid.MixWithOthers
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.error("[Audio] Setup Error:", e);
    }
  };

  // usePreventScreenCapture();

  const checkAuth = async () => {
    try {
      const u = await AsyncStorage.getItem('user');
      if (u) {
        const user = JSON.parse(u);
        setInitialRoute('MainTabs');
        // Push secondary init to background to keep startup fast
        setTimeout(() => {
          updateServerToken(user.id);

          mobileAds()
            .initialize()
            .then(adapterStatuses => {
              console.log("[AdMob] Initialization complete!", adapterStatuses);
            });

          // Global Online Heartbeat (Insta-like)
          let heartbeatInterval: NodeJS.Timeout;
          const sendHeartbeat = () => {
            socketService.connect(user.id);
            if (socketService.socket) {
              socketService.socket.emit('heartbeat', user.id);
            }
          };
          
          sendHeartbeat();
          heartbeatInterval = setInterval(sendHeartbeat, 60000);
          
          AppState.addEventListener('change', nextAppState => {
              if (nextAppState === 'active') {
                  sendHeartbeat();
                  if (heartbeatInterval) clearInterval(heartbeatInterval);
                  heartbeatInterval = setInterval(sendHeartbeat, 60000);
              } else {
                  if (heartbeatInterval) clearInterval(heartbeatInterval);
              }
          });
        }, 300);

      } else {
        setInitialRoute('Auth');
      }
    } catch (e) {
      setInitialRoute('Auth');
    }
  };

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  const linking = {
    prefixes: ['sadhuvandna://', 'https://www.sadhuvandna.co.in', 'https://sadhuvandna.co.in'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            Home: 'home',
            Reels: 'reels',
          }
        },
        PostDetail: {
          path: 'view_post.php',
          parse: {
            postId: (id: string) => id,
          },
        },
        NewsDetail: {
          path: 'view_news.php',
          parse: {
            newsId: (id: string) => id,
          },
        },
        JoinGroup: {
          path: 'join',
          parse: {
            inviteCode: (code: string) => code,
          },
        },
      },
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <FontProvider>
            <LanguageProvider>
              <UploadProvider>
                <OnlineProvider>
                  <BadgeProvider>
                    <ThemedAppContent initialRoute={initialRoute} linking={linking} />
                    <UploadProgressBanner />
                    <CustomAlertProvider />
                  </BadgeProvider>
                </OnlineProvider>
              </UploadProvider>
            </LanguageProvider>
          </FontProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
}