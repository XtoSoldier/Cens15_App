import React, { useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, Text, Surface, IconButton, TouchableRipple } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type MainMenuNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GRID_GAP = 12;
const PULL_THRESHOLD = 64;

interface MenuItem {
  title: string;
  icon: string;
  color: string;
  route: 'Alumnos' | 'Cursos' | 'Materias' | 'Docentes' | 'Novedades' | 'Anexos' | 'Horarios' | 'Autoridades';
  disabled?: boolean;
}

const menuItems: MenuItem[] = [
  { title: 'Alumnos', icon: 'account-group', color: '#000000', route: 'Alumnos' },
  { title: 'Cursos', icon: 'school', color: '#000000', route: 'Cursos' },
  { title: 'Materias', icon: 'book-open-variant', color: '#000000', route: 'Materias' },
  { title: 'Docentes', icon: 'glasses', color: '#000000', route: 'Docentes' },
  { title: 'Novedades', icon: 'newspaper', color: '#000000', route: 'Novedades', disabled: true },
  { title: 'Anexos', icon: 'map-marker-multiple', color: '#000000', route: 'Anexos', disabled: true },
  { title: 'Horarios', icon: 'calendar-clock', color: '#000000', route: 'Horarios', disabled: true },
  { title: 'Autoridades', icon: 'shield-account', color: '#000000', route: 'Autoridades', disabled: true },
];

const MainMenu: React.FC = () => {
  const navigation = useNavigation<MainMenuNavigationProp>();
  const [gridWidth, setGridWidth] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollOffset = useRef(0);
  const touchStartY = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);

  const columns = gridWidth >= 720 ? 4 : gridWidth >= 520 ? 3 : 2;
  const availableCardWidth = gridWidth > 0
    ? (gridWidth - GRID_GAP * (columns - 1)) / columns
    : 140;
  const cardWidth = Math.min(180, availableCardWidth);

  const handleMenuPress = (item: MenuItem) => {
    if (item.disabled) {
      return;
    }

    const route = item.route;
    navigation.navigate(route);
  };

  const updatePullDistance = (distance: number) => {
    pullDistanceRef.current = distance;
    setPullDistance(distance);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = Math.max(0, event.nativeEvent.contentOffset.y);
    if (scrollOffset.current > 0) touchStartY.current = null;
  };

  const handleTouchStart = (event: GestureResponderEvent) => {
    if (Platform.OS !== 'web' || refreshing || scrollOffset.current > 0) return;
    touchStartY.current = event.nativeEvent.pageY;
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    if (Platform.OS !== 'web' || touchStartY.current === null || scrollOffset.current > 0) return;
    const distance = Math.max(0, event.nativeEvent.pageY - touchStartY.current);
    updatePullDistance(Math.min(96, distance * 0.5));
  };

  const finishPull = () => {
    if (Platform.OS !== 'web') return;

    touchStartY.current = null;
    if (pullDistanceRef.current < PULL_THRESHOLD) {
      updatePullDistance(0);
      return;
    }

    setRefreshing(true);
    updatePullDistance(PULL_THRESHOLD);
    window.setTimeout(() => window.location.reload(), 250);
  };

  const cancelPull = () => {
    touchStartY.current = null;
    if (!refreshing) updatePullDistance(0);
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Image
          source={require('../../assets/img/cens_logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={styles.title}>
          Menú Principal
        </Text>
        <View style={styles.scrollArea}>
          <ScrollView
            style={[styles.menuScroll, Platform.OS === 'web' && styles.webMenuScroll]}
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={finishPull}
            onTouchCancel={cancelPull}
          >
            <View
              style={styles.grid}
              onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
            >
              {menuItems.map((item) => (
                <TouchableRipple
                  key={item.route}
                  onPress={() => handleMenuPress(item)}
                  disabled={item.disabled}
                  style={[styles.card, item.disabled && styles.disabledCard, { width: cardWidth }]}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.iconBackground}>
                      <IconButton
                        icon={item.icon}
                        size={cardWidth < 150 ? 30 : 36}
                        iconColor={item.disabled ? '#9E9E9E' : item.color}
                        style={styles.cardIcon}
                      />
                    </View>
                    <Text style={[styles.cardText, { color: item.disabled ? '#8A8A8A' : item.color }]}>
                      {item.title}
                    </Text>
                    {item.disabled ? <Text style={styles.disabledText}>Próximamente</Text> : null}
                  </View>
                </TouchableRipple>
              ))}
            </View>
          </ScrollView>
          {(pullDistance > 0 || refreshing) && (
            <View pointerEvents="none" style={styles.pullIndicator}>
              {refreshing ? (
                <ActivityIndicator size="small" color="#1F5FAF" />
              ) : (
                <Text style={styles.pullIndicatorText}>
                  {pullDistance >= PULL_THRESHOLD ? 'Soltá para actualizar' : 'Deslizá para actualizar'}
                </Text>
              )}
            </View>
          )}
        </View>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  surface: {
    flex: 1,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 0,
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 16,
    marginBottom: 8,
  },
  title: {
    marginBottom: 16,
    color: '#1F5FAF',
  },
  scrollArea: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    position: 'relative',
  },
  menuScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  webMenuScroll: {
    overscrollBehaviorY: 'contain',
    touchAction: 'pan-y',
  } as any,
  menuScrollContent: {
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    gap: GRID_GAP,
  },
  card: {
    aspectRatio: 1,
    maxWidth: 180,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    padding: 8,
  },
  disabledCard: {
    backgroundColor: '#ECEFF1',
    borderColor: '#CFD8DC',
    elevation: 0,
    opacity: 0.75,
  },
  cardContent: {
    alignItems: 'center',
  },
  iconBackground: {
    marginBottom: 4,
  },
  cardIcon: {
    margin: 0,
    padding: 0,
  },
  cardText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  disabledText: {
    fontSize: 10,
    color: '#9E9E9E',
    marginTop: 4,
  },
  pullIndicator: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
  },
  pullIndicatorText: {
    color: '#1F5FAF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MainMenu;
