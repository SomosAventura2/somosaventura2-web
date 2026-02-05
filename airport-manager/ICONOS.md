# Instrucciones para Iconos de PWA

Para completar la instalación de la PWA, necesitas crear dos iconos:

## Opción 1: Usar un Generador Online (Recomendado)

1. Ve a: https://realfavicongenerator.net/
2. Sube el logo de Airport (formato cuadrado, mínimo 512x512px)
3. Configura:
   - iOS: Background color = #000000
   - Android: Background color = #000000
4. Genera y descarga
5. Extrae los archivos `android-chrome-192x192.png` y `android-chrome-512x512.png`
6. Renombra a `icon-192.png` e `icon-512.png`
7. Coloca en la carpeta `/images/`

## Opción 2: Crear Manualmente

### Requisitos:
- **icon-192.png**: 192x192 píxeles
- **icon-512.png**: 512x512 píxeles
- Formato: PNG con transparencia
- Diseño: Logo de AIRPORT en negro sobre fondo blanco (o viceversa)

### Herramientas Recomendadas:
- Photoshop
- Figma (gratis)
- Canva (gratis)
- GIMP (gratis)

### Diseño Sugerido:

```
┌────────────────┐
│                │
│                │
│    AIRPORT     │  ← Texto en negro, bold, centrado
│                │
│                │
└────────────────┘
Fondo: Blanco
```

## Opción 3: Temporalmente sin iconos

Si quieres probar la app sin iconos:

1. Elimina estas líneas del `manifest.json`:
```json
"icons": [
  {
    "src": "/images/icon-192.png",
    "sizes": "192x192",
    "type": "image/png"
  },
  {
    "src": "/images/icon-512.png",
    "sizes": "512x512",
    "type": "image/png"
  }
]
```

2. Reemplaza con:
```json
"icons": []
```

La app funcionará igual, solo no tendrá icono personalizado.

## Verificar Instalación

Después de agregar los iconos:

1. Sube los archivos a tu hosting
2. Abre la app en Safari (iOS)
3. Comparte → Añadir a pantalla de inicio
4. Verifica que aparezca el icono correcto

## Nota Final

Los iconos son importantes para la experiencia de usuario, pero la app funciona perfectamente sin ellos durante el desarrollo y las pruebas iniciales.
