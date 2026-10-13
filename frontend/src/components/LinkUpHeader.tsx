import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, StatusBar } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBadge } from '../context/BadgeContext';
import { useLanguage } from '../context/LanguageContext';
import NewsPaperIcon from './NewsPaperIcon';
import MatrimonyRingsIcon from './MatrimonyRingsIcon';
import ReelsTabIcon from './ReelsTabIcon';
import { WEBSITE_URL } from '../services/api';

const PHOTO_URL = `${WEBSITE_URL}/uploads/photo/`;

export const TOP_HEADER_COLLAPSE = 52;
export const HEADER_ATMOSPHERE_HEIGHT = 114;

const resolvePhotoUri = (photo: string | undefined | null): string | null => {
    if (!photo || photo === 'null' || photo === 'undefined' || photo.includes('via.placeholder') || (typeof photo === 'string' && photo.trim() === '')) {
        return null;
    }
    const clean = String(photo).trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        return clean;
    }
    if (clean.startsWith('/')) {
        return `${WEBSITE_URL}${clean}`;
    }
    if (clean.startsWith('uploads/')) {
        return `${WEBSITE_URL}/${clean}`;
    }
    return `${PHOTO_URL}${clean}`;
};

export interface LinkUpHeaderProps {
    currentTab: 'Home' | 'Reels' | 'News' | 'Marriage' | 'Profile';
    headerAnim?: Animated.Value;
    user?: any;
    onTabPress?: (tab: string) => void;
    onPlusPress?: () => void;
    tabSwipeHandlers?: any;
    subHeader?: React.ReactNode;
    statusBarHeight?: number;
}

