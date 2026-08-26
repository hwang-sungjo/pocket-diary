import type { PropsWithChildren, ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

interface ScreenProps extends PropsWithChildren {
  title: string;
  description: string;
  action?: ReactNode;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}

export function Screen({
  title,
  description,
  action,
  children,
  contentContainerStyle,
}: ScreenProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      >
        <View style={styles.header}>
          <View style={styles.headingGroup}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.description}>{description}</Text>
          </View>
          {action}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const sharedStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    alignSelf: 'center',
    gap: 20,
    maxWidth: 920,
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 24,
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  headingGroup: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});

