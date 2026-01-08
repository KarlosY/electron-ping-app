# ProPing Monitor

Una aplicación de escritorio moderna construida con Electron para monitorear el estado (ping) de múltiples direcciones IP en tiempo real.

## Características

- 📡 **Monitoreo en Tiempo Real**: Ping constante a múltiples objetivos.
- 🎨 **Diseño Premium**: Interfaz oscura con efectos glassmorphism.
- 💾 **Persistencia**: Las configuraciones se guardan automáticamente en `C:\ProgramData\ElectronPingApp\config.json`.
- 🔔 **Alertas**: Notificaciones de sistema y sonido cuando una IP deja de responder.
- 📊 **Dashboard Dinámico**: Visualización clara del estado y latencia.

## Requisitos

- [Node.js](https://nodejs.org/) (Versión LTS recomendada)
- Windows (Probado en Windows 10/11)

## Instalación

1.  Clonar o descargar este repositorio.
2.  Abrir una terminal en la carpeta del proyecto.
3.  Instalar las dependencias:

```bash
npm install
```

## Uso

Para iniciar la aplicación en modo desarrollo:

```bash
npm start
```

## Configuración

- **Agregar Host**: Ingresa el nombre y la IP en el menú lateral y haz clic en "ADD TARGET".
- **Eliminar Host**: Haz clic en la "X" roja en la lista de objetivos.
- **Ocultar Menú**: Usa el botón `☰` en la esquina superior izquierda.

## Estructura del Proyecto

- `src/main.js`: Proceso principal (Backend), maneja los pings y el sistema de archivos.
- `src/renderer.js`: Lógica de la interfaz (Frontend).
- `src/styles.css`: Estilos de la aplicación.
