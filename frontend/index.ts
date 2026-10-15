import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
// Temporarily disabling native screens to debug context isolation in RN 0.81
enableScreens(true);
import { registerRootComponent } from 'expo';
import { BackHandler } from 'react-native';
import React from 'react';

// Polyfill: BackHandler.removeEventListener was removed in newer RN versions.
// Some older libraries still call it, causing crashes. This no-ops it safely.
if (!(BackHandler as any).removeEventListener) {
  (BackHandler as any).removeEventListener = () => {};
}

// Global Text Component Override via module mutation
const ReactNative = require('react-native');
const OriginalText = ReactNative.Text;

const fontListeners = new Set<any>();
(global as any).notifyFontChange = (font: string | undefined) => {
  fontListeners.forEach(listener => {
    try {
      listener(font);
    } catch (e) {
      console.warn("Font listener update failed", e);
    }
  });
};

const fontScaleListeners = new Set<any>();
(global as any).notifyFontScaleChange = (scale: number) => {
  fontScaleListeners.forEach(listener => {
    try {
      listener(scale);
    } catch (e) {
      console.warn("Font scale listener update failed", e);
    }
  });
};

const isIconFont = (fontFamilyName: any): boolean => {
  if (!fontFamilyName) return false;
  const fam = String(fontFamilyName).toLowerCase().trim();
  return (
    fam.includes('icon') ||
    fam.includes('awesome') ||
    fam.includes('feather') ||
    fam.includes('entypo') ||
    fam.includes('octicon') ||
    fam.includes('fontisto') ||
    fam.includes('foundation') ||
    fam.includes('zocial') ||
    fam.includes('antdesign') ||
    fam.includes('material') ||
    fam.includes('glyph')
  );
};

const CustomText = React.forwardRef((props: any, ref: any) => {
  const [activeFont, setActiveFont] = React.useState((global as any).activeFontFamily);
  const [activeScale, setActiveScale] = React.useState((global as any).activeFontScale || 1);

  React.useEffect(() => {
    const fontListener = (font: string | undefined) => {
      setActiveFont(font);
    };
    const scaleListener = (scale: number) => {
      setActiveScale(scale);
    };
    fontListeners.add(fontListener);
    fontScaleListeners.add(scaleListener);
    return () => {
      fontListeners.delete(fontListener);
      fontScaleListeners.delete(scaleListener);
    };
  }, []);

  let finalStyle = props.style;
  if (activeFont || activeScale !== 1) {
    const flatStyle = ReactNative.StyleSheet.flatten(props.style) || {};
    const existingFont = flatStyle.fontFamily;
    const isIcon = isIconFont(existingFont);

    // Never override icon fonts or explicitly specified custom preview fonts
    const shouldApplyFont = !!activeFont && !isIcon && (!existingFont || existingFont === 'sans-serif' || existingFont === 'System');
    const shouldScale = activeScale !== 1 && !isIcon && !!flatStyle.fontSize;
    const scaledFontSize = shouldScale ? flatStyle.fontSize * activeScale : undefined;

    if (shouldApplyFont || shouldScale) {
      finalStyle = [
        props.style,
        shouldApplyFont ? { fontFamily: activeFont } : {},
        scaledFontSize ? { fontSize: scaledFontSize } : {}
      ];
    }
  }

  return React.createElement(OriginalText, {
    ...props,
    ref,
    style: finalStyle
  });
});

Object.assign(CustomText, OriginalText);
Object.defineProperty(ReactNative, 'Text', {
  get: () => CustomText,
  configurable: true,
  enumerable: true
});

import notifee from '@notifee/react-native';

notifee.registerForegroundService((notification) => {
  return new Promise(() => {
    // Keep the service alive until stopped manually
    console.log("Notifee foreground service running...");
  });
});

import App from './App';
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
