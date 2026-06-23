import React, { useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { TouchableRipple, IconButton, Menu, Divider, Badge } from 'react-native-paper';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MainMenu from '../screens/MainMenuScreen';
import AlumnosScreen from '../screens/AlumnosScreen';
import AlumnosListadoScreen from '../screens/AlumnosListadoScreen';
import AlumnoDetalleScreen from '../screens/AlumnoDetalleScreen';
import InscripcionScreen from '../screens/InscripcionScreen';
import DNICaptureScreen from '../screens/DNICaptureScreen';
import CursosScreen from '../screens/CursosScreen';
import MateriasScreen from '../screens/MateriasScreen';
import DocentesScreen from '../screens/DocentesScreen';
import NovedadesScreen from '../screens/NovedadesScreen';
import AnexosScreen from '../screens/AnexosScreen';
import HorariosScreen from '../screens/HorariosScreen';
import AutoridadesScreen from '../screens/AutoridadesScreen';
import DocentesListadoScreen from '../screens/DocentesListadoScreen';
import DocenteCalificarScreen from '../screens/DocenteCalificarScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAppSelector, useAppDispatch } from '../hooks/useRedux';
import { logout } from '../slices/appSlice';
import { clearUserData } from '../utils/storage';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  ChangePassword: { currentPassword: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  MainMenu: undefined;
  Alumnos: undefined;
  AlumnosListado: undefined;
  AlumnoDetalle: { alumno: any };
  Inscripcion: { scannedData?: any } | undefined;
  DNICapturePhoto: undefined;
  Cursos: undefined;
  Materias: undefined;
  Docentes: undefined;
  DocentesListado: undefined;
  DocenteCalificar: undefined;
  Novedades: undefined;
  Anexos: undefined;
  Horarios: undefined;
  Autoridades: undefined;
  Settings: undefined;
};

const NOTIFICACIONES = [
  { id: 1, titulo: 'Inscripciones Abiertas', fecha: '15/04/2026', descripcion: 'Las inscripciones para el ciclo lectivo 2026 están abiertas hasta el 30 de mayo.' },
  { id: 2, titulo: 'Reunión de Docentes', fecha: '10/04/2026', descripcion: 'Se convoca a todos los docentes a la reunión de planificación el viernes 12 de abril.' },
  { id: 3, titulo: 'Nuevo Curso de Informática', fecha: '05/04/2026', descripcion: 'Se inaugura el nuevo laboratorio de informática con equipos de última generación.' },
];

const Stack = createNativeStackNavigator<RootStackParamList>();
type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function HeaderTitle() {
  const navigation = useNavigation<AppNavigationProp>();
  const { userToken } = useAppSelector((state) => state.app);

  const handleBrandPress = () => {
    navigation.navigate(userToken ? 'MainMenu' : 'Home');
  };

  return (
    <Text 
      onPress={handleBrandPress}
      style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}
    >
      Cens15App
    </Text>
  );
}

function NotificationIcon() {
  const navigation = useNavigation<AppNavigationProp>();
  const [menuVisible, setMenuVisible] = useState(false);
  const notificaciones = NOTIFICACIONES;

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <View style={styles.bellWrapper}>
          <IconButton
            icon="bell"
            size={24}
            iconColor="#FFFFFF"
            onPress={() => setMenuVisible(true)}
          />
          {notificaciones.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificaciones.length > 9 ? '9+' : notificaciones.length}
              </Text>
            </View>
          )}
        </View>
      }
      contentStyle={styles.notifMenuContent}
    >
      <View style={styles.notifHeader}>
        <Text style={styles.notifTitle}>Novedades</Text>
      </View>
      <ScrollView style={styles.notifScroll} nestedScrollEnabled>
        {notificaciones.map((n) => (
          <View key={n.id}>
            <TouchableOpacity
              style={styles.notifItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Novedades');
              }}
            >
              <Text style={styles.notifItemTitle}>{n.titulo}</Text>
              <Text style={styles.notifItemDate}>{n.fecha}</Text>
              <Text style={styles.notifItemDesc} numberOfLines={2}>{n.descripcion}</Text>
            </TouchableOpacity>
            <Divider style={styles.notifDivider} />
          </View>
        ))}
      </ScrollView>
    </Menu>
  );
}

function HeaderRight() {
  return (
    <View style={styles.headerRight}>
      <NotificationIcon />
      <LoginStatusIcon />
    </View>
  );
}

