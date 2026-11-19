# Cens15_App
Aplicación de Operaciones del CENS 15

## Expo Go SDK 58

El proyecto utiliza Expo SDK 58, React Native 0.88.1 y React 19.3.0.
Requiere Node compatible con Expo 58 (la version local 22.14.0 es compatible).
Las versiones de los modulos nativos estan alineadas mediante `expo install --fix`
y se conservan en `Cens15App/pnpm-lock.yaml`.

Luego de actualizar, detener el Metro anterior con `Ctrl+C` y ejecutar desde `Cens15App`:

```cmd
pnpm install --frozen-lockfile
pnpm run dev:local-api --clear --go
```

Escanear el QR nuevo con Expo Go SDK 58. No reutilizar un Metro iniciado con SDK 57
ni cambiar manualmente `sdkVersion` en `app.json`: Expo lo obtiene de sus dependencias.

Verificacion de compatibilidad:

```cmd
pnpm exec expo install --check
pnpm dlx expo-doctor
pnpm exec tsc --noEmit
```

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

### Build Web De Intranet

Desde `Cens15App`, seleccionar `.env.intranet` al compilar (solo web):

```powershell
pnpm run build:web:intranet
```

El resultado se genera en `dist` y muestra el indicador `INTRANET` con la URL real de la API.
`http://{hostname}:8080/api` toma el hostname de la pagina abierta, sin usar su puerto.
Por ejemplo, al abrir `http://192.168.1.50` (o `http://192.168.1.50:3001`),
la API sera `http://192.168.1.50:8080/api`. Ambos sitios y la API deben estar en ese mismo servidor LAN.
No hay que conocer la IP al compilar; no se usa `localhost` para los clientes de la LAN.

Para elegir cualquier otro archivo de ambiente al compilar:

```powershell
pnpm exec env-cmd -f .env.mi-ambiente -- expo export --platform web --clear
```

Usar `.env.intranet` como base, incluyendo `EXPO_NO_DOTENV=1` para evitar que Expo
cargue `.env` o `.env.production` por encima de los valores seleccionados, incluso valores vacios o `false`.
Definir ambas variables `EXPO_PUBLIC_API_URL_DEV` y `EXPO_PUBLIC_API_URL_PROD` para usar la misma API
en desarrollo y en el export de produccion. Se puede reemplazar la plantilla por una URL explicita.
Los valores seleccionados quedan incorporados al build; cambiar el archivo requiere recompilar.
En nativo la plantilla requiere un host de Expo; sin ese host genera un error claro y requiere una URL explicita.

El firewall del servidor debe permitir el puerto de cada sitio y el puerto `8080` de la API.
La API debe permitir los origenes LAN de ambos sitios mediante CORS.
Un sitio HTTPS no puede consumir esta API HTTP sin bloqueo de contenido mixto:
usar HTTP dentro de la LAN o configurar HTTPS tambien para la API y actualizar su URL.
Estos comandos no configuran el servidor ni reinician servicios.

## Codigos De Acceso Y Sesiones

Registrarse y Olvide mi contrasena solicitan el mismo codigo de acceso unico y
abren automaticamente la pantalla para validarlo y definir la contrasena.
El codigo tiene 6 digitos, vence en 15 minutos y admite 5 intentos incorrectos.
Reenviarlo invalida el anterior; solicitarlo no cambia la contrasena actual.
No utilizar las claves temporales enviadas antes de esta actualizacion: solicitar
un codigo nuevo. El usuario debe existir y estar activo.

Al vencer el JWT se elimina el token, se limpia la sesion de Redux y se vuelve
al login, incluso si la app estuvo en segundo plano. Un 401 de una peticion
autenticada a la API propia produce el mismo cierre. No se cierra una sesion por
un 403, un error de red ni un 401 de servicios externos o del formulario de login.
Se conservan las preferencias y datos recordados del dispositivo, no su acceso.

Pruebas desde `Cens15App`:

```cmd
pnpm run test:access
pnpm run test:session
pnpm exec tsc --noEmit
```

## Listado De Alumnos

En web y movil, el listado permite filtrar por **Curso** y **Año de inscripcion**,
ademas de buscar por nombre, apellido o DNI. Curso conserva su identificador
internamente pero muestra solo curso y division, sin ID. Ya no hay filtros
independientes de Anexo ni Orientacion; esos datos se conservan en la vista previa.

