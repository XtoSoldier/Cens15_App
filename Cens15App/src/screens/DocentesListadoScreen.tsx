import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface, Avatar, Divider, IconButton, Chip, Button } from 'react-native-paper';
import { getDocentes, DocenteDto } from '../services/docenteService';

const getInitials = (apellidos: string, nombres: string) => {
  const a = apellidos?.trim() || '';
  const n = nombres?.trim() || '';
  if (a && n) return `${a[0]}${n[0]}`.toUpperCase();
  if (a) return a[0].toUpperCase();
  if (n) return n[0].toUpperCase();
  return '?';
};

const DocentesListadoScreen: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [docentes, setDocentes] = useState<DocenteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDocentes();
      setDocentes(data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar docentes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1F5FAF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <IconButton icon="alert-circle" size={48} iconColor="#C62828" />
        <Text style={{ fontSize: 16, color: '#C62828', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        <Button mode="contained" onPress={loadData}>Reintentar</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.headerTitle}>
            Listado de Docentes
          </Text>
          <Text style={styles.headerSubtitle}>
            {docentes.length} docentes registrados
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {docentes.map((docente, index) => {
            const isExpanded = expandedId === docente.id;
            const fullName = `${docente.apellidos}, ${docente.nombres}`;
            const materiasAgrupadas = docente.materias.reduce<{ nombre: string; cursos: string[] }[]>((acc, m) => {
              const existing = acc.find(x => x.nombre === m.materia);
              if (existing) {
                existing.cursos.push(`${m.curso} ${m.division}`.trim());
              } else {
                acc.push({ nombre: m.materia, cursos: [`${m.curso} ${m.division}`.trim()] });
              }
              return acc;
            }, []);
            return (
              <View key={docente.id}>
                <TouchableOpacity
                  onPress={() => setExpandedId(isExpanded ? null : docente.id)}
                  style={styles.docenteRow}
                >
                  <Avatar.Text
                    size={44}
                    label={getInitials(docente.apellidos, docente.nombres)}
                    style={styles.avatar}
                  />
                  <View style={styles.docenteInfo}>
                    <Text style={styles.docenteNombre}>{fullName}</Text>
                    <Text style={styles.docenteDni}>Email: {docente.email}</Text>
                    <Text style={styles.docenteMaterias}>
                      {docente.materias.map(m => m.materia).join(', ')}
                    </Text>
                  </View>
                  <IconButton
                    icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    iconColor="#6B6B6B"
                    style={styles.chevronIcon}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{docente.email}</Text>
                      </View>
                    </View>

                    <Text style={styles.materiasTitulo}>Materias asignadas</Text>
                    {materiasAgrupadas.map((mat, mIdx) => (
                      <View key={mIdx} style={styles.materiaRow}>
                        <View style={styles.materiaIcon}>
                          <IconButton icon="book-open-variant" size={16} iconColor="#1F5FAF" style={styles.materiaIconButton} />
                        </View>
                        <View style={styles.materiaInfo}>
                          <Text style={styles.materiaNombre}>{mat.nombre}</Text>
                          <View style={styles.cursosWrap}>
                            {mat.cursos.map((c, cIdx) => (
                              <Chip key={cIdx} compact style={styles.cursoChip} textStyle={styles.cursoChipText}>
                                {c}
                              </Chip>
                            ))}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {index < docentes.length - 1 && <Divider style={styles.divider} />}
              </View>
            );
          })}
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
    padding: 16,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    color: '#1F5FAF',
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 2,
  },
  docenteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    backgroundColor: '#1F5FAF',
  },
  docenteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  docenteNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 2,
  },
  docenteDni: {
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 1,
  },
  docenteMaterias: {
    fontSize: 12,
    color: '#1F5FAF',
    fontWeight: '500',
  },
  chevronIcon: {
    margin: 0,
    padding: 0,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F7F9FC',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#9E9E9E',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: '#2B2B2B',
    fontWeight: '500',
  },
  materiasTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B6B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  materiaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    marginBottom: 4,
  },
  materiaIcon: {
    marginRight: 4,
  },
  materiaIconButton: {
    margin: 0,
    padding: 0,
  },
  materiaInfo: {
    flex: 1,
  },
  materiaNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  cursosWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cursoChip: {
    height: 22,
    backgroundColor: '#E6F0FA',
    borderColor: '#1F5FAF',
  },
  cursoChipText: {
    fontSize: 11,
    color: '#1F5FAF',
    fontWeight: '600',
    marginHorizontal: 0,
  },
  divider: {
    backgroundColor: '#E8E8E8',
    marginHorizontal: 16,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default DocentesListadoScreen;
