import { Text, View } from 'react-native';

import { sharedStyles } from '@/components/screen';

interface PlaceholderCardProps {
  title: string;
  children: string;
}

export function PlaceholderCard({ title, children }: PlaceholderCardProps) {
  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.cardTitle}>{title}</Text>
      <Text style={sharedStyles.body}>{children}</Text>
    </View>
  );
}

