import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { installWebPullToRefresh, PULL_THRESHOLD } from '../utils/webPullToRefresh';

export default function WebPullToRefresh() {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const root = document.getElementById('root');
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = installWebPullToRefresh(root, setDistance, () => {
      setRefreshing(true);
      timer = setTimeout(() => window.location.reload(), 250);
    });
    return () => { cleanup(); clearTimeout(timer); };
  }, []);

  if (Platform.OS !== 'web' || (!distance && !refreshing)) return null;

  return (
    <View pointerEvents="none" style={styles.indicator} accessibilityLiveRegion="polite">
      {refreshing ? <ActivityIndicator size="small" color="#1F5FAF" /> : null}
      <Text style={styles.text}>
        {refreshing ? 'Actualizando...' : distance >= PULL_THRESHOLD ? 'Soltá para actualizar' : 'Deslizá para actualizar'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    zIndex: 1000,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.16)',
  },
  text: { color: '#1F5FAF', fontSize: 12, fontWeight: '600' },
});
