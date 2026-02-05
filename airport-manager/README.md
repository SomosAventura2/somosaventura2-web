# 🛍️ AIRPORT MANAGER

Sistema de gestión completo para la tienda Airport. Desarrollado con HTML, CSS y JavaScript vanilla + Supabase.

## ✨ Características

### 📦 Gestión de Pedidos
- Registro completo de pedidos con múltiples productos
- Seguimiento de estados (Agendado → En Producción → Listo → Entregado)
- Sistema de pagos inicial (50% o 100%)
- Soporte para múltiples monedas (Bs, USD, USDT)
- Detalles por producto: cantidad, talla, género, color

### 📅 Calendario Interactivo
- Vista mensual de entregas
- Drag & drop para reorganizar pedidos
- Checkboxes para marcar pedidos completados
- Visualización intuitiva de la carga de trabajo

### 💰 Pagos y Gastos
- Registro de pagos por pedido (inicial y restante)
- Control de gastos por pedido o generales
- Seguimiento en Bolívares y Dólares
- Referencias para cada transacción

### 📊 Estadísticas
- Resumen financiero (ingresos vs gastos)
- Análisis semanal, mensual y trimestral
- Facturación en Euros (referencia)
- Productos más vendidos
- Gráficos visuales de rendimiento

### 🎨 Diseño
- Estética minimalista inspirada en Airport
- Mobile-first (optimizado para iOS)
- PWA (funciona como app instalable)
- Modo offline básico

## 🚀 Configuración

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que se inicialice (2-3 minutos)
4. Guarda tu **URL del proyecto** y **Anon Key**

### 2. Configurar Base de Datos

1. En Supabase, ve a **SQL Editor**
2. Crea un nuevo query
3. Copia y pega todo el contenido del archivo `database.sql`
4. Ejecuta el script (botón RUN o Ctrl+Enter)
5. Verifica que se crearon las tablas en **Table Editor**

### 3. Crear Usuario

1. En Supabase, ve a **Authentication** → **Users**
2. Click en **Add user** → **Create new user**
3. Ingresa el email y contraseña de Chantal
4. Confirma el email automáticamente (toggle "Auto Confirm User")
5. Guarda las credenciales en un lugar seguro

### 4. Configurar la Aplicación

1. Abre el archivo `js/supabase-config.js`
2. Reemplaza las credenciales:

```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';
```

3. Guarda el archivo

### 5. Subir a Hosting

#### Opción A: Netlify (Recomendado)