export const LinkUpHeader: React.FC<LinkUpHeaderProps> = ({
    currentTab,
    headerAnim,
    user,
    onTabPress,
    onPlusPress,
    tabSwipeHandlers,
    subHeader,
    statusBarHeight: customStatusBarHeight,
}) => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { notificationCount, chatCount } = useBadge();

    const statusBarHeight = customStatusBarHeight ?? (Platform.OS === 'android' ? (StatusBar.currentHeight || insets.top || 24) : insets.top);

    const fallbackAnim = React.useRef(new Animated.Value(0)).current;
    const activeAnim = headerAnim || fallbackAnim;

    const topHeaderOpacity = useMemo(() => {
        return activeAnim.interpolate({
            inputRange: [-TOP_HEADER_COLLAPSE, 0],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });
    }, [activeAnim]);

    const handleTabClick = (tabName: 'Home' | 'Reels' | 'News' | 'Marriage' | 'Profile', screenName: string) => {
        if (onTabPress) {
            onTabPress(tabName);
        }
        if (currentTab !== tabName) {
            navigation.navigate(screenName);
        }
    };

    const handleDefaultPlus = () => {
        if (onPlusPress) {
            onPlusPress();
        } else if (currentTab === 'Reels') {
            navigation.navigate('CreateReel');
        } else {
            navigation.navigate('CreatePost');
        }
    };

    const avatarUri = resolvePhotoUri(user?.profile_photo || user?.photo || user?.avatar);

    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#CFE5FF" translucent={true} />

            {/* Permanent Status Bar Guard — keeps status bar clean */}
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: statusBarHeight,
                    backgroundColor: '#CFE5FF',
                    zIndex: 120,
                }}
            />

            {/* Main Header Container (Silky smooth native driver slide below status bar) */}
            <Animated.View
                style={[
                    styles.animatedHeaderWrapper,
                    {
                        top: statusBarHeight,
                        transform: [{ translateY: activeAnim }],
                    }
                ]}
                pointerEvents="box-none"
            >
                <LinearGradient
                    colors={['#CFE5FF', '#E4F1FF', '#F1F5F9']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.headerAtmosphere}
                >
                    {/* Main Brand Top Header */}
                    <Animated.View style={{ opacity: topHeaderOpacity }}>
                        <View style={styles.topHeader}>
                            <View style={styles.brandRow}>
                                <View style={styles.brandLogoWrapper}>
                                    <ExpoImage
                                        source={require('../../assets/icon.png')}
                                        style={styles.brandLogo}
                                        contentFit="cover"
                                    />
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.brandTitle}>LinkUp</Text>
                                    {user?.is_business == 1 && (
                                        <View style={styles.businessBadge}>
                                            <Ionicons name="briefcase" size={10} color="#1877F2" />
                                            <Text style={styles.businessBadgeText}>{t('business')}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <View style={styles.headerActionsGroup}>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Search')}
                                    activeOpacity={0.7}
                                    style={styles.headerCircleBtnWhite}
                                >
                                    <Ionicons name="search" size={18} color="#0F172A" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleDefaultPlus}
                                    activeOpacity={0.7}
                                    style={styles.headerCircleBtnBlue}
                                >
                                    <Ionicons name="add" size={22} color="white" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Notifications')}
                                    activeOpacity={0.7}
                                    style={styles.headerCircleBtnWhite}
                                >
                                    <Ionicons name="notifications-outline" size={19} color="#0F172A" />
                                    {notificationCount > 0 && (
                                        <View style={styles.blueDot} />
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Chats')}
                                    activeOpacity={0.7}
                                    style={styles.headerCircleBtnWhite}
                                >
                                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#0F172A" />
                                    {chatCount > 0 && (
                                        <View style={styles.redBadge}>
                                            <Text style={styles.redBadgeText}>
                                                {chatCount > 9 ? '9+' : chatCount}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Floating Capsule Navigation Tab Bar */}
                    <View style={styles.floatingTabBar} {...tabSwipeHandlers}>
                        {/* Home Tab */}
                        <TouchableOpacity
                            style={styles.floatingTabItem}
                            onPress={() => handleTabClick('Home', 'Home')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={currentTab === 'Home' ? 'home' : 'home-outline'}
                                size={22}
                                color={currentTab === 'Home' ? '#1877F2' : '#1E293B'}
                            />
                            {currentTab === 'Home' && <View style={styles.activeIndicatorPill} />}
                        </TouchableOpacity>

                        {/* Reels Tab */}
                        <TouchableOpacity
                            style={styles.floatingTabItem}
                            onPress={() => handleTabClick('Reels', 'Reels')}
                            activeOpacity={0.7}
                        >
                            <ReelsTabIcon
                                size={24}
                                color={currentTab === 'Reels' ? '#1877F2' : '#1E293B'}
                                focused={currentTab === 'Reels'}
                            />
                            {currentTab === 'Reels' && <View style={styles.activeIndicatorPill} />}
                        </TouchableOpacity>

                        {/* News Tab */}
                        <TouchableOpacity
                            style={styles.floatingTabItem}
                            onPress={() => handleTabClick('News', 'News')}
                            activeOpacity={0.7}
                        >
                            <NewsPaperIcon
                                size={24}
                                color={currentTab === 'News' ? '#1877F2' : '#1E293B'}
                            />
                            {currentTab === 'News' && <View style={styles.activeIndicatorPill} />}
                        </TouchableOpacity>

                        {/* Marriage Tab (hidden for business) */}
                        {user?.is_business != 1 && (
                            <TouchableOpacity
                                style={styles.floatingTabItem}
                                onPress={() => handleTabClick('Marriage', 'Marriage')}
                                activeOpacity={0.7}
                            >
                                <MatrimonyRingsIcon
                                    size={24}
                                    color={currentTab === 'Marriage' ? '#1877F2' : '#1E293B'}
                                />
                                {currentTab === 'Marriage' && <View style={styles.activeIndicatorPill} />}
                            </TouchableOpacity>
                        )}

                        {/* Profile Tab */}
                        <TouchableOpacity
                            style={styles.floatingTabItem}
                            onPress={() => handleTabClick('Profile', 'Profile')}
                            activeOpacity={0.7}
                        >
                            {avatarUri ? (
                                <View style={[
                                    styles.tabAvatarWrapper,
                                    currentTab === 'Profile' && { borderColor: '#1877F2', borderWidth: 2 }
                                ]}>
                                    <ExpoImage
                                        source={{ uri: avatarUri }}
                                        style={{ width: '100%', height: '100%' }}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                    />
                                </View>
                            ) : (
                                <Ionicons
                                    name={currentTab === 'Profile' ? 'person' : 'menu'}
                                    size={24}
                                    color={currentTab === 'Profile' ? '#1877F2' : '#1E293B'}
                                />
                            )}
                            {currentTab === 'Profile' && <View style={styles.activeIndicatorPill} />}
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Optional Sub-Header directly below the floating tabbar (e.g. Reels "Reels v" + Camera) */}
            {subHeader && (
                <Animated.View
                    style={[
                        styles.subHeaderWrapper,
                        {
                            top: statusBarHeight + HEADER_ATMOSPHERE_HEIGHT,
                            transform: [{ translateY: activeAnim }],
                        }
                    ]}
                    pointerEvents="box-none"
                >
                    {subHeader}
                </Animated.View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    animatedHeaderWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        overflow: 'hidden',
    },
    headerAtmosphere: {
        paddingTop: 4,
        paddingBottom: 8,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 8,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },
    brandLogoWrapper: {
        width: 38,
        height: 38,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#1877F2',
        overflow: 'hidden',
        backgroundColor: '#1877F2',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1877F2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    brandLogo: {
        width: '100%',
        height: '100%',
        transform: [{ scale: 1.18 }],
    },
    brandTitle: {
        fontSize: 27,
        fontWeight: '900',
        color: '#1877F2',
        letterSpacing: -0.8,
        fontFamily: Platform.select({
            ios: 'System',
            android: 'sans-serif-black',
            default: undefined,
        }),
    },
    businessBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    businessBadgeText: {
        fontSize: 10,
        color: '#1877F2',
        fontWeight: '700',
    },
    headerActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerCircleBtnWhite: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        position: 'relative',
    },
    headerCircleBtnBlue: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1877F2',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1877F2',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
        elevation: 4,
    },
    blueDot: {
        position: 'absolute',
        top: 3,
        right: 3,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1877F2',
        borderWidth: 1.5,
        borderColor: 'white',
    },
    redBadge: {
        position: 'absolute',
        top: -3,
        right: -3,
        backgroundColor: '#EF4444',
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    redBadgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
    floatingTabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 12,
        borderRadius: 30,
        height: 52,
        paddingHorizontal: 8,
        shadowColor: '#1877F2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    floatingTabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        position: 'relative',
    },
    activeIndicatorPill: {
        position: 'absolute',
        bottom: 5,
        width: 38,
        height: 3.5,
        backgroundColor: '#1877F2',
        borderRadius: 2,
    },
    tabAvatarWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        overflow: 'hidden',
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    subHeaderWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 90,
    },
});

export default LinkUpHeader;
