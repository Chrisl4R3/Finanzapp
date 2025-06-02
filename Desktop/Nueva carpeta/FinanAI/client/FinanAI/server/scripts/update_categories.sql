-- Primero eliminamos la restricción si existe
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_categories;

-- Actualizamos las categorías de ingresos
UPDATE transactions 
SET category = 'Salario' 
WHERE type = 'Income' AND category IN ('Salario', 'Freelance');

UPDATE transactions 
SET category = 'Otros' 
WHERE type = 'Income' AND category NOT IN ('Salario');

-- Actualizamos las categorías de gastos según el tipo de gasto
UPDATE transactions 
SET category = 'Vivienda' 
WHERE type = 'Expense' AND category IN ('Alquiler', 'Renta', 'Hipoteca');

UPDATE transactions 
SET category = 'Alimentación' 
WHERE type = 'Expense' AND category IN ('Comida', 'Supermercado', 'Abarrotes');

UPDATE transactions 
SET category = 'Servicios' 
WHERE type = 'Expense' AND category IN ('Servicios', 'Luz', 'Agua', 'Gas', 'Internet');

UPDATE transactions 
SET category = 'Salud' 
WHERE type = 'Expense' AND category IN ('Salud', 'Médico', 'Farmacia');

UPDATE transactions 
SET category = 'Educación' 
WHERE type = 'Expense' AND category IN ('Educación', 'Escuela', 'Cursos');

UPDATE transactions 
SET category = 'Transporte' 
WHERE type = 'Expense' AND category IN ('Transporte', 'Gasolina', 'Taxi');

UPDATE transactions 
SET category = 'Ropa' 
WHERE type = 'Expense' AND category IN ('Ropa', 'Vestimenta');

UPDATE transactions 
SET category = 'Seguros' 
WHERE type = 'Expense' AND category IN ('Seguros', 'Seguro');

UPDATE transactions 
SET category = 'Mantenimiento' 
WHERE type = 'Expense' AND category IN ('Mantenimiento', 'Reparaciones');

UPDATE transactions 
SET category = 'Entretenimiento' 
WHERE type = 'Expense' AND category IN ('Entretenimiento', 'Cine', 'Teatro');

UPDATE transactions 
SET category = 'Pasatiempos' 
WHERE type = 'Expense' AND category IN ('Pasatiempos', 'Hobbies');

UPDATE transactions 
SET category = 'Restaurantes' 
WHERE type = 'Expense' AND category IN ('Restaurantes', 'Comida fuera');

UPDATE transactions 
SET category = 'Compras' 
WHERE type = 'Expense' AND category IN ('Compras', 'Shopping');

UPDATE transactions 
SET category = 'Viajes' 
WHERE type = 'Expense' AND category IN ('Viajes', 'Vacaciones');

-- Las demás transacciones de tipo Expense que no coincidan con ninguna categoría anterior
UPDATE transactions 
SET category = 'Otros' 
WHERE type = 'Expense' AND category NOT IN (
    'Alimentación',
    'Servicios',
    'Salud',
    'Vivienda',
    'Educación',
    'Transporte',
    'Ropa',
    'Seguros',
    'Mantenimiento',
    'Entretenimiento',
    'Pasatiempos',
    'Restaurantes',
    'Compras',
    'Viajes'
);

-- Verificamos que todas las categorías sean válidas
SELECT * FROM transactions 
WHERE (type = 'Income' AND category NOT IN ('Salario', 'Otros'))
OR (type = 'Expense' AND category NOT IN (
    'Alimentación',
    'Servicios',
    'Salud',
    'Vivienda',
    'Educación',
    'Transporte',
    'Ropa',
    'Seguros',
    'Mantenimiento',
    'Entretenimiento',
    'Pasatiempos',
    'Restaurantes',
    'Compras',
    'Viajes',
    'Otros'
)); 