import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface MatrimonyRingsIconProps {
  size?: number;
  color?: string;
  focused?: boolean;
}

export const MatrimonyRingsIcon: React.FC<MatrimonyRingsIconProps> = ({
  size = 22,
  color = '#64748B',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Heart on Top */}
      <Path
        d="M12 6.6C11.5 5.8 8.6 3.6 8.6 2.4C8.6 1.3 9.5 0.5 10.6 0.5C11.3 0.5 11.8 0.9 12 1.5C12.2 0.9 12.7 0.5 13.4 0.5C14.5 0.5 15.4 1.3 15.4 2.4C15.4 3.6 12.5 5.8 12 6.6Z"
        fill={color}
      />
      {/* Little highlight shine inside the heart */}
      <Path
        d="M13.8 2.2C13.8 2.8 13.4 3.2 13 3.2C12.8 3.2 12.7 3 12.7 2.8C12.7 2.2 13.1 1.8 13.5 1.8C13.7 1.8 13.8 2 13.8 2.2Z"
        fill="white"
      />

      {/* Right Ring (base layer) */}
      <Circle
        cx="14.8"
        cy="14.2"
        r="5.5"
        stroke={color}
        strokeWidth="2.1"
        fill="none"
      />

      {/* Left Ring (middle layer) */}
      <Circle
        cx="9.2"
        cy="14.2"
        r="5.5"
        stroke={color}
        strokeWidth="2.1"
        fill="none"
      />

      {/* Interlocking cutout: Right ring passes over Left ring at top-left with white gap */}
      <Path
        d="M10.8 10.1A5.5 5.5 0 0 1 14.8 8.7"
        stroke="white"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M10.8 10.1A5.5 5.5 0 0 1 14.8 8.7"
        stroke={color}
        strokeWidth="2.1"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default MatrimonyRingsIcon;
