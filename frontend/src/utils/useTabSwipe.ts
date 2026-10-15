import { useRef, useEffect } from 'react';
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

    // Keep fresh state in a ref to avoid stale closures in PanResponder callbacks
    const stateRef = useRef({
        currentIndex,
        tabs,
        onSwipeLeft,
        onSwipeRight,
        navigation,
    });

    useEffect(() => {
        stateRef.current = {
            currentIndex,
            tabs,
            onSwipeLeft,
            onSwipeRight,
            navigation,
        };
    }, [currentIndex, tabs, onSwipeLeft, onSwipeRight, navigation]);

    // Prevent rapid multiple triggers while a tab transition is animating
    const isTransitioningRef = useRef(false);

    const panResponder = useRef<PanResponderInstance>(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,

            // Capture horizontal gestures cleanly before nested scroll views lock them
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                if (isTransitioningRef.current) return false;
                const dx = Math.abs(gestureState.dx);
                const dy = Math.abs(gestureState.dy);
                return dx > 26 && dx > dy * 2.2;
            },

            onMoveShouldSetPanResponder: (_, gestureState) => {
                if (isTransitioningRef.current) return false;
                const dx = Math.abs(gestureState.dx);
                const dy = Math.abs(gestureState.dy);
                return dx > 15 && dx > dy * 1.5;
            },

            onPanResponderTerminationRequest: () => false,

            onPanResponderRelease: (_, gestureState) => {
                if (isTransitioningRef.current) return;

                const { dx, dy, vx } = gestureState;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);
                const absVx = Math.abs(vx);

                // Ignore if primarily a vertical scroll
                if (absDx < absDy * 1.1) return;

                // Smooth detection: either sufficient drag distance (> 36px) or quick flick (> 18px & vx > 0.18)
                const isConfidentSwipe = absDx > 36 || (absDx > 18 && absVx > 0.18);
                if (!isConfidentSwipe) return;

                const { currentIndex: cIdx, tabs: tabList, onSwipeLeft: leftCb, onSwipeRight: rightCb, navigation: nav } = stateRef.current;

                // Swipe Left (finger moved right-to-left: dx < 0) -> Next Tab
                if (dx < 0) {
                    if (leftCb) {
                        isTransitioningRef.current = true;
                        leftCb();
                        setTimeout(() => { isTransitioningRef.current = false; }, 320);
                    } else if (cIdx >= 0 && cIdx < tabList.length - 1) {
                        isTransitioningRef.current = true;
                        const nextTab = tabList[cIdx + 1];
                        nav.navigate(nextTab);
                        setTimeout(() => { isTransitioningRef.current = false; }, 320);
                    }
                }
                // Swipe Right (finger moved left-to-right: dx > 0) -> Previous Tab
                else if (dx > 0) {
                    if (rightCb) {
                        isTransitioningRef.current = true;
                        rightCb();
                        setTimeout(() => { isTransitioningRef.current = false; }, 320);
                    } else if (cIdx > 0) {
                        isTransitioningRef.current = true;
                        const prevTab = tabList[cIdx - 1];
                        nav.navigate(prevTab);
                        setTimeout(() => { isTransitioningRef.current = false; }, 320);
                    }
                }
            },

            onPanResponderTerminate: () => {
                isTransitioningRef.current = false;
            },
        })
    ).current;

    return panResponder;
}
