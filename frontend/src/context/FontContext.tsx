import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Font from 'expo-font';

// Static global variable for index.ts text render override to read synchronously
export let globalFontFamily: string | undefined = undefined;

export interface FontCatalogItem {
    familyName: string;
    cdnUrl: string;
    labelHi: string;
    labelGu: string;
    labelEn: string;
    category: 'Hindi' | 'Gujarati' | 'General';
}

export const FONT_CATALOG: Record<string, FontCatalogItem> = {
    'System': { familyName: '', cdnUrl: '', labelHi: 'सिस्टम डिफ़ॉल्ट', labelGu: 'સિસ્ટમ ડિફોલ્ટ', labelEn: 'System Default', category: 'General' },
    
    // Hindi Unicode Fonts
    'Hindi_Akshar': {
        familyName: 'Akshar',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/akshar/Akshar%5Bwght%5D.ttf',
        labelHi: 'अक्षर (Akshar)',
        labelGu: 'અક્ષર (Akshar)',
        labelEn: 'Akshar (Hindi)',
        category: 'Hindi'
    },
    'Hindi_Amiko': {
        familyName: 'Amiko',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiko/Amiko-Regular.ttf',
        labelHi: 'अमिको (Amiko)',
        labelGu: 'અમિકો (Amiko)',
        labelEn: 'Amiko (Hindi)',
        category: 'Hindi'
    },
    'Hindi_AnekDevanagari': {
        familyName: 'AnekDevanagari',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/anekdevanagari/AnekDevanagari%5Bwdth,wght%5D.ttf',
        labelHi: 'अनेक देवनागरी (Anek Devanagari)',
        labelGu: 'અનેક દેવનાગરી (Anek Devanagari)',
        labelEn: 'Anek Devanagari (Hindi)',
        category: 'Hindi'
    },
    'Hindi_AnnapurnaSIL': {
        familyName: 'AnnapurnaSIL',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/annapurnasil/AnnapurnaSIL-Regular.ttf',
        labelHi: 'अन्नपूर्णा सिल (Annapurna SIL)',
        labelGu: 'અન્નપૂર્ણા સિલ (Annapurna SIL)',
        labelEn: 'Annapurna SIL (Hindi)',
        category: 'Hindi'
    },
    'Hindi_Arya': {
        familyName: 'Arya',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/arya/Arya-Regular.ttf',
        labelHi: 'आर्य (Arya)',
        labelGu: 'આર્ય (Arya)',
        labelEn: 'Arya (Hindi)',
        category: 'Hindi'
    },
    'Hindi_Baloo2': {
        familyName: 'Baloo2',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/baloo2/Baloo2%5Bwght%5D.ttf',
        labelHi: 'बल्लू 2 (Baloo 2)',
        labelGu: 'બલ્લૂ 2 (Baloo 2)',
        labelEn: 'Baloo 2 (Hindi)',
        category: 'Hindi'
    },
    'Hindi_Akhand': {
        familyName: 'Cambay',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cambay/Cambay-Regular.ttf',
        labelHi: 'अखंड / कैंबे (Akhand)',
        labelGu: 'અખંડ / કૈંબે (Akhand)',
        labelEn: 'Akhand (Hindi)',
        category: 'Hindi'
    },
    'Hindi_Sarala': {
        familyName: 'Sarala',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarala/Sarala-Regular.ttf',
        labelHi: 'सरला (Sarala)',
        labelGu: 'સરલા (Sarala)',
        labelEn: 'Sarala (Hindi)',
        category: 'Hindi'
    },
    'Hindi_NotoSans': {
        familyName: 'NotoSansDevanagari',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth,wght%5D.ttf',
        labelHi: 'नोटो संस देवनागरी (Noto Sans)',
        labelGu: 'નોટો સંસ દેવનાગરી (Noto Sans)',
        labelEn: 'Noto Sans Devanagari (Hindi)',
        category: 'Hindi'
    },
    'Hindi_Rozha': {
        familyName: 'RozhaOne',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/rozhaone/RozhaOne-Regular.ttf',
        labelHi: 'रोझा वन (Rozha One)',
        labelGu: 'રોઝા વન (Rozha One)',
        labelEn: 'Rozha One (Hindi)',
        category: 'Hindi'
    },
    'Hindi_Yatra': {
        familyName: 'YatraOne',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/yatraone/YatraOne-Regular.ttf',
        labelHi: 'यात्रा वन (Yatra One)',
        labelGu: 'યાત્રા વન (Yatra One)',
        labelEn: 'Yatra One (Hindi)',
        category: 'Hindi'
    },

    // Gujarati Unicode Fonts
    'Gujarati_BalooBhai': {
        familyName: 'BalooBhai2',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/baloobhai2/BalooBhai2%5Bwght%5D.ttf',
        labelHi: 'बलू भाई 2 (Baloo Bhai 2)',
        labelGu: 'બલૂ ભાઈ 2 (Baloo Bhai 2)',
        labelEn: 'Baloo Bhai 2 (Gujarati)',
        category: 'Gujarati'
    },
    'Gujarati_MuktaVaani': {
        familyName: 'MuktaVaani',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/muktavaani/MuktaVaani-Regular.ttf',
        labelHi: 'मुक्तवाणी (Mukta Vaani)',
        labelGu: 'મુક્તવાણી (Mukta Vaani)',
        labelEn: 'Mukta Vaani (Gujarati)',
        category: 'Gujarati'
    },
    'Gujarati_NotoSans': {
        familyName: 'NotoSansGujarati',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansgujarati/NotoSansGujarati%5Bwdth,wght%5D.ttf',
        labelHi: 'नोटो संस गुजराती (Noto Sans)',
        labelGu: 'નોટો સંસ ગુજરાતી (Noto Sans)',
        labelEn: 'Noto Sans Gujarati',
        category: 'Gujarati'
    },
    'Gujarati_Anek': {
        familyName: 'AnekGujarati',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/anekgujarati/AnekGujarati%5Bwdth,wght%5D.ttf',
        labelHi: 'अनेक गुजराती (Anek Gujarati)',
        labelGu: 'અનેક ગુજરાતી (Anek Gujarati)',
        labelEn: 'Anek Gujarati',
        category: 'Gujarati'
    },
    'Gujarati_Aakar': {
        familyName: 'Shrikhand',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/shrikhand/Shrikhand-Regular.ttf',
        labelHi: 'आकार / श्रीखंड (Aakar)',
        labelGu: 'આકાર / શ્રીખંડ (Aakar)',
        labelEn: 'Aakar / Shrikhand (Gujarati)',
        category: 'Gujarati'
    },
    'Gujarati_HindVadodara': {
        familyName: 'HindVadodara',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/hindvadodara/HindVadodara-Regular.ttf',
        labelHi: 'हिन्द वडोदरा (Hind Vadodara)',
        labelGu: 'હિન્દ વડોદરા (Hind Vadodara)',
        labelEn: 'Hind Vadodara (Gujarati)',
        category: 'Gujarati'
    },
    'Gujarati_Farsan': {
        familyName: 'Farsan',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/farsan/Farsan-Regular.ttf',
        labelHi: 'फ़रसान (Farsan)',
        labelGu: 'ફરસાણ (Farsan)',
        labelEn: 'Farsan (Gujarati)',
        category: 'Gujarati'
    },
    'Gujarati_Rasa': {
        familyName: 'Rasa',
        cdnUrl: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/rasa/Rasa%5Bwght%5D.ttf',
        labelHi: 'रासा (Rasa)',
        labelGu: 'રાસા (Rasa)',
        labelEn: 'Rasa (Gujarati)',
        category: 'Gujarati'
    }
};

