import React, { useCallback } from 'react';
import {
  ActionSheetIOS,
  Platform,
  Alert,
  TouchableOpacity,
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  /** Use long-press to trigger instead of tap (default: false) */
  longPress?: boolean;
  /** Title shown on iOS ActionSheet and Android modal */
  title?: string;
}

/**
 * Cross-platform context menu.
 * - iOS: native ActionSheetIOS for authentic UIKit feel
 * - Android: custom dark-themed modal menu
 */
export default function ContextMenu({ items, children, longPress = false, title }: ContextMenuProps) {
  const [androidVisible, setAndroidVisible] = React.useState(false);

  const showMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS === 'ios') {
      const options = [...items.map((i) => i.label), 'Cancel'];
      const destructiveIndices = items
        .map((item, idx) => (item.destructive ? idx : -1))
        .filter((idx) => idx >= 0);

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: destructiveIndices.length === 1 ? destructiveIndices[0] : undefined,
          title: title,
          userInterfaceStyle: 'dark',
        },
        (buttonIndex) => {
          if (buttonIndex < items.length) {
            items[buttonIndex].onPress();
          }
        },
      );
    } else {
      setAndroidVisible(true);
    }
  }, [items, title]);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={longPress ? undefined : showMenu}
        onLongPress={longPress ? showMenu : undefined}
        delayLongPress={400}
      >
        {children}
      </TouchableOpacity>

      {/* Android modal menu */}
      {Platform.OS === 'android' && (
        <Modal
          visible={androidVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAndroidVisible(false)}
          statusBarTranslucent
        >
          <Pressable style={styles.overlay} onPress={() => setAndroidVisible(false)}>
            <Pressable style={styles.menuContainer} onPress={(e) => e.stopPropagation()}>
              {title && <Text style={styles.menuTitle}>{title}</Text>}
              {items.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.menuItem, idx < items.length - 1 && styles.menuItemBorder]}
                  onPress={() => {
                    setAndroidVisible(false);
                    // Small delay to let modal close before action
                    setTimeout(() => item.onPress(), 150);
                  }}
                  activeOpacity={0.7}
                >
                  {item.icon && (
                    <Feather
                      name={item.icon as any}
                      size={18}
                      color={item.destructive ? colors.red : colors.dark.text}
                    />
                  )}
                  <Text
                    style={[
                      styles.menuItemText,
                      item.destructive && styles.menuItemTextDestructive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAndroidVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingBottom: 32,
    paddingHorizontal: spacing.md,
  },
  menuContainer: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  menuTitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.dark.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.dark.bg3,
  },
  menuItemText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark.text,
  },
  menuItemTextDestructive: {
    color: colors.red,
  },
  cancelBtn: {
    borderTopWidth: 0.5,
    borderTopColor: colors.dark.border,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.dark.bg3,
  },
  cancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.text2,
  },
});
