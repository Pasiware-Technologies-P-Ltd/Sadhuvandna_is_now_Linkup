import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Platform, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

SystemUI.setBackgroundColorAsync('#ffffff');
if (Platform.OS === 'android') {
  NavigationBar.setBackgroundColorAsync('#ffffff');
  NavigationBar.setButtonStyleAsync('dark');
}
import './global.css';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
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
import mobileAds from 'react-native-google-mobile-ads';
// import { usePreventScreenCapture } from 'expo-screen-capture';
import { Audio } from 'expo-av';

// Removed synchronous mobileAds initialization from here


import { UploadProvider } from './src/context/UploadContext';
import { OnlineProvider } from './src/context/OnlineContext';
import UploadProgressBanner from './src/components/UploadProgressBanner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
    },
  },
});

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

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
        <FontProvider>
          <LanguageProvider>
            <UploadProvider>
              <OnlineProvider>
                <NavigationContainer ref={navigationRef} linking={linking}>
                  <StatusBar style="dark" />
                  <RootNavigator initialRoute={initialRoute} />
                  <GlobalCallListener />
                </NavigationContainer>
                <UploadProgressBanner />
              </OnlineProvider>
            </UploadProvider>
          </LanguageProvider>
        </FontProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
}