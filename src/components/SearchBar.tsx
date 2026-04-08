import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import GlassView from './GlassView';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  onClear,
  placeholder = 'Search spots...',
}: SearchBarProps) {
  const [text, setText] = useState('');
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [slideAnim]);

  const handleFocus = () => {
    Haptics.selectionAsync();
  };

  const handleClear = () => {
    setText('');
    onClear();
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onSearch(trimmed);
    }
  };

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ translateY: slideAnim }] }]}
    >
      <GlassView intensity={50} tint="dark" style={styles.blur}>
        <View style={styles.inputContainer} accessible accessibilityRole="search">
          <Feather
            name="search"
            size={16}
            color={colors.dark.text2}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.dark.text2}
            onFocus={handleFocus}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={placeholder}
            accessibilityHint="Type to search for spots"
          />
          {text.length > 0 && (
            <Pressable
              onPress={handleClear}
              style={styles.clearButton}
              android_ripple={{ color: 'rgba(46,196,160,0.15)', borderless: true }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x" size={16} color={colors.dark.text2} />
            </Pressable>
          )}
        </View>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  blur: {
    padding: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    padding: 0,
    ...(Platform.OS === 'android' && { textAlignVertical: 'center' as const }),
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
