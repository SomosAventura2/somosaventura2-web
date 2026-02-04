# Arreglar error 500 en login (confirmation_token NULL)

Sigue estos pasos **en orden** en el Dashboard de Supabase.

---

## Paso 1: SQL que actualiza TODOS los usuarios

En **SQL Editor** → New query, pega y ejecuta **cada bloque por separado**:

```sql
-- 1) confirmation_token: poner '' donde sea NULL (en TODOS los usuarios)
UPDATE auth.users SET confirmation_token = '' WHERE confirmation_token IS NULL;
```

Luego:

```sql
-- 2) recovery_token: igual
UPDATE auth.users SET recovery_token = '' WHERE recovery_token IS NULL;
```

Si alguno dice "column does not exist", ignóralo y sigue. Debe aparecer algo como "Success" y, si había NULLs, "X rows affected".

---

## Paso 2: Usuario nuevo (por si el actual sigue corrupto)

1. En el Dashboard: **Authentication** → **Users**.
2. **Elimina** el usuario con el que intentas entrar (los tres puntos → Delete user).
3. **Add user** → **Create new user**.
4. Email: el que quieras (ej. `prueba@ejemplo.com`).
5. Password: una contraseña que recuerdes.
6. **Create user**.

Ese usuario se crea con los campos ya bien guardados (sin NULL problemáticos).

---

## Paso 3: Probar sin caché

1. Abre una **ventana de incógnito** (Ctrl+Shift+N en Chrome).
2. Entra a tu app (ej. `https://tu-usuario.github.io/airport-app/login.html`).
3. Inicia sesión con el **usuario nuevo** (email y contraseña del paso 2).

Si con el usuario nuevo funciona, el problema era el usuario antiguo. Si sigue el 500, pasa al paso 4.

---

## Paso 4: Comprobar que el SQL se aplicó

En **SQL Editor** ejecuta (solo para ver, no cambia nada):

```sql
SELECT id, email, confirmation_token, recovery_token
FROM auth.users;
```

- Si ves `confirmation_token` o `recovery_token` en **NULL**, el UPDATE del paso 1 no se aplicó (permisos o proyecto equivocado).
- Si en tu proyecto no te deja ejecutar esta query (permiso denegado), entonces el Dashboard puede no tener permisos para `auth.users`; en ese caso la opción más fiable es **solo usar usuarios nuevos** creados desde **Authentication → Add user**.

---

## Resumen

| Qué probar | Dónde |
|------------|--------|
| UPDATE de `confirmation_token` y `recovery_token` | SQL Editor |
| Borrar usuario viejo y crear uno nuevo | Authentication → Users |
| Login sin caché | Ventana de incógnito + usuario nuevo |