function LoginStatusIcon() {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useAppDispatch();
  const { userToken, userName, userEmail } = useAppSelector((state) => state.app);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = () => {
    setMenuVisible(false);
    clearUserData();
    dispatch(logout());
    navigation.navigate('Login');
  };

  const handleSettings = () => {
    setMenuVisible(false);
    navigation.navigate('Settings');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <Menu
      visible={menuVisible}
      onDismiss={() => setMenuVisible(false)}
      anchor={
        <TouchableRipple onPress={() => setMenuVisible(true)} style={{ marginRight: 8 }}>
          <View style={{ padding: 4 }}>
            <IconButton
              icon={userToken ? 'account' : 'account-cancel'}
              size={24}
              iconColor="#FFFFFF"
            />
          </View>
        </TouchableRipple>
      }
      contentStyle={styles.menuContent}
    >
      {userToken ? (
        <>
          <View style={styles.menuUserInfo}>
            <Text style={styles.menuUserName}>{userName}</Text>
            <Text style={styles.menuUserEmail}>{userEmail}</Text>
          </View>
          <Divider />
          <Menu.Item
            onPress={handleSettings}
            title="Configuración"
            leadingIcon="cog"
          />
          <Divider />
          <Menu.Item
            onPress={handleLogout}
            title="Cerrar sesión"
            leadingIcon="logout"
            titleStyle={styles.logoutText}
          />
        </>
      ) : (
        <Menu.Item
          onPress={handleLogin}
          title="Iniciar sesión"
          leadingIcon="login"
        />
      )}
    </Menu>
  );
}

const styles = StyleSheet.create({
  menuContent: {
    width: 220,
    paddingTop: 8,
  },
  menuUserInfo: {
    padding: 12,
    paddingBottom: 8,
  },
  menuUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2B2B',
  },
  menuUserEmail: {
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 2,
  },
  logoutText: {
    color: '#C62828',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellWrapper: {
    marginRight: 0,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 6,
    backgroundColor: '#F28C28',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notifMenuContent: {
    width: 280,
    maxHeight: 400,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: '#FFFFFF',
  },
  notifHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F5FAF',
    textAlign: 'center',
  },
  notifScroll: {
    maxHeight: 340,
  },
  notifItem: {
    padding: 12,
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 2,
  },
  notifItemDate: {
    fontSize: 11,
    color: '#6B6B6B',
    marginBottom: 4,
  },
  notifItemDesc: {
    fontSize: 12,
    color: '#4A4A4A',
    lineHeight: 18,
  },
  notifDivider: {
    backgroundColor: '#E0E0E0',
  },
  webScreenContent: {
    paddingHorizontal: '20%',
    backgroundColor: 'transparent',
    boxSizing: 'border-box' as any,
  },
});

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTitle: () => <HeaderTitle />,
          headerStyle: {
            backgroundColor: '#1F5FAF',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            color: '#FFFFFF',
          },
          gestureEnabled: true,
          headerRight: () => <HeaderRight />,
          contentStyle: Platform.OS === 'web' ? styles.webScreenContent : undefined,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ title: 'Iniciar Sesión' }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
          options={{ title: 'Registrarse' }}
        />
        <Stack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{ title: 'Cambiar Contraseña', headerBackVisible: false }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen}
          options={{ title: 'Recuperar Contraseña' }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ title: 'Nueva Contraseña' }}
        />
        <Stack.Screen 
          name="MainMenu" 
          component={MainMenu}
          options={{ title: 'Menú Principal' }}
        />
        <Stack.Screen 
          name="Alumnos" 
          component={AlumnosScreen}
          options={{ title: 'Alumnos' }}
        />
        <Stack.Screen 
          name="AlumnosListado" 
          component={AlumnosListadoScreen}
          options={{ title: 'Listado de Alumnos' }}
        />
        <Stack.Screen 
          name="AlumnoDetalle" 
          component={AlumnoDetalleScreen}
          options={{ title: 'Detalle del Alumno' }}
        />
        <Stack.Screen 
          name="Inscripcion" 
          component={InscripcionScreen}
          options={{ title: 'Inscripción de Alumno' }}
        />
        <Stack.Screen 
          name="DNICapturePhoto" 
          component={DNICaptureScreen}
          options={{ title: 'Escanear DNI', headerShown: false }}
        />
        <Stack.Screen 
          name="Cursos" 
          component={CursosScreen}
          options={{ title: 'Cursos' }}
        />
        <Stack.Screen 
          name="Materias" 
          component={MateriasScreen}
          options={{ title: 'Materias' }}
        />
        <Stack.Screen 
          name="Docentes" 
          component={DocentesScreen}
          options={{ title: 'Docentes' }}
        />
        <Stack.Screen 
          name="DocentesListado" 
          component={DocentesListadoScreen}
          options={{ title: 'Listado de Docentes' }}
        />
        <Stack.Screen 
          name="DocenteCalificar" 
          component={DocenteCalificarScreen}
          options={{ title: 'Calificar' }}
        />
        <Stack.Screen 
          name="Novedades" 
          component={NovedadesScreen}
          options={{ title: 'Novedades' }}
        />
        <Stack.Screen 
          name="Anexos" 
          component={AnexosScreen}
          options={{ title: 'Anexos' }}
        />
        <Stack.Screen 
          name="Horarios" 
          component={HorariosScreen}
          options={{ title: 'Horarios' }}
        />
        <Stack.Screen 
          name="Autoridades" 
          component={AutoridadesScreen}
          options={{ title: 'Autoridades' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Configuración' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