1. Ve a [netlify.com](https://netlify.com)
2. Arrastra la carpeta `airport-manager` completa
3. Espera el deploy (30 segundos)
4. Tu app estará en: `https://nombre-random.netlify.app`
5. Puedes cambiar el nombre en Site Settings

#### Opción B: Vercel

1. Instala Vercel CLI: `npm i -g vercel`
2. En la carpeta del proyecto: `vercel`
3. Sigue las instrucciones
4. Deploy automático

#### Opción C: GitHub Pages

1. Crea un repositorio en GitHub
2. Sube todos los archivos
3. Ve a Settings → Pages
4. Selecciona la rama `main` y carpeta `/root`
5. Guarda y espera el deploy

### 6. Instalar como PWA (iOS)

1. Abre la app en Safari
2. Toca el botón de compartir (cuadrado con flecha)
3. Selecciona "Añadir a pantalla de inicio"
4. Confirma
5. ¡Ya tienes la app en tu iPhone!

## 📱 Uso de la Aplicación

### Dashboard
- Vista general del negocio
- Estadísticas rápidas
- Pedidos recientes
- Entregas del día

### Pedidos
- Click en "Nuevo Pedido" para crear
- Agregar productos con el botón "+"
- Especificar cantidad, talla, género, color
- Definir método de pago y fecha de entrega
- Editar/eliminar pedidos existentes

### Calendario
- Vista mensual de todas las entregas
- **Arrastrar pedidos** entre días para reorganizar
- **Checkbox** para marcar como completado
- Click en pedido para ver detalles

### Pagos
- Registrar pagos asociados a pedidos
- Agregar gastos (por pedido o generales)
- Ver historial completo de transacciones

### Estadísticas
- Cambiar entre semana/mes/trimestre
- Ver balance financiero completo
- Analizar productos más vendidos
- Exportar datos (próximamente)

## 🛠️ Estructura del Proyecto

```
airport-manager/
├── index.html              # Login
├── dashboard.html          # Dashboard principal
├── pedidos.html           # Gestión de pedidos
├── calendario.html        # Calendario de entregas
├── pagos.html            # Pagos y gastos
├── estadisticas.html     # Reportes y stats
├── manifest.json         # Configuración PWA
├── sw.js                # Service Worker
├── database.sql         # Schema de base de datos
├── css/
│   └── styles.css       # Estilos principales
└── js/
    ├── supabase-config.js    # Configuración Supabase
    ├── pedidos.js           # Lógica de pedidos
    ├── calendario.js        # Lógica de calendario
    ├── pagos.js            # Lógica de pagos
    └── estadisticas.js     # Lógica de estadísticas
```

## 🎨 Personalización

### Colores
Edita `css/styles.css` en la sección `:root`:

```css
:root {
    --black: #000000;
    --white: #FFFFFF;
    --accent: #FF6B6B;    /* Color de acento */
    --success: #10B981;   /* Color de éxito */
    --warning: #F59E0B;   /* Color de advertencia */
    --error: #EF4444;     /* Color de error */
}
```

### Categorías de Productos
Edita directamente en Supabase:
1. Ve a **Table Editor** → `product_categories`
2. Agrega/edita/elimina categorías
3. Los cambios se reflejan automáticamente

### Métodos de Pago
Edita en `pedidos.html` línea 70:

```html
<select id="paymentMethod" class="form-select" required>
    <option value="pago_movil">Pago Móvil (Bs)</option>
    <option value="efectivo_usd">Dólares Efectivo</option>
    <option value="zelle">Zelle</option>
    <option value="usdt">USDT</option>
    <!-- Agrega más opciones aquí -->
</select>
```

## 🔒 Seguridad

### Consideraciones Importantes

1. **Nunca subas credenciales al código**
   - El archivo `supabase-config.js` debe tener credenciales reales
   - Si usas Git, agrégalo a `.gitignore`

2. **Row Level Security (RLS)**
   - Ya está configurado en el script SQL
   - Solo usuarios autenticados pueden acceder a datos

3. **Backup de Datos**
   - Supabase hace backups automáticos
   - Exporta manualmente cada mes: Table Editor → Export to CSV

4. **Usuarios Adicionales**
   - Si necesitas más usuarios, créalos en Supabase Auth
   - Cada uno necesitará sus propias credenciales

## 🐛 Solución de Problemas

### "No puedo iniciar sesión"
- Verifica que el usuario esté confirmado en Supabase Auth
- Revisa que las credenciales en `supabase-config.js` sean correctas
- Asegúrate de que RLS esté habilitado

### "No se cargan los pedidos"
- Abre la consola del navegador (F12)
- Busca errores en rojo
- Verifica que la tabla `orders` exista en Supabase

### "No funciona el drag & drop"
- Verifica que Sortable.js se cargó correctamente
- Revisa la conexión a internet
- Prueba en otro navegador

### "La PWA no se instala"
- iOS requiere Safari (no funciona en Chrome iOS)
- Verifica que `manifest.json` esté accesible
- Asegúrate de estar en HTTPS

## 📈 Próximas Funcionalidades

- [ ] Exportar reportes a PDF
- [ ] Notificaciones push de entregas
- [ ] Búsqueda avanzada de pedidos
- [ ] Historial de cambios por pedido
- [ ] Gráficos más detallados
- [ ] Modo oscuro
- [ ] Multi-usuario con roles

## 📞 Soporte

Si necesitas ayuda adicional:

1. Revisa este README completo
2. Consulta la documentación de [Supabase](https://supabase.com/docs)
3. Prueba en modo incógnito para descartar problemas de caché
4. Contacta al desarrollador

## 📄 Licencia

Este proyecto fue desarrollado específicamente para Airport. Todos los derechos reservados.

---

**Desarrollado con ❤️ para Airport**

Última actualización: Febrero 2026
