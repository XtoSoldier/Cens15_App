import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import env from '../services/env';

const API_CHECK_INTERVAL_MS = 2000;
const API_CHECK_TIMEOUT_MS = 1500;

const EnvironmentRibbon = () => {
  const [apiStatus, setApiStatus] = useState<'checking' | 'up' | 'down'>('checking');
  const swaggerUrl = `${env.API_URL.replace(/\/api\/?$/, '')}/swagger/index.html`;

  useEffect(() => {
    if (!env.SHOW_ENV_INDICATOR) return undefined;

    let mounted = true;
    const checkApi = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_CHECK_TIMEOUT_MS);
      try {
        await fetch(`${env.API_URL}/auth/login?status=${Date.now()}`, {
          ...(Platform.OS === 'web' ? { mode: 'no-cors' as RequestMode } : {}),
          cache: 'no-store',
          signal: controller.signal,
        });
        if (mounted) setApiStatus('up');
      } catch {
        if (mounted) setApiStatus('down');
      } finally {
        clearTimeout(timeout);
      }
    };

    checkApi();
    const interval = setInterval(checkApi, API_CHECK_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!env.SHOW_ENV_INDICATOR || !env.ENV_LABEL) return null;

  const statusText = apiStatus === 'up' ? 'API ACTIVA' : apiStatus === 'down' ? 'API CAIDA' : 'VERIFICANDO';
  const statusStyle = apiStatus === 'up' ? styles.apiUp : apiStatus === 'down' ? styles.apiDown : styles.apiChecking;

  return (
    <View pointerEvents="box-none" style={styles.corner}>
      <TouchableOpacity
        activeOpacity={0.8}
        accessibilityRole="link"
        accessibilityLabel={`${statusText}. Abrir Swagger de ${env.API_URL}`}
        onPress={() => Linking.openURL(swaggerUrl)}
        style={[styles.ribbon, statusStyle]}
      >
        <Text style={styles.label}>{statusText} · {env.ENV_LABEL}</Text>
        <Text style={styles.apiUrl} numberOfLines={1}>{env.API_URL}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 172,
    height: 172,
    overflow: 'hidden',
    zIndex: 10000,
    elevation: 24,
  },
  ribbon: {
    position: 'absolute',
    top: 39,
    left: -59,
    width: 240,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
  },
  apiChecking: {
    backgroundColor: '#F59E0B',
  },
  apiUp: {
    backgroundColor: '#2E7D32',
  },
  apiDown: {
    backgroundColor: '#D32F2F',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  apiUrl: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 1,
    maxWidth: 215,
  },
});

export default EnvironmentRibbon;
