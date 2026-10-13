import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  DeviceEventEmitter,
  RefreshControl,
  StatusBar,
  Easing,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import api, { API_BASE_URL } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../context/LanguageContext";
import { ImageService } from "../../services/ImageService";

import { ChatDBService } from "../../services/ChatDBService";
import { useTabSwipe } from "../../utils/useTabSwipe";
import LinkUpHeader, { TOP_HEADER_COLLAPSE } from "../../components/LinkUpHeader";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BASE_URL_ROOT = "https://www.sadhuvandna.co.in";
const PHOTO_URL = `${BASE_URL_ROOT}/uploads/photo/`;
const QUICK_TAGS = [
  "All",
  "Delhi",
  "Mumbai",
  "B.Tech",
  "MBA",
  "Doctor",
  "B.Sc",
  "MCA",
];

const MarriageScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || insets.top || 24) : insets.top;
  const [user, setUser] = useState<any>(null);
  const tabSwipe = useTabSwipe({ currentTab: 'Marriage', isBusiness: user?.is_business == 1 });

  // Facebook-style silky smooth auto-collapsing top header on scroll (native driver)
  const headerAnim = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const accumulatedScroll = useRef(0);
  const isHeaderHidden = useRef(false);
  const listRef = useRef<any>(null);

  const animateHeader = useCallback((toHide: boolean) => {
    if (isHeaderHidden.current === toHide) return;
    isHeaderHidden.current = toHide;
    Animated.timing(headerAnim, {
      toValue: toHide ? -TOP_HEADER_COLLAPSE : 0,
      duration: 280,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  const handleFeedScroll = useCallback((event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    if (currentY <= 10) {
      accumulatedScroll.current = 0;
      animateHeader(false);
      return;
    }

    if (diff > 0) {
      accumulatedScroll.current += diff;
      if (accumulatedScroll.current > 40) {
        animateHeader(true);
      }
    } else if (diff < 0) {
      accumulatedScroll.current += diff;
      if (accumulatedScroll.current < -30) {
        animateHeader(false);
      }
    }
  }, [animateHeader]);

  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfileId, setMyProfileId] = useState<number>(0);
  const [myProfilePhoto, setMyProfilePhoto] = useState<string>("");
  const [requestCount, setRequestCount] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userPhoto, setUserPhoto] = useState<string>("");
  const { t } = useLanguage();

  // Filters
  const [search, setSearch] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (filterVisible) {
      filterAnim.setValue(0);
      Animated.spring(filterAnim, {
        toValue: 1,
        tension: 70,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [filterVisible]);

  const toggleFilter = () => {
    if (filterVisible) {
      Animated.timing(filterAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setFilterVisible(false);
      });
    } else {
      setFilterVisible(true);
    }
  };

  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [city, setCity] = useState("");
  const [education, setEducation] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  // Pagination
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);
  const cursorRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  // Premium states
  const [activeTag, setActiveTag] = useState("All");
  const shimmerAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1.0,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.4,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      shimmerAnim.setValue(0.4);
    }
  }, [loading]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchProfiles();
    }
  }, [userId]);

  const loadCachedProfiles = async (uid: string) => {
    try {
      const cached = await AsyncStorage.getItem(`cached_matrimony_${uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const filteredProfiles = parsed.profiles.filter((p: any) => String(p.user_id) !== String(uid) && String(p.id) !== String(parsed.myProfileId));
        setProfiles(filteredProfiles);
        if (parsed.myProfileId) setMyProfileId(parsed.myProfileId);
        if (parsed.myProfilePhoto) setMyProfilePhoto(parsed.myProfilePhoto);
        if (parsed.requestCount) setRequestCount(parsed.requestCount);
        setLoading(false);
        return true;
      }
    } catch (e) {}
    return false;
  };

  const loadUnreadCount = async (uid: string | number) => {
    try {
      const chats = await ChatDBService.getConversations(
        String(uid),
        "marriage",
      );
      let totalUnread = 0;
      chats.forEach((c: any) => {
        totalUnread += c.unread_count || 0;
      });
      setUnreadCount(totalUnread);
    } catch (e) {}
  };

  const loadUser = async () => {
    const u = await AsyncStorage.getItem("user");
    if (u) {
      const parsed = JSON.parse(u);
      setUser(parsed);
      const parsedId = parsed.id;
      setUserId(parsedId);
      if (parsed.profile_photo) {
        setUserPhoto(parsed.profile_photo);
      }
      const hasCache = await loadCachedProfiles(parsedId);
      await loadUnreadCount(parsedId);
      fetchProfiles(false, undefined, false, hasCache);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (userId) {
        fetchProfiles(false, undefined, false, true); // silent refresh on focus
        loadUnreadCount(userId);
      }
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    });

    const notifListener = DeviceEventEmitter.addListener(
      "new_notification",
      () => {
        if (userId) {
          loadUnreadCount(userId);
        }
      },
    );

    return () => {
      unsubscribe();
      unsubscribeBlur();
      notifListener.remove();
    };
  }, [navigation, userId]);

  const fetchProfiles = async (
    isMore = false,
    overrideFilters?: { gender?: string; city?: string; education?: string },
    isRefresh = false,
    isSilent = false
  ) => {
    if (isMore && (isLoadMoreLoading || !hasMore)) return;

    if (isMore) setIsLoadMoreLoading(true);
    else if (isRefresh) setRefreshing(true);
    else if (!isSilent && profiles.length === 0) setLoading(true);

    const activeGender =
      overrideFilters?.gender !== undefined ? overrideFilters.gender : gender;
    const activeCity =
      overrideFilters?.city !== undefined ? overrideFilters.city : city;
    const activeEducation =
      overrideFilters?.education !== undefined
        ? overrideFilters.education
        : education;

    if (!isMore) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
    }

    try {
      const params = new URLSearchParams();
      params.append("user_id", userId || "0");
      params.append("limit", "20");
      
      if (isMore && cursorRef.current) {
        params.append("cursor", cursorRef.current.toString());
      }

      if (search) params.append("city", search);
      if (activeGender) params.append("gender", activeGender);
      if (minAge && maxAge) params.append("age", `${minAge}-${maxAge}`);
      if (activeCity) params.append("city", activeCity);
      if (activeEducation) params.append("education", activeEducation);

      const res = await api.get(
        `/get_matrimony_profiles.php?${params.toString()}`,
        { signal: isMore ? undefined : abortControllerRef.current?.signal }
      );
      if (res.data.status === "success") {
        const rawData = res.data.data || [];
        // Filter out the user's own profile so it doesn't show up in the feed
        const newData = rawData.filter((p: any) => String(p.user_id) !== String(userId) && String(p.id) !== String(res.data.my_profile_id));

        setHasMore(res.data.has_more);
        cursorRef.current = res.data.next_cursor;

        if (isMore) {
          setProfiles((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const uniqueNewData = newData.filter((p: any) => !existingIds.has(p.id));
            return [...prev, ...uniqueNewData];
          });
        } else {
          const cacheObj = {
            profiles: newData,
            myProfileId: res.data.my_profile_id,
            myProfilePhoto: res.data.my_profile_photo,
            requestCount: res.data.request_count,
          };
          const newStringified = JSON.stringify(cacheObj);
          
          if (!search && !activeGender && !activeCity && !activeEducation) {
            AsyncStorage.getItem(`cached_matrimony_${userId || "0"}`).then(cachedStr => {
              if (!isSilent || cachedStr !== newStringified) {
                setProfiles(newData);
                AsyncStorage.setItem(
                  `cached_matrimony_${userId || "0"}`,
                  newStringified,
                );
              }
            });
          } else {
            setProfiles(newData);
          }
        }

        setMyProfileId(res.data.my_profile_id);
        setMyProfilePhoto(res.data.my_profile_photo || "");
        setRequestCount(res.data.request_count);
      }
      setLoading(false);
      setRefreshing(false);
      setIsLoadMoreLoading(false);
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.message === 'canceled') {
        return;
      }
      console.error(error);
      setLoading(false);
      setRefreshing(false);
      setIsLoadMoreLoading(false);
    }
  };

  const onRefresh = () => {
    cursorRef.current = null;
    fetchProfiles(false, undefined, true);
  };

  const handleGenderSegmentPress = (selectedGender: string) => {
    setGender(selectedGender);
    fetchProfiles(false, { gender: selectedGender, city, education });
  };

  const handleTagPress = (tag: string) => {
    setActiveTag(tag);
    let nextCity = "";
    let nextEducation = "";

    if (tag === "All") {
      nextCity = "";
      nextEducation = "";
      setCity("");
      setEducation("");
    } else if (["Delhi", "Mumbai"].includes(tag)) {
      nextCity = tag;
      nextEducation = "";
      setCity(tag);
      setEducation("");
    } else {
      nextCity = "";
      nextEducation = tag;
      setCity("");
      setEducation(tag);
    }

    fetchProfiles(false, { gender, city: nextCity, education: nextEducation });
  };

  const renderSkeletonCard = () => {
    return (
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "white",
          margin: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          overflow: "hidden",
          opacity: shimmerAnim,
        }}
      >
        <View
          style={{ width: "100%", height: 160, backgroundColor: "#E2E8F0" }}
        />
        <View style={{ padding: 12 }}>
          <View
            style={{
              width: "70%",
              height: 14,
              backgroundColor: "#E2E8F0",
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <View
            style={{
              width: "90%",
              height: 10,
              backgroundColor: "#E2E8F0",
              borderRadius: 4,
            }}
          />
        </View>
        <View
          style={{
            width: "100%",
            height: 36,
            backgroundColor: "#F8FAFC",
            borderTopWidth: 1,
            borderColor: "#E2E8F0",
          }}
        />
      </Animated.View>
    );
  };

  const handleSendRequest = async (receiverId: string) => {
    if (!userId) {
      Alert.alert("Notice", "Please login.");
      return;
    }
    if (!myProfileId) {
      Alert.alert(
        "Profile Required",
        "Please create your marriage profile first.",
        [
          { text: "Cancel" },
          {
            text: "Create Now",
            onPress: () => navigation.navigate("CreateMarriageProfile"),
          },
        ],
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append("action", "send_request");
      formData.append("user_id", userId);
      formData.append("receiver_id", receiverId);

      // using api_connect.php for unified connection handling
      const res = await api.post("/api_connect.php", formData);
      if (res.data.status === "success") {
        Alert.alert("Success", "Proposal Sent Successfully");
        fetchProfiles(); // Refresh status
      } else {
        Alert.alert("Notice", res.data.message || "Failed to send request");
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
    }
  };

  const renderProfile = ({ item }: { item: any }) => {
    const isSender = item.is_sender;
    const status = item.proposal_status;

    // Generate a deterministic compatibility score based on name & ID
    const scoreHash =
      (item.full_name?.charCodeAt(0) || 0) + (parseInt(item.id) || 0);
    const compatibilityScore = 78 + (scoreHash % 21); // Generates a percentage between 78% and 98%

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("MarriageDetail", { profile: item })}
        style={{
          flex: 1,
          backgroundColor: "white",
          margin: 6,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 10,
          elevation: 2,
          overflow: "hidden",
        }}
      >
        <View style={{ position: "relative" }}>
          <Image
            source={{
              uri: item.photo
                ? ImageService.getFeedImageUrl(`${PHOTO_URL}${item.photo}`, 300)
                : "https://via.placeholder.com/150",
            }}
            style={{ width: "100%", height: 160, backgroundColor: "#F8FAFC" }}
            contentFit="cover"
          />
          {/* Flame compatibility score badge */}
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: "900", color: "#2563EB" }}>
              🔥 {compatibilityScore}%
            </Text>
          </View>
          <View
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#2563EB",
                fontSize: 8,
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {item.status || "UNMARRIED"}
            </Text>
          </View>
        </View>

        <View style={{ padding: 12 }}>
          <Text
            style={{ fontSize: 14, fontWeight: "bold", color: "#172554" }}
            numberOfLines={1}
          >
            {item.full_name}, {item.age}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "500",
              color: "#64748B",
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {item.city || "Location"} • {item.education || "Not specified"}
          </Text>
        </View>

        {/* Card Footer Action Strip */}
        <View style={{ marginTop: "auto" }}>
          {(!status || status === "rejected") && (
            <View
              style={{
                width: "100%",
                backgroundColor: "#EFF6FF",
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                borderTopWidth: 1,
                borderTopColor: "#DBEAFE",
              }}
            >
              <Text
                style={{
                  color: "#2563EB",
                  fontWeight: "bold",
                  fontSize: 11,
                  letterSpacing: 0.3,
                }}
              >
                {t("viewProfileMatrimony")}
              </Text>
            </View>
          )}

          {(status === "pending" || status === "sent" || status === "received") && (
            <View
              style={{
                width: "100%",
                backgroundColor: "#EFF6FF",
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                borderTopWidth: 1,
                borderTopColor: "#DBEAFE",
              }}
            >
              <Text
                style={{
                  color: "#2563EB",
                  fontWeight: "bold",
                  fontSize: 11,
                  letterSpacing: 0.3,
                }}
              >
                {t("requested")} • {t("viewProfileMatrimony")}
              </Text>
            </View>
          )}

          {(status === "accepted" || status === "friend") && (
            <TouchableOpacity
              style={{
                width: "100%",
                backgroundColor: "#f0fdf4",
                paddingVertical: 10,
                alignItems: "center",
                justifyContent: "center",
                borderTopWidth: 1,
                borderTopColor: "#dcfce7",
              }}
              onPress={() =>
                navigation.navigate("Chat", {
                  receiver: item,
                  platform: "marriage",
                })
              }
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: "#16a34a",
                  fontWeight: "bold",
                  fontSize: 11,
                  letterSpacing: 0.3,
                }}
              >
                {t("message")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  const renderListHeader = () => {
    const subtitleText = (t as any)("findSoulmate");
    const displaySubtitle =
      subtitleText && subtitleText !== "findSoulmate"
        ? subtitleText
        : "Soulmate";

    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          marginHorizontal: 4,
          marginTop: 4,
          marginBottom: 10,
          borderRadius: 22,
          paddingTop: 14,
          paddingBottom: 12,
          borderWidth: 1,
          borderColor: "#E2E8F0",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Top Control Bar: Title & Action Trio */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            marginBottom: 12,
          }}
        >
          {/* Title + Soulmate Tag */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "900",
                color: "#0F172A",
                letterSpacing: -0.4,
              }}
            >
              Matrimony
            </Text>
            <View
              style={{
                backgroundColor: "#EFF6FF",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                borderWidth: 1,
                borderColor: "#DBEAFE",
              }}
            >
              <Ionicons name="sparkles" size={10} color="#2563EB" />
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: "700",
                  color: "#2563EB",
                }}
              >
                {displaySubtitle}
              </Text>
            </View>
          </View>

          {/* Action Trio: Search, Requests, Chat (All preserved with improved proportions) */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Search / Filter Button */}
            <TouchableOpacity
              onPress={toggleFilter}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: filterVisible ? "#2563EB" : "#F8FAFC",
                paddingHorizontal: 11,
                height: 34,
                borderRadius: 17,
                borderWidth: 1,
                borderColor: filterVisible ? "#2563EB" : "#E2E8F0",
                gap: 5,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="funnel-outline"
                size={12}
                color={filterVisible ? "#FFFFFF" : "#2563EB"}
              />
              <Text
                style={{
                  color: filterVisible ? "#FFFFFF" : "#334155",
                  fontSize: 11.5,
                  fontWeight: "700",
                }}
              >
                Search
              </Text>
            </TouchableOpacity>

            {/* Requests Icon */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Requests")}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#E2E8F0",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={17} color="#2563EB" />
              {requestCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    backgroundColor: "#EF4444",
                    minWidth: 15,
                    height: 15,
                    borderRadius: 7.5,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 2,
                    borderWidth: 1.5,
                    borderColor: "#FFFFFF",
                  }}
                >
                  <Text
                    style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "800" }}
                  >
                    {requestCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Chat Icon */}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("ChatList", { platform: "marriage" })
              }
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#E2E8F0",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color="#2563EB"
              />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    backgroundColor: "#EF4444",
                    minWidth: 15,
                    height: 15,
                    borderRadius: 7.5,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 2,
                    borderWidth: 1.5,
                    borderColor: "#FFFFFF",
                  }}
                >
                  <Text
                    style={{ color: "#FFFFFF", fontSize: 8, fontWeight: "800" }}
                  >
                    {unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: Gender Segment Bar + Profile Button */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            marginBottom: 12,
            gap: 10,
          }}
        >
          {/* Segment Switcher */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              backgroundColor: "#F1F5F9",
              borderRadius: 20,
              padding: 3,
              height: 40,
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => handleGenderSegmentPress("")}
              style={{
                flex: 1,
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: gender === "" ? "#FFFFFF" : "transparent",
                borderRadius: 17,
                shadowColor: gender === "" ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 1.5 },
                shadowOpacity: gender === "" ? 0.08 : 0,
                shadowRadius: 2.5,
                elevation: gender === "" ? 2 : 0,
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: gender === "" ? "#2563EB" : "#64748B",
                }}
              >
                {t("allMatches") || "All Matches"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleGenderSegmentPress("Male")}
              style={{
                flex: 1,
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: gender === "Male" ? "#FFFFFF" : "transparent",
                borderRadius: 17,
                shadowColor: gender === "Male" ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 1.5 },
                shadowOpacity: gender === "Male" ? 0.08 : 0,
                shadowRadius: 2.5,
                elevation: gender === "Male" ? 2 : 0,
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: gender === "Male" ? "#2563EB" : "#64748B",
                }}
              >
                {t("grooms") || "Grooms"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleGenderSegmentPress("Female")}
              style={{
                flex: 1,
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: gender === "Female" ? "#FFFFFF" : "transparent",
                borderRadius: 17,
                shadowColor: gender === "Female" ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 1.5 },
                shadowOpacity: gender === "Female" ? 0.08 : 0,
                shadowRadius: 2.5,
                elevation: gender === "Female" ? 2 : 0,
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: gender === "Female" ? "#2563EB" : "#64748B",
                }}
              >
                {t("brides") || "Brides"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profile Pill Button */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("CreateMarriageProfile", {
                profile: myProfileId ? { id: myProfileId } : null,
              })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#F8FAFC",
              paddingLeft: 10,
              paddingRight: 4,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#DBEAFE",
              gap: 6,
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: "#1E293B",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.2,
              }}
            >
              Profile
            </Text>
            <Image
              source={{
                uri: myProfilePhoto
                  ? `${PHOTO_URL}${myProfilePhoto}`
                  : userPhoto
                  ? `${PHOTO_URL}${userPhoto}`
                  : "https://via.placeholder.com/100",
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#E2E8F0",
                borderWidth: 1.5,
                borderColor: "#2563EB",
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Row 3: Quick Tags Carousel */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 14,
              gap: 7,
            }}
          >
            {QUICK_TAGS.map((tag) => {
              const isSelected = activeTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => handleTagPress(tag)}
                  style={{
                    paddingHorizontal: 14,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSelected ? "#2563EB" : "#F8FAFC",
                    borderWidth: 1,
                    borderColor: isSelected ? "#2563EB" : "#E2E8F0",
                    shadowColor: isSelected ? "#2563EB" : "transparent",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isSelected ? 0.25 : 0,
                    shadowRadius: 2,
                    elevation: isSelected ? 2 : 0,
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: isSelected ? "700" : "600",
                      color: isSelected ? "#FFFFFF" : "#64748B",
                    }}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }} edges={[]} {...tabSwipe.panHandlers}>
      {/* LinkUp Global Header with Floating Tabs */}
      <LinkUpHeader
        currentTab="Marriage"
        headerAnim={headerAnim}
        user={user}
        onTabPress={(tab) => {
          if (tab === "Marriage") {
            animateHeader(false);
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }
        }}
        onPlusPress={() => {
          navigation.navigate("CreateMarriageProfile", { profile: null });
        }}
        tabSwipeHandlers={tabSwipe.panHandlers}
        statusBarHeight={statusBarHeight}
      />

      {loading && myProfileId === 0 ? (
        <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          <FlashList
            data={[1, 2, 3, 4, 5, 6]}
            renderItem={renderSkeletonCard}
            keyExtractor={(item) => item.toString()}
            numColumns={2}
            contentContainerStyle={{
              paddingTop: statusBarHeight + 116,
              paddingHorizontal: 6,
              paddingVertical: 6,
            }}
          />
        </View>
      ) : !myProfileId ? (
        // Gate: No profile created yet
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
            paddingTop: statusBarHeight + 116,
            backgroundColor: "#F8FAFC",
          }}
        >
          <View className="bg-white rounded-3xl p-8 items-center shadow-md border border-gray-100 w-full">
            <View className="bg-blue-100 p-5 rounded-full mb-5">
              <Ionicons name="heart-circle-outline" size={52} color="#2563EB" />
            </View>
            <Text className="text-xl font-extrabold text-blue-900 mb-2 text-center">
              {t("welcomeMatrimony")}
            </Text>
            <Text className="text-slate-500 text-sm text-center leading-5 mb-6">
              {t("browseProfilesMsg")}
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("CreateMarriageProfile", { profile: null })
              }
              className="bg-blue-600 w-full py-3.5 rounded-2xl items-center shadow-sm mb-3"
            >
              <Text className="text-white font-extrabold text-base">
                {t("createMyProfile")}
              </Text>
            </TouchableOpacity>
            <Text className="text-gray-400 text-xs text-center">
              {t("afterCreatingMsg")}
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, position: "relative" }}>
          <FlashList
            ref={listRef}
            data={profiles}
            renderItem={renderProfile}
            keyExtractor={(item, index) =>
              item.id ? item.id.toString() + "_" + index : index.toString()
            }
            numColumns={2}
            // @ts-ignore
            estimatedItemSize={350}
            ListHeaderComponent={renderListHeader}
            onScroll={handleFeedScroll}
            scrollEventThrottle={16}
            onEndReached={() => fetchProfiles(true)}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#2563EB"]}
                tintColor="#2563EB"
                progressViewOffset={statusBarHeight + 116}
              />
            }
            ListFooterComponent={
              isLoadMoreLoading ? (
                <View className="py-4">
                  <ActivityIndicator color="#2563EB" />
                </View>
              ) : null
            }
            contentContainerStyle={{
              paddingTop: statusBarHeight + 114,
              paddingHorizontal: 6,
              paddingBottom: 40,
              backgroundColor: "#F8FAFC",
            }}
            ListEmptyComponent={
              loading ? (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <ActivityIndicator size="large" color="#2563EB" />
                </View>
              ) : (
                <View className="items-center justify-center py-20">
                  <Image
                    source={{
                      uri: "https://cdn-icons-png.flaticon.com/512/7486/7486744.png",
                    }}
                    className="w-20 h-20 opacity-30 mb-4"
                  />
                  <Text className="text-slate-500 font-bold text-lg">
                    {t("noProfilesFound")}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1 text-center w-64">
                    {t("tryChangingFilters")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => fetchProfiles()}
                    className="mt-6 bg-blue-100 px-6 py-2 rounded-full"
                  >
                    <Text className="text-blue-600 font-bold text-xs">
                      {t("refresh")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />

          {filterVisible && (
            <>
              {/* Backdrop overlay */}
              <Animated.View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  zIndex: 200,
                  opacity: filterAnim,
                }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={toggleFilter}
                  style={{ flex: 1 }}
                />
              </Animated.View>

              {/* Floating Filter Panel */}
              <Animated.View
                style={{
                  position: "absolute",
                  top: statusBarHeight + 50,
                  left: 12,
                  right: 12,
                  backgroundColor: "white",
                  padding: 20,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 10,
                  zIndex: 201,
                  opacity: filterAnim,
                  transform: [
                    {
                      translateY: filterAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                    {
                      scale: filterAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1],
                      }),
                    },
                  ],
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    marginBottom: 8,
                    letterSpacing: 0.5,
                  }}
                >
                  {t("genderLabel")}
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}
                >
                  <TouchableOpacity
                    onPress={() => setGender("Male")}
                    style={{
                      flex: 1,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: gender === "Male" ? "#2563EB" : "#E2E8F0",
                      backgroundColor:
                        gender === "Male" ? "#2563EB" : "#F8FAFC",
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "bold",
                        color: gender === "Male" ? "white" : "#64748B",
                      }}
                    >
                      {t("groomMale")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setGender("Female")}
                    style={{
                      flex: 1,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: gender === "Female" ? "#db2777" : "#E2E8F0",
                      backgroundColor:
                        gender === "Female" ? "#db2777" : "#F8FAFC",
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "bold",
                        color: gender === "Female" ? "white" : "#64748B",
                      }}
                    >
                      {t("brideFemale")}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    marginBottom: 8,
                    letterSpacing: 0.5,
                  }}
                >
                  {t("ageRange")}
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#F8FAFC",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                    }}
                  >
                    <TextInput
                      placeholder={t("minAge")}
                      value={minAge}
                      onChangeText={setMinAge}
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: "#172554",
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#F8FAFC",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                    }}
                  >
                    <TextInput
                      placeholder={t("maxAge")}
                      value={maxAge}
                      onChangeText={setMaxAge}
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: "#172554",
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    marginBottom: 8,
                    letterSpacing: 0.5,
                  }}
                >
                  {t("locationEducation")}
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#F8FAFC",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#9ca3af"
                      style={{ marginRight: 4 }}
                    />
                    <TextInput
                      placeholder={t("cityPlaceholder")}
                      value={city}
                      onChangeText={setCity}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: "#172554",
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#F8FAFC",
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                    }}
                  >
                    <Ionicons
                      name="school-outline"
                      size={16}
                      color="#9ca3af"
                      style={{ marginRight: 4 }}
                    />
                    <TextInput
                      placeholder={t("degreePlaceholder")}
                      value={education}
                      onChangeText={setEducation}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        fontSize: 13,
                        color: "#172554",
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderColor: "#E2E8F0",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setGender("");
                      setCity("");
                      setEducation("");
                      setMinAge("");
                      setMaxAge("");
                    }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: "#2563EB",
                        fontSize: 13,
                        fontWeight: "bold",
                      }}
                    >
                      {t("resetAll")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      toggleFilter();
                      fetchProfiles();
                    }}
                    style={{
                      backgroundColor: "#2563EB",
                      paddingHorizontal: 24,
                      paddingVertical: 10,
                      borderRadius: 24,
                      shadowColor: "#2563EB",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 13,
                        fontWeight: "bold",
                      }}
                    >
                      {t("applyFilters")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default MarriageScreen;