export const loadFontByKey = async (key: string) => {
    const item = FONT_CATALOG[key];
    if (!item || !item.cdnUrl || !item.familyName) return;
    try {
        if (!Font.isLoaded(item.familyName)) {
            await Font.loadAsync({
                [item.familyName]: item.cdnUrl
            });
            console.log(`[FontProvider] Loaded ${item.familyName} from CDN`);
        }
    } catch (e) {
        console.warn(`[FontProvider] Could not load font ${key}`, e);
    }
};

export const getFontForPlatform = (fontName: string) => {
    if (fontName === 'System' || fontName === 'System Default') return undefined;
    const isAndroid = Platform.OS === 'android';
    if (FONT_CATALOG[fontName]?.familyName) {
        return FONT_CATALOG[fontName].familyName;
    }
    switch (fontName) {
        case 'Devnagari Noto':
            return 'NotoSansDevanagari';
        case 'Devnagari Rozha':
            return 'RozhaOne';
        case 'Devnagari Yatra':
            return 'YatraOne';
        case 'Serif':
            return isAndroid ? 'serif' : 'Georgia';
        case 'Monospace':
            return isAndroid ? 'monospace' : 'Courier';
        case 'Condensed':
            return isAndroid ? 'sans-serif-condensed' : 'Arial';
        case 'Light':
            return isAndroid ? 'sans-serif-light' : 'Helvetica-Light';
        default:
            return undefined;
    }
};

