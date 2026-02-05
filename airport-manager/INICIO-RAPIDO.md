# 🚀 GUÍA RÁPIDA DE INICIO - AIRPORT MANAGER

## ⚡ Pasos Rápidos (15 minutos)

### 1️⃣ CREAR SUPABASE (5 min)
```
1. Ve a supabase.com
2. Crea cuenta (gratis)
3. Nuevo proyecto → Espera 2-3 min
4. Copia URL y Anon Key
```

### 2️⃣ CONFIGURAR BASE DE DATOS (2 min)
```
1. En Supabase → SQL Editor
2. Pega todo el contenido de database.sql
3. Click RUN
4. Listo ✓
```

### 3️⃣ CREAR USUARIO (1 min)
```
1. Supabase → Authentication → Users
2. Add User
3. Email: chantal@airport.com (o el que prefieras)
4. Password: (crear una segura)
5. Toggle "Auto Confirm User" ✓
6. Create User
```

### 4️⃣ CONFIGURAR APP (2 min)
```
1. Abre js/supabase-config.js
2. Línea 4: Pega tu SUPABASE_URL
3. Línea 5: Pega tu SUPABASE_ANON_KEY
4. Guarda archivo
```

### 5️⃣ SUBIR A INTERNET (5 min)

**Opción más fácil - Netlify:**
```
1. Ve a netlify.com
2. Arrastra la carpeta airport-manager completa
3. Espera 30 segundos
4. ¡Listo! Tu app está online
```

**URL ejemplo:** `https://airport-manager-xyz.netlify.app`

### 6️⃣ INSTALAR EN iPHONE (1 min)
```
1. Abre la URL en Safari
2. Botón Compartir (cuadrado con flecha ↗)
3. "Añadir a pantalla de inicio"
4. ¡Ya tienes la app instalada!
```

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Supabase creado y activo
- [ ] Base de datos configurada (database.sql ejecutado)
- [ ] Usuario creado y confirmado
- [ ] Credenciales en supabase-config.js
- [ ] App subida a hosting
- [ ] Login funcionando
- [ ] Puedes crear un pedido de prueba
- [ ] PWA instalada en iPhone

---

## 🆘 PROBLEMAS COMUNES

### "Cannot read property 'auth' of undefined"
→ Las credenciales en supabase-config.js están mal

### "Invalid login credentials"
→ El usuario no está confirmado en Supabase Auth

### "Failed to fetch"
→ Las URLs en supabase-config.js tienen espacios o están incompletas

### "Cannot read properties of null"
→ La base de datos no se creó correctamente, ejecuta database.sql de nuevo

---

## 📞 ¿NECESITAS AYUDA?

1. Lee el README.md completo
2. Revisa la consola del navegador (F12)
3. Verifica cada paso del checklist
4. Prueba en modo incógnito

---

## 🎉 ¡ÉXITO!

Si llegaste hasta aquí, ¡felicidades! 

Ya tienes tu sistema de gestión funcionando completamente.

**Próximo paso:** Crea tu primer pedido de prueba para familiarizarte con la interfaz.

---

**¿Todo listo?** → Ve a tu URL y empieza a gestionar Airport 🚀
