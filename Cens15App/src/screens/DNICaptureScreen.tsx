import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

const { width, height } = Dimensions.get('window');

type DNICaptureScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DNICapturePhoto'>;

const DNICaptureScreen: React.FC = () => {
  const navigation = useNavigation<DNICaptureScreenNavigationProp>();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [scanning, setScanning] = useState(false);
  const hasScannedRef = useRef(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocused) return;

    if (hasScannedRef.current) {
      navigation.goBack();
      return;
    }

    hasScannedRef.current = false;
    setScanning(false);
  }, [isFocused, navigation]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const scannerLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(height * 0.15), height * 0.15],
  });

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;
      setScanning(true);

      const parts = data.split('@');
      if (parts.length >= 7) {
        const scannedData = {
          dni: parts[4],
          apellido: parts[1],
          nombre: parts[2],
          sexo: parts[3] === 'M' ? 'Varon' : parts[3] === 'F' ? 'Mujer' : '',
          fechaNacimiento: parts[6],
        };
        navigation.navigate('Inscripcion', { scannedData } as any);
      } else {
        Alert.alert(
          'DNI no reconocido',
          'No se pudo leer el DNI. Asegurate de mostrar el código de barras del reverso.'
        );
        setScanning(false);
      }
    },
    [navigation, scanning]
  );

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((current) => (current === 'off' ? 'on' : 'off'));
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1F5FAF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>
          Necesitamos permiso para usar la cámara
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Conceder permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        key={isFocused ? 'active' : 'inactive'}
        style={styles.camera}
        facing={facing}
        flash={flash}
        onBarcodeScanned={handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['pdf417', 'qr', 'code128'],
        }}
      >
        {/* Scanner line overlay */}
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerGuide}>
            <View style={styles.scannerFrame} />
            <Animated.View
              style={[
                styles.scannerLine,
                { transform: [{ translateY: scannerLineTranslateY }] },
              ]}
            />
          </View>
          <Text style={styles.guideText}>Alineá el código de barras del DNI</Text>
        </View>

        {/* Top controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Text style={styles.controlIcon}>
              {flash === 'on' ? '⚡' : '⚡O'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
            <Text style={styles.controlIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Loading overlay while scanning */}
        {scanning && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        )}
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  permissionButton: {
    backgroundColor: '#1F5FAF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerGuide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: width * 0.85,
    height: height * 0.3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 4,
  },
  scannerLine: {
    position: 'absolute',
    width: width * 0.85,
    height: 2,
    backgroundColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  guideText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  controlIcon: {
    fontSize: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
});

export default DNICaptureScreen;
