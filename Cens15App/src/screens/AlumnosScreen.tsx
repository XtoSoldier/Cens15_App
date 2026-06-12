import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Text, Surface, IconButton, TouchableRipple } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type AlumnosScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;
const isWeb = Platform.OS === 'web';
const responsiveCardWidth = isWeb ? 180 : cardWidth;

interface AlumnoMenuItem {
  title: string;
  icon: string;
  color: string;
  route: 'AlumnosListado' | 'Inscripcion';
}

const alumnoMenuItems: AlumnoMenuItem[] = [
  { title: 'Listado', icon: 'format-list-bulleted', color: '#000000', route: 'AlumnosListado' },
  { title: 'Inscripción', icon: 'pencil-plus', color: '#000000', route: 'Inscripcion' },
];

const AlumnosScreen: React.FC = () => {
  const navigation = useNavigation<AlumnosScreenNavigationProp>();

  const handleMenuPress = (route: AlumnoMenuItem['route']) => {
    navigation.navigate(route);
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Text variant="headlineMedium" style={styles.title}>
          Alumnos
        </Text>
        <View style={[styles.grid, isWeb && styles.gridWeb]}>
          {alumnoMenuItems.map((item, index) => (
            <TouchableRipple
              key={index}
              onPress={() => handleMenuPress(item.route)}
              style={[styles.card, { width: responsiveCardWidth }, isWeb && styles.cardWeb]}
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
    backgroundColor: '#FFFFFF',
  },
  title: {
    marginTop: 16,
    marginBottom: 24,
    color: '#1F5FAF',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    alignContent: 'flex-start',
  },
  gridWeb: {
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
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
  cardWeb: {
    marginHorizontal: 12,
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
});

export default AlumnosScreen;
