import React, { useState } from 'react';
import { Modal, View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Text, TextInput, RadioButton } from 'react-native-paper';
import type { GradeOrigin, GradeValues } from '../utils/calificaciones';

export default function CalificacionOriginModal({ values, context, onCancel, onApply, pending = false, saveError = '' }: {
  values: GradeValues;
  context: string;
  onCancel: () => void;
  onApply: (origin: GradeOrigin, disposition: string) => void;
  pending?: boolean;
  saveError?: string;
}) {
  const [origin, setOrigin] = useState<GradeOrigin>(values.estado === 'AprobadoPorEquivalencia' ? 'Equivalencia' : values.desdePase ? 'Pase' : 'Normal');
  const [disposition, setDisposition] = useState(values.disposicionEquivalencia || '');
  const [error, setError] = useState('');
  return <Modal visible transparent animationType="fade" onRequestClose={() => { if (!pending) onCancel(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}><View style={styles.dialog}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text variant="titleMedium">Origen de la calificación</Text>
        <Text>{context}</Text>
        <RadioButton.Group value={origin} onValueChange={value => { if (!pending && ['Normal', 'Equivalencia', 'Pase'].includes(value)) { setOrigin(value as GradeOrigin); setError(''); } }}>
          <RadioButton.Item disabled={pending} value="Normal" label="Carga normal" />
          <RadioButton.Item disabled={pending} value="Equivalencia" label="Aprobado por Equivalencia" />
          <RadioButton.Item disabled={pending} value="Pase" label="Desde Pase" />
        </RadioButton.Group>
        {origin === 'Equivalencia' && <TextInput disabled={pending} label="Disposición" accessibilityLabel="Disposición de equivalencia" multiline style={styles.input} value={disposition} onChangeText={setDisposition} error={!!error} />}
        {error || saveError ? <Text accessibilityRole="alert" style={styles.error}>{error || saveError}</Text> : null}
      </ScrollView>
      <View style={styles.actions}>
        <Button disabled={pending} onPress={() => { if (!pending) onCancel(); }}>Cancelar</Button>
        <Button disabled={pending} loading={pending} onPress={() => {
          if (pending) return;
          if (origin === 'Equivalencia' && !disposition.trim()) { setError('La disposición de equivalencia es obligatoria.'); return; }
          onApply(origin, disposition.trim());
        }}>Guardar</Button>
      </View>
    </View></KeyboardAvoidingView>
  </Modal>;
}

export function PaseInfoModal({ onClose }: { onClose: () => void }) {
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={styles.dialog}>
      <Text>Viene de Pase</Text>
      <Button onPress={onClose}>Cerrar</Button>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 8 },
  input: { minHeight: 96, maxHeight: 220 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  error: { color: '#C62828' },
});
