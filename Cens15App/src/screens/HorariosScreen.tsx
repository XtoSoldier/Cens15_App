import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Divider, Chip } from 'react-native-paper';

interface HorarioClase {
  hora: string;
  materia: string;
  docente: string;
  aula: string;
}

interface HorarioDia {
  dia: string;
  clases: HorarioClase[];
}

interface HorarioCurso {
  curso: string;
  division: string;
  horarioSemanal: HorarioDia[];
}

const HORARIO_1G: HorarioCurso = {
  curso: '1°',
  division: 'G',
  horarioSemanal: [
    {
      dia: 'Lunes',
      clases: [
        { hora: '08:00 - 09:30', materia: 'Matemática', docente: 'Prof. García', aula: 'Aula 3' },
        { hora: '09:30 - 11:00', materia: 'Lengua', docente: 'Prof. Rodríguez', aula: 'Aula 3' },
        { hora: '11:15 - 12:45', materia: 'Historia', docente: 'Prof. López', aula: 'Aula 5' },
      ],
    },
    {
      dia: 'Martes',
      clases: [
        { hora: '08:00 - 09:30', materia: 'Inglés', docente: 'Prof. Torres', aula: 'Aula 3' },
        { hora: '09:30 - 11:00', materia: 'Biología', docente: 'Prof. Martínez', aula: 'Lab. 1' },
        { hora: '11:15 - 12:45', materia: 'Educación Física', docente: 'Prof. Fernández', aula: 'Gimnasio' },
      ],
    },
    {
      dia: 'Miércoles',
      clases: [
        { hora: '08:00 - 09:30', materia: 'Geografía', docente: 'Prof. Ruiz', aula: 'Aula 3' },
        { hora: '09:30 - 11:00', materia: 'Matemática', docente: 'Prof. García', aula: 'Aula 3' },
        { hora: '11:15 - 12:45', materia: 'Arte', docente: 'Prof. Díaz', aula: 'Taller' },
      ],
    },
    {
      dia: 'Jueves',
      clases: [
        { hora: '08:00 - 09:30', materia: 'Física', docente: 'Prof. Sánchez', aula: 'Lab. 2' },
        { hora: '09:30 - 11:00', materia: 'Lengua', docente: 'Prof. Rodríguez', aula: 'Aula 3' },
        { hora: '11:15 - 12:45', materia: 'Informática', docente: 'Prof. Morales', aula: 'Lab. Inf.' },
      ],
    },
    {
      dia: 'Viernes',
      clases: [
        { hora: '08:00 - 09:30', materia: 'Química', docente: 'Prof. Herrera', aula: 'Lab. 1' },
        { hora: '09:30 - 11:00', materia: 'Historia', docente: 'Prof. López', aula: 'Aula 5' },
        { hora: '11:15 - 12:45', materia: 'Música', docente: 'Prof. Castro', aula: 'Sala Mus.' },
      ],
    },
  ],
};

const HorariosScreen: React.FC = () => {
  const [selectedDia, setSelectedDia] = React.useState<string>('Lunes');

  const dias = HORARIO_1G.horarioSemanal.map(h => h.dia);

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <View style={styles.cursoHeader}>
          <Text variant="titleLarge" style={styles.cursoTitulo}>
            {HORARIO_1G.curso}° «{HORARIO_1G.division}»
          </Text>
          <Text style={styles.cursoSubtitulo}>
            Horario semanal — Turno Mañana
          </Text>
        </View>

        <View style={styles.diaTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dias.map(dia => (
              <Chip
                key={dia}
                selected={selectedDia === dia}
                onPress={() => setSelectedDia(dia)}
                style={[
                  styles.diaChip,
                  selectedDia === dia && styles.diaChipActive,
                ]}
                textStyle={[
                  styles.diaChipText,
                  selectedDia === dia && styles.diaChipTextActive,
                ]}
                mode="outlined"
              >
                {dia}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <Divider />

        <ScrollView style={styles.clasesScroll} showsVerticalScrollIndicator={false}>
          {HORARIO_1G.horarioSemanal
            .find(h => h.dia === selectedDia)
            ?.clases.map((clase, idx) => (
              <View key={idx}>
                <View style={styles.claseCard}>
                  <View style={styles.claseHoraBadge}>
                    <Text style={styles.claseHora}>{clase.hora}</Text>
                  </View>
                  <View style={styles.claseInfo}>
                    <Text style={styles.claseMateria}>{clase.materia}</Text>
                    <Text style={styles.claseDocente}>{clase.docente}</Text>
                    <View style={styles.claseAulaRow}>
                      <Text style={styles.claseAulaLabel}>Aula:</Text>
                      <Text style={styles.claseAula}>{clase.aula}</Text>
                    </View>
                  </View>
                </View>
                {idx < HORARIO_1G.horarioSemanal.find(h => h.dia === selectedDia)!.clases.length - 1 && (
                  <Divider style={styles.claseDivider} />
                )}
              </View>
            ))}
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
  cursoHeader: {
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  cursoTitulo: {
    color: '#1F5FAF',
    fontWeight: '700',
  },
  cursoSubtitulo: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 2,
  },
  diaTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  diaChip: {
    marginRight: 8,
    borderColor: '#BDBDBD',
  },
  diaChipActive: {
    backgroundColor: '#1F5FAF',
    borderColor: '#1F5FAF',
  },
  diaChipText: {
    color: '#6B6B6B',
    fontSize: 13,
  },
  diaChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clasesScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  claseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  claseHoraBadge: {
    backgroundColor: '#F0F4FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
  },
  claseHora: {
    fontSize: 12,
    color: '#1F5FAF',
    fontWeight: '600',
  },
  claseInfo: {
    flex: 1,
  },
  claseMateria: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 2,
  },
  claseDocente: {
    fontSize: 13,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  claseAulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  claseAulaLabel: {
    fontSize: 11,
    color: '#9E9E9E',
    marginRight: 4,
  },
  claseAula: {
    fontSize: 11,
    color: '#F28C28',
    fontWeight: '600',
  },
  claseDivider: {
    backgroundColor: '#E8E8E8',
  },
});

export default HorariosScreen;
