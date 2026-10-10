import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking, ActionSheetIOS, Platform, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';
import { useFont, FONT_CATALOG } from '../../context/FontContext';

const SettingsScreen = ({ navigation }: any) => {
    const { language, setLanguage, t } = useLanguage();
    const { fontFamily, setFontFamily, fontScale, setFontScale } = useFont();
    const [fontModalVisible, setFontModalVisible] = useState(false);
    const [fontScaleModalVisible, setFontScaleModalVisible] = useState(false);
    const [langModalVisible, setLangModalVisible] = useState(false);
    const [user, setUser] = useState<any>(null);

    React.useEffect(() => {
        const loadUser = async () => {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                setUser(JSON.parse(u));
            }
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        Alert.alert(t('logout'), t('logoutConfirm'), [
            { text: t('cancel'), style: "cancel" },
            {
                text: t('logout'),
                style: "destructive",
                onPress: async () => {
                    await AsyncStorage.removeItem('user');
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }],
                    });
                }
            }
        ]);
    };

    const handleChangeLanguage = () => {
        setLangModalVisible(true);
    };

    const handleChangeFont = () => {
        setFontModalVisible(true);
    };

    const handleChangeFontScale = () => {
        setFontScaleModalVisible(true);
    };

    const getFontLabel = (font: string) => {
        const opt = FONT_CATALOG[font];
        if (!opt) return font;
        const langKey = language.charAt(0).toUpperCase() + language.slice(1);
        return (opt as any)[`label${langKey}`] || opt.labelEn;
    };

    const openLink = (url: string) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const FONT_SCALE_OPTIONS = [
        { label: 'Small', value: 0.85 },
        { label: 'Medium (Default)', value: 1 },
        { label: 'Large', value: 1.15 },
        { label: 'Extra Large', value: 1.3 }
    ];

    const getFontScaleLabel = (scale: number) => {
        return FONT_SCALE_OPTIONS.find(o => o.value === scale)?.label || 'Medium (Default)';
    };

    interface MenuItem {
        label: string;
        icon: string;
        action: () => void;
        color?: string;
        value?: string;
    }

    interface Section {
        title: string;
        items: MenuItem[];
    }

    const LANGUAGE_OPTIONS = [
        { key: 'en', label: 'English', nativeLabel: 'English', desc: 'Use app in English' },
        { key: 'hi', label: 'हिन्दी', nativeLabel: 'Hindi', desc: 'ऐप का हिंदी में उपयोग करें' },
        { key: 'gu', label: 'ગુજરાતી', nativeLabel: 'Gujarati', desc: 'ગુજરાતીમાં એપ્લિકેશનનો ઉપયોગ કરો' },
        { key: 'pa', label: 'ਪੰਜਾਬੀ', nativeLabel: 'Punjabi', desc: 'ਐਪ ਦੀ ਵਰਤੋਂ ਪੰਜਾਬੀ ਵਿੱਚ ਕਰੋ' },
        { key: 'bn', label: 'বাংলা', nativeLabel: 'Bengali', desc: 'অ্যাপটি বাংলায় ব্যবহার করুন' },
        { key: 'ta', label: 'தமிழ்', nativeLabel: 'Tamil', desc: 'செயலியை தமிழில் பயன்படுத்தவும்' },
        { key: 'te', label: 'తెలుగు', nativeLabel: 'Telugu', desc: 'యాప్‌ను తెలుగులో ఉపయోగించండి' },
        { key: 'kn', label: 'ಕನ್ನಡ', nativeLabel: 'Kannada', desc: 'ಅಪ್ಲಿಕೇಶನ್ ಅನ್ನು ಕನ್ನಡದಲ್ಲಿ ಬಳಸಿ' },
        { key: 'ml', label: 'മലയാളം', nativeLabel: 'Malayalam', desc: 'ആപ്പ് മലയാളത്തിൽ ഉപയോഗിക്കുക' },
        { key: 'or', label: 'ଓଡ଼ିଆ', nativeLabel: 'Odia', desc: 'ଆପ୍ କୁ ଓଡ଼ିଆରେ ବ୍ୟବହାର କରନ୍ତୁ' },
        { key: 'as', label: 'অসমীয়া', nativeLabel: 'Assamese', desc: 'অসমীয়াত অ্যাপ ব্যৱহাৰ কৰক' },
        { key: 'ur', label: 'اردو', nativeLabel: 'Urdu', desc: 'ایپ کا اردو میں استعمال کریں' },
    ];

    const sections: Section[] = [
        {
            title: t('language'),
            items: [
                {
                    label: t('changeLanguage'),
                    icon: "language-outline",
                    action: handleChangeLanguage,
                    value: LANGUAGE_OPTIONS.find(o => o.key === language)?.label || 'English'
                }
            ]
        },
        {
            title: t('appearance'),
            items: [
                {
                    label: t('changeFontFamily'),
                    icon: "text-outline",
                    action: handleChangeFont,
                    value: getFontLabel(fontFamily)
                },
                {
                    label: 'Font Size',
                    icon: "resize-outline",
                    action: handleChangeFontScale,
                    value: getFontScaleLabel(fontScale)
                }
            ]
        },
        {
            title: t('account'),
            items: [
                { label: t('editProfile'), icon: "person-outline", action: () => navigation.navigate(user?.is_business == 1 ? 'EditBusinessPage' : 'EditProfile') },
                // { label: t('changePassword'), icon: "lock-closed-outline", action: () => navigation.navigate('ChangePassword') },
            ]
        },
        {
            title: t('supportLegal'),
            items: [
                { label: t('privacyPolicy'), icon: "shield-checkmark-outline", action: () => openLink('https://www.sadhuvandna.co.in/policy.php') },
                { label: t('termsConditions'), icon: "document-text-outline", action: () => openLink('https://www.sadhuvandna.co.in/terms.php') },
                { label: t('contactUs'), icon: "mail-outline", action: () => openLink('https://www.sadhuvandna.co.in/contact.php') },
            ]
        },
        {
            title: t('actions'),
            items: [
                { label: t('logout'), icon: "log-out-outline", action: handleLogout, color: '#ef4444' },
            ]
        }
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 16 }}>{t('settings')}</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {sections.map((section, idx) => (
                    <View key={idx} style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' }}>
                            {section.title}
                        </Text>
                        <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
                            {section.items.map((item, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={item.action}
                                    style={{
                                        flexDirection: 'row', alignItems: 'center', padding: 16,
                                        borderBottomWidth: i === section.items.length - 1 ? 0 : 1,
                                        borderBottomColor: '#E2E8F0'
                                    }}
                                >
                                    <View style={{ width: 32, alignItems: 'center', marginRight: 12 }}>
                                        <Ionicons name={item.icon as any} size={22} color={item.color || '#64748B'} />
                                    </View>
                                    <Text style={{ fontSize: 16, color: item.color || '#172554', flex: 1 }}>{item.label}</Text>

                                    {item.value && (
                                        <Text style={{ marginRight: 8, color: '#2563EB', fontWeight: 'bold' }}>{item.value}</Text>
                                    )}

                                    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

            </ScrollView>

            {/* Premium Font Selector Bottom Sheet Modal */}
            <Modal
                visible={fontModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFontModalVisible(false)}
            >
                <Pressable 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    onPress={() => setFontModalVisible(false)}
                >
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
                        {/* Handle bar */}
                        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 16 }} />
                        
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#172554' }}>
                                {t('changeFontFamily')}
                            </Text>
                            <TouchableOpacity onPress={() => setFontModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ gap: 10 }}>
                                {Object.keys(FONT_CATALOG).map((key) => {
                                    const opt = FONT_CATALOG[key];
                                    const isSelected = fontFamily === key;
                                    const langKey = language.charAt(0).toUpperCase() + language.slice(1);
                                    const label = (opt as any)[`label${langKey}`] || opt.labelEn;
                                    const fontStyle = opt.familyName || undefined;
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            onPress={() => {
                                                setFontFamily(key);
                                                setFontModalVisible(false);
                                            }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 14,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                                                backgroundColor: isSelected ? '#EFF6FF' : 'white',
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontSize: 16,
                                                    fontWeight: 'bold',
                                                    color: isSelected ? '#2563EB' : '#172554',
                                                    fontFamily: fontStyle
                                                }}>
                                                    {label}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: isSelected ? '#c2410c' : '#9ca3af', marginTop: 2 }}>
                                                    {opt.category} Font • {opt.familyName || 'Default'}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* Premium Language Selector Bottom Sheet Modal */}
            <Modal
                visible={langModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setLangModalVisible(false)}
            >
                <Pressable 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    onPress={() => setLangModalVisible(false)}
                >
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
                        {/* Handle bar */}
                        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 16 }} />
                        
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#172554' }}>
                                {t('changeLanguage')}
                            </Text>
                            <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ gap: 10 }}>
                                {LANGUAGE_OPTIONS.map((opt) => {
                                    const isSelected = language === opt.key;
                                    return (
                                        <TouchableOpacity
                                            key={opt.key}
                                            onPress={() => {
                                                setLanguage(opt.key as any);
                                                setLangModalVisible(false);
                                            }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 16,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                                                backgroundColor: isSelected ? '#EFF6FF' : 'white',
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontSize: 16,
                                                    fontWeight: 'bold',
                                                    color: isSelected ? '#2563EB' : '#172554'
                                                }}>
                                                    {opt.label} <Text style={{ fontSize: 12, fontWeight: 'normal', color: '#64748B' }}>({opt.nativeLabel})</Text>
                                                </Text>
                                                <Text style={{ fontSize: 11, color: isSelected ? '#c2410c' : '#9ca3af', marginTop: 2 }}>
                                                    {opt.desc}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* Font Size Selector Bottom Sheet Modal */}
            <Modal
                visible={fontScaleModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFontScaleModalVisible(false)}
            >
                <Pressable 
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    onPress={() => setFontScaleModalVisible(false)}
                >
                    <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
                        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 16 }} />
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#172554' }}>
                                Font Size
                            </Text>
                            <TouchableOpacity onPress={() => setFontScaleModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ gap: 10 }}>
                                {FONT_SCALE_OPTIONS.map((opt) => {
                                    const isSelected = fontScale === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() => {
                                                setFontScale(opt.value);
                                                setFontScaleModalVisible(false);
                                            }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 16,
                                                borderRadius: 16,
                                                borderWidth: 1,
                                                borderColor: isSelected ? '#2563EB' : '#E2E8F0',
                                                backgroundColor: isSelected ? '#EFF6FF' : 'white',
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={{
                                                    fontSize: 16 * opt.value,
                                                    fontWeight: 'bold',
                                                    color: isSelected ? '#2563EB' : '#172554'
                                                }}>
                                                    {opt.label}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

export default SettingsScreen;