Los filtros academicos se comparan sobre una misma inscripcion del historial:
no combinan el curso de un año con el año de otro curso. Cada alumno aparece una
sola vez y su vista previa muestra la inscripcion coincidente y el año. Sin
filtros se toma primero el año mas reciente; dentro de ese año se priorizan las
inscripciones activas y luego fecha e ID. Los alumnos sin inscripciones siguen
apareciendo cuando no se aplica un filtro academico.

La cantidad encontrada permanece visible con y sin filtros, incluido cero. En
carga o error se indica que la cantidad aun no esta disponible, en vez de
presentar un resultado incompleto como definitivo. Si falla una consulta de
historial, el listado permite reintentar sin mostrar conteos parciales.

En el detalle esta **Volver al listado de alumnos**. Regresa a la instancia
anterior del listado conservando filtros y busqueda; al recuperar el foco se
refrescan los datos sin reiniciar esos filtros. No se guarda este estado entre
cierres completos o recargas de la app. Datos incluye tambien el año de la
inscripcion mostrada junto al curso.

Pruebas desde `Cens15App`:

```powershell
pnpm run test:alumnos
pnpm exec tsc --noEmit
```

## Equivalencias Y Notas Desde Pase

Cada fila de calificaciones tiene un menu de tres puntos verticales despues de
Situacion, tanto en la ficha de alumno como en la vista docente. Permite elegir
Carga normal, Aprobado por Equivalencia o Desde Pase. Se conservan los permisos
actuales de crear/editar calificaciones y la validacion de docente activo por materia.

Aprobado por Equivalencia se muestra como **A/E** y exige **Disposicion** de texto
libre. No asigna una nota numerica ficticia: anual/final permanecen vacios. Las
notas brutas anteriores se conservan pero quedan de solo lectura mientras dure
la equivalencia. Se puede consultar o editar la disposicion desde el mismo menu.

Desde Pase conserva la carga y calculo normal de notas. Un icono de admiracion
junto a la materia abre **Viene de Pase**. En la vista agrupada por materia se
marca la fila del alumno correspondiente, no todo el curso. El boletin refleja
el origen y la disposicion con texto escapado.

Cancelar no guarda cambios. Volver a Carga normal quita la marca y recalcula; si
corresponde la consulta excepcional de recuperacion por S/C, debe confirmarse
antes de guardar. Los errores permanecen visibles y el guardado bloquea duplicados.

Desplegar primero la API con la migracion `20261111201830_AddCalificacionOrigen`
y luego la app. La migracion no se aplico a la base real durante este trabajo.
La API la aplica al arrancar, por lo que su reinicio requiere autorizar previamente
el despliegue y disponer de respaldo. Los antiguos APE que se guardaron como
Aprobado no se convierten automaticamente en A/E.

## Fuentes E Iconos En IIS

Los builds web de produccion e intranet exportan los recursos con URLs limpias
bajo `/assets/static`, conservando los hashes de contenido. No exponen rutas
internas de `node_modules/.pnpm` ni caracteres `+` en los nombres de directorio.
Las peticiones de assets de Metro en desarrollo mantienen sus rutas originales.

```powershell
pnpm run build:web:prod
```

El comando incluye automaticamente `dist/web.config` y verifica que la fuente
MaterialDesignIcons exista, tenga cabecera TrueType y sea referenciada por el
bundle. El MIME `.ttf` es `font/ttf`; las peticiones a `assets` y `_expo` no se
reescriben a index.html si falta un archivo. No se habilita allowDoubleEscaping
ni se desactivan filtros de seguridad de IIS.

Subir por FTP **todo el contenido de dist**, incluidos `index.html`, `web.config`,
`_expo` y `assets/static`. Usar transferencia binaria para los assets. No mezclar
el index/bundles de una compilacion con los assets de otra. Luego recargar con
Ctrl+F5 para descartar el HTML o JS anterior que apunte a la ruta vieja.

Tras publicar, la URL de `MaterialDesignIcons.*.ttf` bajo `/assets/static` debe
responder 200 con el archivo de fuente, no 404 ni HTML. La verificacion local del
build no sustituye esa comprobacion HTTP en el servidor.
