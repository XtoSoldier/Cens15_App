import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Avatar, Divider } from 'react-native-paper';

interface Autoridad {
  id: number;
  nombre: string;
  cargo: string;
  email: string;
}

const AUTORIDADES: Autoridad[] = [
  { id: 1, nombre: 'Lic. María Elena Suárez', cargo: 'Directora', email: 'directora@cens15.edu.ar' },
  { id: 2, nombre: 'Prof. Carlos A. Pereyra', cargo: 'Vicedirector', email: 'vicedireccion@cens15.edu.ar' },
  { id: 3, nombre: 'Sra. Ana M. Fernández', cargo: 'Secretaria Académica', email: 'secretaria@cens15.edu.ar' },
  { id: 4, nombre: 'Prof. Roberto D. Gómez', cargo: 'Jefe U.T.A.', email: 'uta@cens15.edu.ar' },
  { id: 5, nombre: 'Sra. Laura V. Martínez', cargo: 'Secretaría Administrativa', email: 'admin@cens15.edu.ar' },
  { id: 6, nombre: 'Prof. Susana R. López', cargo: 'Coordinadora Pedagógica', email: 'pedagogia@cens15.edu.ar' },
];

const getInitials = (nombre: string) => {
  const parts = nombre.replace(/Lic\.|Prof\.|Sra\.|Dr\./g, '').trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const AutoridadesScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.headerTitulo}>
            Autoridades
          </Text>
          <Text style={styles.headerSubtitulo}>
            Equipo de conducción institucional
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {AUTORIDADES.map((autoridad, index) => (
            <View key={autoridad.id}>
              <View style={styles.autoridadItem}>
                <Avatar.Text
                  size={48}
                  label={getInitials(autoridad.nombre)}
                  style={[
                    styles.avatar,
                    autoridad.cargo.includes('Directora') ? styles.avatarDirectora : styles.avatarGenerico,
                  ]}
                />
                <View style={styles.autoridadInfo}>
                  <Text style={styles.autoridadNombre}>{autoridad.nombre}</Text>
                  <View style={styles.cargoBadge}>
                    <Text style={styles.autoridadCargo}>{autoridad.cargo}</Text>
                  </View>
                  <Text style={styles.autoridadEmail}>{autoridad.email}</Text>
                </View>
              </View>
              {index < AUTORIDADES.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
          <View style={styles.bottomSpacer} />
        </ScrollView>
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
    padding: 20,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitulo: {
    color: '#1F5FAF',
    fontWeight: '700',
  },
  headerSubtitulo: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 4,
  },
  autoridadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatar: {
    backgroundColor: '#E0E0E0',
  },
  avatarDirectora: {
    backgroundColor: '#1F5FAF',
  },
  avatarGenerico: {
    backgroundColor: '#F28C28',
  },
  autoridadInfo: {
    flex: 1,
    marginLeft: 14,
  },
  autoridadNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  cargoBadge: {
    backgroundColor: '#F0F4FA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  autoridadCargo: {
    fontSize: 11,
    color: '#1F5FAF',
    fontWeight: '600',
  },
  autoridadEmail: {
    fontSize: 12,
    color: '#6B6B6B',
  },
  divider: {
    backgroundColor: '#E8E8E8',
    marginHorizontal: 20,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default AutoridadesScreen;
