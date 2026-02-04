-- Tabla para iniciar sesión con usuario (ej. "chanti") en lugar del correo.
-- Ejecuta este script en Supabase → SQL Editor (una sola vez).

-- Tabla: usuario -> email (Supabase solo permite login por email)
CREATE TABLE IF NOT EXISTS public.user_logins (
  username text PRIMARY KEY,
  email text NOT NULL UNIQUE
);

-- Permitir que la pantalla de login (sin sesión) pueda leer para resolver usuario -> email
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Login puede leer usuario -> email"
  ON public.user_logins FOR SELECT
  TO anon
  USING (true);

-- Solo usuarios autenticados pueden insertar/actualizar (opcional; también puedes hacerlo desde el Dashboard)
CREATE POLICY "Solo autenticados pueden gestionar user_logins"
  ON public.user_logins FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Asociar "chanti" al usuario test@airport.com (usa el correo que tenga ese usuario en Auth)
INSERT INTO public.user_logins (username, email)
VALUES ('chanti', 'test@airport.com')
ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email;
