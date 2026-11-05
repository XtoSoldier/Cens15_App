import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { alumnoDateValue } from '../utils/alumnoFields';

export default function AlumnoBirthDateField({ value, onChange, editable = true }: {
  value: string | null;
  onChange: (value: string) => void;
  editable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = alumnoDateValue(value);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text>Fecha de nacimiento (opcional)</Text>
      {Platform.OS === 'web' && editable ? (
        <input
          aria-label="Fecha de nacimiento (opcional)"
          type="date"
          value={date}
          max={alumnoDateValue(new Date())}
          onChange={(event) => onChange(event.currentTarget.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 8, border: '1px solid #999', borderRadius: 4 }}
        />
      ) : (
        <Button mode="outlined" disabled={!editable} onPress={() => setOpen(true)}>
          {date ? date.split('-').reverse().join('/') : 'Sin informar'}
        </Button>
      )}
      {editable && date ? <Button onPress={() => { setOpen(false); onChange(''); }}>Quitar fecha</Button> : null}
      {editable && open && Platform.OS !== 'web' && (
        <DateTimePicker
          value={date ? new Date(`${date}T00:00:00`) : new Date()}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setOpen(false);
            if (event.type === 'set' && selectedDate) onChange(alumnoDateValue(selectedDate));
          }}
        />
      )}
    </View>
  );
}
