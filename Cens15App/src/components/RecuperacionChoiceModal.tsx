import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { Button, RadioButton, Surface, Text } from 'react-native-paper';
import type { RecuperacionExcepcional } from '../services/calificacionService';

export default function RecuperacionChoiceModal({ suggested, onConfirm, onCancel }: {
  suggested: RecuperacionExcepcional;
  onConfirm: (choice: RecuperacionExcepcional) => void;
  onCancel: () => void;
}) {
  const [choice, setChoice] = useState(suggested);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Surface style={{ width: '100%', maxWidth: 440, padding: 20, borderRadius: 12 }}>
          <Text variant="titleMedium">Elegir recuperatorio</Text>
          <Text>Hay un solo cuatrimestre calificado y el otro es S/C. Indicá qué cuatrimestre(s) debe recuperar.</Text>
          <RadioButton.Group value={choice} onValueChange={(value) => setChoice(value as RecuperacionExcepcional)}>
            <RadioButton.Item label="R1 - Primer cuatrimestre" value="RecuperaPrimerCuatrimestre" />
            <RadioButton.Item label="R2 - Segundo cuatrimestre" value="RecuperaSegundoCuatrimestre" />
            <RadioButton.Item label="Ambos cuatrimestres" value="RecuperaAmbos" />
          </RadioButton.Group>
          <Button onPress={onCancel}>Cancelar</Button>
          <Button mode="contained" onPress={() => onConfirm(choice)}>Confirmar y guardar</Button>
        </Surface>
      </View>
    </Modal>
  );
}
