import React from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { Text, Button, Surface, IconButton, TouchableRipple } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAppDispatch } from '../hooks/useRedux';
import { logout } from '../slices/appSlice';
import { clearUserData } from '../utils/storage';

type MainMenuNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface MenuItem {
  title: string;
  icon: string;
  color: string;
  route: 'Alumnos' | 'Cursos' | 'Materias' | 'Docentes' | 'Novedades' | 'Anexos' | 'Horarios' | 'Autoridades';
}

const menuItems: MenuItem[] = [
  { title: 'Alumnos', icon: 'account-group', color: '#000000', route: 'Alumnos' },
  { title: 'Cursos', icon: 'school', color: '#000000', route: 'Cursos' },
  { title: 'Materias', icon: 'book-open-variant', color: '#000000', route: 'Materias' },
  { title: 'Docentes', icon: 'glasses', color: '#000000', route: 'Docentes' },
  { title: 'Novedades', icon: 'newspaper', color: '#000000', route: 'Novedades' },
  { title: 'Anexos', icon: 'map-marker-multiple', color: '#000000', route: 'Anexos' },
  { title: 'Horarios', icon: 'calendar-clock', color: '#000000', route: 'Horarios' },
  { title: 'Autoridades', icon: 'shield-account', color: '#000000', route: 'Autoridades' },
];

const MainMenu: React.FC = () => {
  const navigation = useNavigation<MainMenuNavigationProp>();
  const dispatch = useAppDispatch();

  const handleMenuPress = (route: MenuItem['route']) => {
    navigation.navigate(route);
  };

  const handleLogout = () => {
    clearUserData();
    dispatch(logout());
    navigation.navigate('Login');
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
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableRipple
              key={index}
              onPress={() => handleMenuPress(item.route)}
              style={[styles.card, { width: cardWidth }]}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconBackground}>
                  <IconButton
                    icon={item.icon}
                    size={36}
                    iconColor={item.color}
                    style={styles.cardIcon}
                  />
                </View>
                <Text style={[styles.cardText, { color: item.color }]}>
                  {item.title}
                </Text>
              </View>
            </TouchableRipple>
          ))}
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
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 16,
    marginBottom: 8,
  },
  title: {
    marginBottom: 24,
    color: '#0000',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    alignContent: 'flex-start',
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
    marginBottom: 16,
    elevation: 2,
    padding: 8,
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
  logoutButton: {
    width: '100%',
    marginTop: 0,
    marginBottom: 24,
    backgroundColor: '#1F5FAF',
  },
});

export default MainMenu;
