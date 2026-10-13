import React from 'react';
import { Image } from 'react-native';

interface NewsPaperIconProps {
  size?: number;
  color?: string;
  focused?: boolean;
}

export const NewsPaperIcon: React.FC<NewsPaperIconProps> = ({
  size = 23,
  color = '#64748B',
}) => {
  return (
    <Image
      source={require('../../assets/newspaper.png')}
      style={{
        width: size,
        height: size,
        tintColor: color,
      }}
      resizeMode="contain"
    />
  );
};

export default NewsPaperIcon;
