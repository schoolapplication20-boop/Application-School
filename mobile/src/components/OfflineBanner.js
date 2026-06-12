import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/** Shown above a screen's content when its data could not be refreshed from the network. */
export default function OfflineBanner({ visible }) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You're offline — showing saved data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#fef3c7', paddingVertical: 6, alignItems: 'center' },
  text: { color: '#92400e', fontSize: 12, fontWeight: '600' },
});
