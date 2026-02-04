-- Paso 2: Ver la estructura de order_items en Supabase
-- Ejecuta este script en Supabase → SQL Editor

-- Columnas de order_items (tipo, si es generada, expresión)
SELECT column_name, data_type, is_nullable, column_default,
       is_generated, generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'order_items'
ORDER BY ordinal_position;

-- Opcional: columnas de orders (por si subtotal_eur/total_eur son generadas ahí)
SELECT column_name, data_type, is_nullable, column_default,
       is_generated, generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;
