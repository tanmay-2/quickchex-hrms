// ==============================================================================
// QUICKCHEX HRMS MOBILE APP - MODERNUI.JS
// Path: mobile-app/src/components/ModernUI.js
// Purpose: Premium modern mobile UI components (Circular Progress, Swipe-to-Punch,
//          Haptics, Weekly Strip, Skeleton Shimmer, Bottom Sheet)
// ==============================================================================

import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Modal,
  Platform,
  Vibration,
} from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { COLORS, RADII } from '../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── 1. SAFE HAPTIC FEEDBACK HELPER ──────────────────────────────────────────
export const triggerHaptic = (type = 'light') => {
  try {
    if (type === 'selection') {
      Haptics.selectionAsync();
    } else if (type === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (type === 'heavy') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    try {
      Vibration.vibrate(15);
    } catch {}
  }
};

// ─── 2. LIVE CIRCULAR WORK-HOUR PROGRESS RING ─────────────────────────────────
export function WorkHourProgressRing({
  hoursDecimal = 0,
  targetHours = 9,
  size = 130,
  strokeWidth = 10,
  isPunchedIn = false,
  isPunchedOut = false,
}) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(Math.max(hoursDecimal / targetHours, 0), 1);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progressRatio,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [progressRatio]);

  const strokeDashoffset = circumference - circumference * progressRatio;
  const isGoalReached = hoursDecimal >= targetHours;
  const progressColor = isGoalReached ? '#10b981' : isPunchedIn ? '#6366f1' : '#d97706';

  const hrs = Math.floor(hoursDecimal);
  const mins = Math.round((hoursDecimal - hrs) * 60);

  return (
    <View style={[ringStyles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={progressColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={isGoalReached ? '#059669' : '#818cf8'} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Dynamic Progress Arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#ringGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </G>
      </Svg>

      {/* Center Time & Goal */}
      <View style={ringStyles.centerWrap}>
        <Text style={[ringStyles.timeText, { color: progressColor }]}>
          {hrs}h {mins < 10 ? `0${mins}` : mins}m
        </Text>
        <Text style={ringStyles.goalSub}>
          {isGoalReached ? '🎉 9h Goal Met' : isPunchedIn ? `of ${targetHours}h goal` : 'Not punched'}
        </Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  goalSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
});

// ─── 3. SWIPE-TO-PUNCH SLIDER (IOS / ANDROID NATIVE) ─────────────────────────
export function SwipeToPunchSlider({
  isPunchedIn,
  isPunchedOut,
  onPunchTrigger,
  loading = false,
}) {
  const pan = useRef(new Animated.Value(0)).current;
  const [sliderWidth, setSliderWidth] = useState(SCREEN_WIDTH - 64);
  const thumbSize = 48;
  const maxDrag = Math.max(sliderWidth - thumbSize - 8, 100);

  const disabled = loading || isPunchedOut;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0 && gesture.dx <= maxDrag) {
          pan.setValue(gesture.dx);
          if (gesture.dx > maxDrag * 0.75) {
            triggerHaptic('medium');
          }
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx >= maxDrag * 0.75) {
          // Slide Completed
          triggerHaptic('success');
          Animated.timing(pan, {
            toValue: maxDrag,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            onPunchTrigger();
            // Reset position after action
            setTimeout(() => {
              Animated.spring(pan, {
                toValue: 0,
                friction: 6,
                useNativeDriver: true,
              }).start();
            }, 600);
          });
        } else {
          // Snap back
          Animated.spring(pan, {
            toValue: 0,
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Text and theme based on state
  let label = 'Slide to Punch In';
  let themeColor = '#6366f1';
  let thumbEmoji = '👉';

  if (isPunchedOut) {
    label = 'Attendance Completed for Today';
    themeColor = '#10b981';
    thumbEmoji = '✓';
  } else if (isPunchedIn) {
    label = 'Slide to Punch Out';
    themeColor = '#f59e0b';
    thumbEmoji = '🏃';
  }

  return (
    <View
      style={[
        sliderStyles.track,
        {
          backgroundColor: isPunchedOut ? '#ecfdf5' : isPunchedIn ? '#fffbeb' : '#eef2ff',
          borderColor: isPunchedOut ? '#a7f3d0' : isPunchedIn ? '#fde68a' : '#c7d2fe',
        },
      ]}
      onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
    >
      <Text style={[sliderStyles.label, { color: themeColor }]}>
        {loading ? 'Recording punch...' : label}
      </Text>

      {!isPunchedOut && (
        <Animated.View
          style={[
            sliderStyles.thumb,
            {
              backgroundColor: themeColor,
              transform: [{ translateX: pan }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Text style={sliderStyles.thumbIcon}>{loading ? '⏳' : thumbEmoji}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  track: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginVertical: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  thumb: {
    position: 'absolute',
    left: 4,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  thumbIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
});

// ─── 4. MINI 7-DAY ATTENDANCE STRIP ──────────────────────────────────────────
export function WeeklyAttendanceStrip({ selectedDate, onSelectDate }) {
  const [days, setDays] = useState([]);

  useEffect(() => {
    const list = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = d.toLocaleDateString([], { weekday: 'narrow' });
      const dateNum = d.getDate();
      const isToday = i === 0;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      // Status indicator: Green for week days, blue for weekend, etc.
      let statusDot = '#10b981';
      if (isWeekend) statusDot = '#94a3b8';

      list.push({
        dateObj: d,
        dayName,
        dateNum,
        isToday,
        isWeekend,
        statusDot,
        key: d.toISOString().split('T')[0],
      });
    }
    setDays(list);
  }, []);

  return (
    <View style={stripStyles.container}>
      <Text style={stripStyles.title}>This Week's Attendance</Text>
      <View style={stripStyles.row}>
        {days.map((item) => {
          const isSelected = selectedDate === item.key || (item.isToday && !selectedDate);
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                stripStyles.dayBox,
                isSelected && stripStyles.dayBoxActive,
              ]}
              onPress={() => {
                triggerHaptic('selection');
                onSelectDate?.(item);
              }}
              activeOpacity={0.7}
            >
              <Text style={[stripStyles.dayName, isSelected && stripStyles.textActive]}>
                {item.dayName}
              </Text>
              <Text style={[stripStyles.dateNum, isSelected && stripStyles.textActive]}>
                {item.dateNum}
              </Text>
              <View style={[stripStyles.statusDot, { backgroundColor: item.statusDot }]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const stripStyles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginVertical: 8,
    shadowColor: '#64748b',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayBox: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    minWidth: 40,
  },
  dayBoxActive: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  dateNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 2,
  },
  textActive: {
    color: '#ffffff',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 5,
  },
});

// ─── 5. SHIMMER SKELETON PLACEHOLDER ─────────────────────────────────────────
export function SkeletonPlaceholder({ style }) {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[skeletonStyles.base, style, { opacity: opacityAnim }]} />;
}

const skeletonStyles = StyleSheet.create({
  base: {
    backgroundColor: '#cbd5e1',
    borderRadius: 12,
  },
});

// ─── 6. INTERACTIVE BOTTOM SHEET MODAL ────────────────────────────────────────
export function QuickActionBottomSheet({ visible, onClose, title, subtitle, children }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={sheetStyles.overlay}
        activeOpacity={1}
        onPress={() => {
          triggerHaptic('light');
          onClose();
        }}
      >
        <TouchableOpacity activeOpacity={1} style={sheetStyles.sheet}>
          {/* Drag Handle */}
          <View style={sheetStyles.handle} />

          {/* Header */}
          <View style={sheetStyles.header}>
            <View>
              <Text style={sheetStyles.title}>{title}</Text>
              {subtitle && <Text style={sheetStyles.subtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                onClose();
              }}
              style={sheetStyles.closeBtn}
            >
              <Text style={sheetStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={sheetStyles.content}>{children}</View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  content: {
    marginTop: 4,
  },
});