interface FontContextType {
    fontFamily: string;
    setFontFamily: (font: string) => Promise<void>;
    fontScale: number;
    setFontScale: (scale: number) => Promise<void>;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export const FontProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fontFamily, setFontFamilyState] = useState<string>('System');
    const [fontScale, setFontScaleState] = useState<number>(1);

    useEffect(() => {
        loadFontFamily();
    }, []);

    const loadFontFamily = async () => {
        try {
            const storedFont = await AsyncStorage.getItem('appFontFamily');
            if (storedFont) {
                setFontFamilyState(storedFont);
                await loadFontByKey(storedFont);
                const resolved = getFontForPlatform(storedFont);
                globalFontFamily = resolved;
                (global as any).activeFontFamily = resolved;
                if (typeof (global as any).notifyFontChange === 'function') {
                    (global as any).notifyFontChange(resolved);
                }
            } else {
                globalFontFamily = undefined;
                (global as any).activeFontFamily = undefined;
                if (typeof (global as any).notifyFontChange === 'function') {
                    (global as any).notifyFontChange(undefined);
                }
            }

            const storedScale = await AsyncStorage.getItem('appFontScale');
            if (storedScale) {
                const scale = parseFloat(storedScale);
                setFontScaleState(scale);
                (global as any).activeFontScale = scale;
                if (typeof (global as any).notifyFontScaleChange === 'function') {
                    (global as any).notifyFontScaleChange(scale);
                }
            } else {
                (global as any).activeFontScale = 1;
                if (typeof (global as any).notifyFontScaleChange === 'function') {
                    (global as any).notifyFontScaleChange(1);
                }
            }
        } catch (error) {
            console.error("[FontProvider] Failed to load font family from storage", error);
        }
    };

    const setFontFamily = async (font: string) => {
        setFontFamilyState(font);
        await loadFontByKey(font);
        const resolved = getFontForPlatform(font);
        globalFontFamily = resolved;
        (global as any).activeFontFamily = resolved;
        await AsyncStorage.setItem('appFontFamily', font);
        if (typeof (global as any).notifyFontChange === 'function') {
            (global as any).notifyFontChange(resolved);
        }
    };

    const setFontScale = async (scale: number) => {
        setFontScaleState(scale);
        (global as any).activeFontScale = scale;
        await AsyncStorage.setItem('appFontScale', scale.toString());
        if (typeof (global as any).notifyFontScaleChange === 'function') {
            (global as any).notifyFontScaleChange(scale);
        }
    };

    return (
        <FontContext.Provider value={{ fontFamily, setFontFamily, fontScale, setFontScale }}>
            {children}
        </FontContext.Provider>
    );
};

export const useFont = () => {
    const context = useContext(FontContext);
    if (!context) {
        throw new Error('useFont must be used within a FontProvider');
    }
    return context;
};
