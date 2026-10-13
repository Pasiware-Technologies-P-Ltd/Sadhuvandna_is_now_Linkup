import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface ReelsTabIconProps {
  size?: number;
  color?: string;
  focused?: boolean;
}

export const ReelsTabIcon: React.FC<ReelsTabIconProps> = ({
  size = 24,
  color = '#1E293B',
  focused = false,
}) => {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Filled Clapperboard Background */}
        <Rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="5"
          fill={color}
        />
        {/* Horizontal Divider Cut */}
        <Path
          d="M2 8.4H22"
          stroke="white"
          strokeWidth="2.2"
        />
        {/* Slanted Clapper Cutout 1 */}
        <Path
          d="M8.2 2L10.2 8.4"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Slanted Clapper Cutout 2 */}
        <Path
          d="M14.4 2L16.4 8.4"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Filled Play Triangle */}
        <Path
          d="M10 12.2C10 11.55 10.72 11.16 11.26 11.52L15.65 14.42C16.14 14.75 16.14 15.45 15.65 15.78L11.26 18.68C10.72 19.04 10 18.65 10 18V12.2Z"
          fill="white"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bold Outer Rounded Box */}
      <Rect
        x="2.3"
        y="2.3"
        width="19.4"
        height="19.4"
        rx="5"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bold Horizontal Clapper Divider */}
      <Path
        d="M2.3 8.6H21.7"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Bold Slanted Stripe 1 */}
      <Path
        d="M8.2 2.5L10.2 8.6"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Bold Slanted Stripe 2 */}
      <Path
        d="M14.4 2.5L16.4 8.6"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Bold Play Button */}
      <Path
        d="M10 12.2C10 11.55 10.72 11.16 11.26 11.52L15.65 14.42C16.14 14.75 16.14 15.45 15.65 15.78L11.26 18.68C10.72 19.04 10 18.65 10 18V12.2Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
};

export default ReelsTabIcon;
