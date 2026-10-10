import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

interface StoryRingProps {
    storyCount: number;
    size?: number;
    strokeWidth?: number;
    children: React.ReactNode;
}

const StoryRing: React.FC<StoryRingProps> = ({ 
    storyCount, 
    size = 62, 
    strokeWidth = 2.5,
    children 
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    // Gap size (pixels). If 1 story, no gap. If > 1, add gap.
    const gap = storyCount > 1 ? 8 : 0; 
    const dashLength = storyCount > 1 ? (circumference / storyCount) - gap : circumference;
    const dashArray = `${dashLength} ${gap}`;

    // Adjust rotation so the gaps look balanced (especially for 2 stories)
    // -90 starts from the top.
    const rotation = -90;

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
                <Defs>
                    <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#2563EB" />
                        <Stop offset="100%" stopColor="#93C5FD" />
                    </LinearGradient>
                </Defs>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#grad)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={dashArray}
                    strokeLinecap="round"
                    rotation={rotation}
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            {/* The child (avatar) inside the ring */}
            <View style={{ width: size - (strokeWidth * 2) - 3, height: size - (strokeWidth * 2) - 3, borderRadius: size / 2, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                {children}
            </View>
        </View>
    );
};

export default StoryRing;
