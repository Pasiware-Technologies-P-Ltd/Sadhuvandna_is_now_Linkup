import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, Easing, AlertButton } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AlertConfig = {
    title: string;
    message?: string;
    buttons?: AlertButton[];
    options?: { cancelable?: boolean };
};

class CustomAlertManager {
    static listener: ((config: AlertConfig | null) => void) | null = null;

    static show(title: string, message?: string, buttons?: AlertButton[], options?: any) {
        let cleanTitle = title;
        if (!cleanTitle || cleanTitle.trim().toLowerCase() === 'error') {
            const lowerMsg = (message || '').toLowerCase();
            if (lowerMsg.includes('required') || lowerMsg.includes('please enter') || lowerMsg.includes('must be') || lowerMsg.includes('match') || lowerMsg.includes('select') || lowerMsg.includes('fill') || lowerMsg.includes('invalid') || lowerMsg.includes('check')) {
                cleanTitle = "Please Check";
            } else if (lowerMsg.includes('network') || lowerMsg.includes('connection') || lowerMsg.includes('offline') || lowerMsg.includes('internet') || lowerMsg.includes('server')) {
                cleanTitle = "Couldn't Connect";
            } else {
                cleanTitle = "Something Went Wrong";
            }
        }

        if (this.listener) {
            this.listener({ title: cleanTitle, message, buttons, options });
        } else {
            console.warn('CustomAlertProvider not mounted');
        }
    }

    static hide() {
        if (this.listener) {
            this.listener(null);
        }
    }
}

export const CustomAlertProvider = () => {
    const [config, setConfig] = useState<AlertConfig | null>(null);
    const [visible, setVisible] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.9));

    useEffect(() => {
        CustomAlertManager.listener = (newConfig) => {
            if (newConfig) {
                setConfig(newConfig);
                setVisible(true);
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.ease),
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 8,
                        tension: 100,
                        useNativeDriver: true,
                    }),
                ]).start();
            } else {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 0.9,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    setVisible(false);
                    setConfig(null);
                });
            }
        };

        return () => {
            CustomAlertManager.listener = null;
        };
    }, []);

    if (!visible || !config) return null;

    const handleClose = () => {
        if (config.options?.cancelable !== false) {
            CustomAlertManager.hide();
        }
    };

    const buttons = config.buttons && config.buttons.length > 0 
        ? config.buttons 
        : [{ text: 'OK', onPress: () => {} }];

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={handleClose}
        >
            <View className="flex-1 justify-center items-center bg-black/50 px-6">
                <TouchableOpacity 
                    activeOpacity={1} 
                    className="absolute inset-0" 
                    onPress={handleClose} 
                />
                
                <Animated.View 
                    style={{ 
                        opacity: fadeAnim, 
                        transform: [{ scale: scaleAnim }] 
                    }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
                >
                    {(() => {
                        const titleLower = (config.title || '').toLowerCase();
                        const isDanger = titleLower.includes('wrong') || titleLower.includes('connect') || titleLower.includes('fail') || titleLower.includes('delete') || titleLower.includes('error');
                        const isSuccess = titleLower.includes('success') || titleLower.includes('done') || titleLower.includes('copied') || titleLower.includes('saved');

                        return (
                            <View className="items-center mb-4">
                                <View style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 26,
                                    backgroundColor: isDanger ? '#FEE2E2' : (isSuccess ? '#DCFCE7' : '#EFF6FF'),
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 12,
                                }}>
                                    <Ionicons
                                        name={isDanger ? "alert-circle" : (isSuccess ? "checkmark-circle" : "information-circle")}
                                        size={28}
                                        color={isDanger ? "#EF4444" : (isSuccess ? "#16A34A" : "#2563EB")}
                                    />
                                </View>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 6, letterSpacing: -0.4 }}>
                                    {config.title}
                                </Text>
                                {config.message ? (
                                    <Text style={{ fontSize: 13.5, color: '#64748B', textAlign: 'center', lineHeight: 20, paddingHorizontal: 6 }}>
                                        {config.message}
                                    </Text>
                                ) : null}
                            </View>
                        );
                    })()}

                    <View className={`flex-row justify-center mt-2 ${buttons.length > 2 ? 'flex-col' : ''}`}>
                        {buttons.map((btn, index) => {
                            const isPrimary = index === buttons.length - 1 && btn.style !== 'cancel' && btn.style !== 'destructive';
                            const isDestructive = btn.style === 'destructive';
                            const isCancel = btn.style === 'cancel';
                            
                            let btnClass = "py-3 px-6 rounded-xl mx-1 ";
                            let textClass = "font-bold text-center ";
                            
                            if (isPrimary) {
                                btnClass += "bg-blue-600 flex-1";
                                textClass += "text-white";
                            } else if (isDestructive) {
                                btnClass += "bg-red-500 flex-1";
                                textClass += "text-white";
                            } else {
                                btnClass += "bg-slate-100 flex-1";
                                textClass += "text-slate-600";
                            }

                            if (buttons.length > 2) {
                                btnClass += " my-1 w-full mx-0";
                            }

                            return (
                                <TouchableOpacity
                                    key={index}
                                    activeOpacity={0.8}
                                    className={btnClass}
                                    onPress={() => {
                                        CustomAlertManager.hide();
                                        setTimeout(() => {
                                            if (btn.onPress) btn.onPress();
                                        }, 150);
                                    }}
                                >
                                    <Text className={textClass}>{btn.text || 'OK'}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

export default CustomAlertManager;
