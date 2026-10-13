import { useRef } from 'react';
import { PanResponder, PanResponderInstance } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface TabSwipeOptions {
    currentTab: 'Home' | 'Reels' | 'News' | 'Marriage' | 'Profile';
    isBusiness?: boolean;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
}

export function useTabSwipe({ currentTab, isBusiness, onSwipeLeft, onSwipeRight }: TabSwipeOptions) {
    const navigation = useNavigation<any>();

    const tabs = isBusiness
        ? ['Home', 'Reels', 'News', 'Profile']
        : ['Home', 'Reels', 'News', 'Marriage', 'Profile'];

    const currentIndex = tabs.indexOf(currentTab);

    const panResponder = useRef<PanResponderInstance>(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Activate only if the gesture is clearly horizontal
                const isHorizontal =
                    Math.abs(gestureState.dx) > 35 &&
                    Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.6;
                return isHorizontal;
            },
            onPanResponderRelease: (_, gestureState) => {
                // Swipe Left (finger drags right-to-left: dx < -50) -> next tab
                if (gestureState.dx < -50 && Math.abs(gestureState.vx) > 0.2) {
                    if (onSwipeLeft) {
                        onSwipeLeft();
                    } else if (currentIndex >= 0 && currentIndex < tabs.length - 1) {
                        const nextTab = tabs[currentIndex + 1];
                        navigation.navigate(nextTab);
                    }
                }
                // Swipe Right (finger drags left-to-right: dx > 50) -> previous tab
                else if (gestureState.dx > 50 && Math.abs(gestureState.vx) > 0.2) {
                    if (onSwipeRight) {
                        onSwipeRight();
                    } else if (currentIndex > 0) {
                        const prevTab = tabs[currentIndex - 1];
                        navigation.navigate(prevTab);
                    }
                }
            },
        })
    ).current;

    return panResponder;
}
