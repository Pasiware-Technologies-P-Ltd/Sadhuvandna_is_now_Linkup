import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, Image } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { WEBSITE_URL } from '../services/api';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen from '../screens/feed/HomeScreen';
import MarriageScreen from '../screens/marriage/MarriageScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ProfileSwitcherModal from '../components/ProfileSwitcherModal';
import MarriageDetailScreen from '../screens/marriage/MarriageDetailScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import RequestScreen from '../screens/marriage/RequestScreen';
import NewsDetailScreen from '../screens/news/NewsDetailScreen';
import NewsScreen from '../screens/news/NewsScreen';
import CreateNewsScreen from '../screens/news/CreateNewsScreen';
import PostDetailScreen from '../screens/post/PostDetailScreen';
import CreatePostScreen from '../screens/post/CreatePostScreen';
import CreateReelScreen from '../screens/post/CreateReelScreen';
import CreateStoryScreen from '../screens/feed/CreateStoryScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import PublicProfileScreen from '../screens/profile/PublicProfileScreen';
import FollowListScreen from '../screens/profile/FollowListScreen';
import MyPostsScreen from '../screens/profile/MyPostsScreen';
import CommentsScreen from '../screens/feed/CommentsScreen';
import GalleryScreen from '../screens/profile/GalleryScreen';
import StoryViewerScreen from '../screens/feed/StoryViewerScreen';
import NotificationScreen from '../screens/feed/NotificationScreen';
import ApplyJobScreen from '../screens/jobs/ApplyJobScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';
import CreateMarriageProfileScreen from '../screens/marriage/CreateMarriageProfileScreen';
import TempleScreen from '../screens/temple/TempleScreen';
import BranchScreen from '../screens/temple/BranchScreen';
import JobScreen from '../screens/jobs/JobScreen';
import FamilyScreen from '../screens/family/FamilyScreen';
import ShokSanvedanaScreen from '../screens/shok/ShokSanvedanaScreen';
import ConnectedScreen from '../screens/marriage/ConnectedScreen';
import AgoraCallScreen from '../screens/call/AgoraCallScreen';
import FestivalPosterScreen from '../screens/feed/FestivalPosterScreen';
import SearchScreen from '../screens/feed/SearchScreen';
import SmartCardScreen from '../screens/profile/SmartCardScreen';
import adService from '../services/adService';
import SupportChatScreen from '../screens/support/SupportChatScreen';
import CreateBusinessPageScreen from '../screens/profile/CreateBusinessPageScreen';
import EditBusinessPageScreen from '../screens/profile/EditBusinessPageScreen';

import { AuthStackParamList, RootStackParamList, MainTabParamList } from './types';

import ReelsScreen from '../screens/feed/ReelsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

import AsyncStorage from '@react-native-async-storage/async-storage';

/* ------------------ TAB NAVIGATOR ------------------ */
function MainTabNavigator() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [isBusiness, setIsBusiness] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [isSwitcherVisible, setSwitcherVisible] = React.useState(false);

  React.useEffect(() => {
    const checkUser = async () => {
      const uStr = await AsyncStorage.getItem('user');
      if (uStr) {
        const u = JSON.parse(uStr);
        setUser(u);
        setIsBusiness(u.is_business == 1);
      }
    };
    checkUser();
    
    const { DeviceEventEmitter } = require('react-native');
    const subscription = DeviceEventEmitter.addListener('profileSwitched', () => {
      checkUser();
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
    <Tab.Navigator
      key={user?.id || 'default'}
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#ea580c',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Profile' && user?.profile_photo) {
            return (
              <Image 
                source={{ uri: `${WEBSITE_URL}/uploads/photo/${user.profile_photo}` }} 
                style={{ width: size, height: size, borderRadius: size / 2, borderWidth: focused ? 2 : 0, borderColor: color, backgroundColor: '#f3f4f6' }} 
              />
            );
          }

          let iconName: any = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Reels') iconName = focused ? 'videocam-sharp' : 'videocam-outline';
          else if (route.name === 'News') iconName = focused ? 'newspaper' : 'newspaper-outline';
          else if (route.name === 'Marriage') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('home') }} />
      <Tab.Screen name="Reels" component={ReelsScreen} options={{ tabBarLabel: t('reels') }} />
      <Tab.Screen
        name="News"
        component={NewsScreen}
        options={{ tabBarLabel: t('news') }}
        listeners={{ focus: () => adService.showAd() }}
      />
      {/* Marriage tab is hidden for Business profiles */}
      {!isBusiness && (
        <Tab.Screen
          name="Marriage"
          component={MarriageScreen}
          options={{ tabBarLabel: t('matrimony') }}
          listeners={{ focus: () => adService.showAd() }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ 
          tabBarLabel: t('profile') || 'Profile',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onLongPress={() => setSwitcherVisible(true)}
            />
          ),
        }}
        listeners={{ focus: () => adService.showAd() }}
      />
    </Tab.Navigator>
    <ProfileSwitcherModal
        visible={isSwitcherVisible}
        onClose={() => setSwitcherVisible(false)}
        onProfileSwitched={() => {
            setSwitcherVisible(false);
            // checkUser is triggered by event listener anyway
        }}
    />
    </>
  );
}

/* ------------------ AUTH NAVIGATOR ------------------ */
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

/* ------------------ ROOT NAVIGATOR ------------------ */
interface RootNavigatorProps {
  initialRoute: keyof RootStackParamList;
}

import CreateGroupScreen from '../screens/chat/CreateGroupScreen';

import JoinGroupScreen from '../screens/chat/JoinGroupScreen';
import GroupSettingsScreen from '../screens/chat/GroupSettingsScreen';
import AddGroupMembersScreen from '../screens/chat/AddGroupMembersScreen';

const RootNavigator = ({ initialRoute }: RootNavigatorProps) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
      <Stack.Screen name="FollowList" component={FollowListScreen} />
      <Stack.Screen name="MarriageDetail" component={MarriageDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="JoinGroup" component={JoinGroupScreen} />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
      <Stack.Screen name="AddGroupMembers" component={AddGroupMembersScreen} />
      <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
      <Stack.Screen name="CreateNews" component={CreateNewsScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Comments" component={CommentsScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="CreateReel" component={CreateReelScreen} />
      <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
      <Stack.Screen name="StoryViewer" component={StoryViewerScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="MyPosts" component={MyPostsScreen} />
      <Stack.Screen name="Gallery" component={GalleryScreen} />
      <Stack.Screen name="CreateMarriageProfile" component={CreateMarriageProfileScreen} />
      <Stack.Screen name="Temples" component={TempleScreen} />
      <Stack.Screen name="Branches" component={BranchScreen} />
      <Stack.Screen name="Jobs" component={JobScreen} />
      <Stack.Screen name="Family" component={FamilyScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Requests" component={RequestScreen} />
      <Stack.Screen name="ShokSanvedana" component={ShokSanvedanaScreen} />
      <Stack.Screen name="Connected" component={ConnectedScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="ApplyJob" component={ApplyJobScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="FestivalPoster" component={FestivalPosterScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="AgoraCall" component={AgoraCallScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ReelsViewer" component={ReelsScreen} />
      <Stack.Screen name="SmartCard" component={SmartCardScreen} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
      <Stack.Screen name="CreateBusinessPage" component={CreateBusinessPageScreen} />
      <Stack.Screen name="EditBusinessPage" component={EditBusinessPageScreen} />
      <Stack.Screen name="Chats" component={ChatListScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
