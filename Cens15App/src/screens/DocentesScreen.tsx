import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type DocentesMenuNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Docentes'>;

const DocentesScreen: React.FC = () => {
  const navigation = useNavigation<DocentesMenuNavigationProp>();

  const options = [
    {
      title: 'Listado de Docentes',
      subtitle: 'Consultar datos y materias asignadas',
      icon: 'account-group',
      route: 'DocentesListado' as const,
    },
    {
      title: 'Calificar',
      subtitle: 'Cargar notas por materia y curso',
      icon: 'pencil',
      route: 'DocenteCalificar' as const,
    },
  ];

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Docentes
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.route}
              onPress={() => navigation.navigate(opt.route)}
              style={styles.optionCard}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <IconButton icon={opt.icon} size={40} iconColor="#1F5FAF" style={styles.optionIconButton} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
              </View>
              <IconButton icon="chevron-right" size={20} iconColor="#BDBDBD" style={styles.optionArrow} />
            </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    color: '#1F5FAF',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
  },
  optionIcon: {
    marginRight: 4,
  },
  optionIconButton: {
    margin: 0,
    padding: 0,
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6B6B6B',
  },
  optionArrow: {
    margin: 0,
    padding: 0,
  },
});

export default DocentesScreen;
