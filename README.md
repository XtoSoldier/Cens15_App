# Cens15_App
Aplicación de Operaciones del CENS 15

## Ambientes

Ejecutar los comandos desde `Cens15App`.

Instalar dependencias antes de iniciar:

```powershell
pnpm install --frozen-lockfile
```

### Expo Go / Móvil Local + API Local

Iniciar primero el backend desde `Cens15_V2` con `dotnet run`.

```powershell
# Web: https://localhost:7000/api
# Expo Go: http://IP_DE_LA_PC:5211/api
pnpm run dev:local-api
```

Escanear el QR con Expo Go. El teléfono y la PC deben estar en la misma red Wi-Fi.

### Expo Go / Móvil Local + API Productiva

```powershell
# API: https://api.cens15.tierradelfuego.edu.ar/api
pnpm run dev:prod-api
```

### Expo Web Local + API Local

```powershell
# API: https://localhost:7000/api
pnpm run web:local-api
```

### Expo Web Local + API Productiva

```powershell
# API: https://api.cens15.tierradelfuego.edu.ar/api
pnpm run web:prod-api
```

### Build Web De Producción

```powershell
pnpm run build:web:prod
```

El resultado se genera en `dist` y no muestra el indicador de ambiente.

En Expo Go el perfil local detecta automáticamente la IP LAN incluida en el QR.
El firewall debe permitir conexiones entrantes al puerto `5211`.
