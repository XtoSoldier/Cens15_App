import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Button, Dialog, IconButton, Portal, Text } from 'react-native-paper';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void | Promise<void>;
};
type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => void | Promise<void>;
};

const failureMessage = 'No se pudo cambiar el modo de pantalla completa. Intenta nuevamente o revisa los permisos del navegador.';

export default function FullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const pending = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const doc = document as FullscreenDocument;
    const update = () => setFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    const onError = () => setMessage(failureMessage);
    update();
    doc.addEventListener('fullscreenchange', update);
    doc.addEventListener('webkitfullscreenchange', update);
    doc.addEventListener('fullscreenerror', onError);
    doc.addEventListener('webkitfullscreenerror', onError);
    return () => {
      doc.removeEventListener('fullscreenchange', update);
      doc.removeEventListener('webkitfullscreenchange', update);
      doc.removeEventListener('fullscreenerror', onError);
      doc.removeEventListener('webkitfullscreenerror', onError);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (pending.current) return;
    const doc = document as FullscreenDocument;
    const root = doc.documentElement as FullscreenRoot;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else setMessage(failureMessage);
      } else if (root.requestFullscreen) {
        // Include portals and dialogs, and request directly within the user's tap.
        await root.requestFullscreen({ navigationUI: 'hide' });
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      } else {
        setMessage('Este navegador no permite pantalla completa. En iPhone/iPad, usa Compartir > Agregar a pantalla de inicio y abre la app desde ese acceso. En otros dispositivos, prueba con un navegador compatible.');
      }
      setFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    } catch {
      setMessage(failureMessage);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  const label = fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';

  return (
    <>
      <IconButton
        icon={fullscreen ? 'fullscreen-exit' : 'fullscreen'}
        iconColor="#FFFFFF"
        size={24}
        accessibilityLabel={label}
        accessibilityHint="Mostrar u ocultar las barras del navegador cuando sea compatible"
        disabled={busy}
        onPress={toggleFullscreen}
      />
      <Portal>
        <Dialog visible={Boolean(message)} onDismiss={() => setMessage('')} style={{ alignSelf: 'center', width: '90%', maxWidth: 420 }}>
          <Dialog.Title>Pantalla completa</Dialog.Title>
          <Dialog.Content><Text variant="bodyMedium">{message}</Text></Dialog.Content>
          <Dialog.Actions><Button onPress={() => setMessage('')}>Entendido</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
