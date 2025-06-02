-- Primero actualizamos los valores existentes para que coincidan con los nuevos
UPDATE transactions 
SET payment_method = 'Efectivo' 
WHERE payment_method = 'Cash';

UPDATE transactions 
SET payment_method = 'Tarjeta de Crédito' 
WHERE payment_method = 'Credit Card';

UPDATE transactions 
SET payment_method = 'Transferencia Bancaria' 
WHERE payment_method = 'Bank Transfer';

-- Luego modificamos la columna para aceptar los nuevos valores
ALTER TABLE transactions 
MODIFY COLUMN payment_method ENUM(
    'Efectivo',
    'Tarjeta de Débito',
    'Tarjeta de Crédito',
    'Transferencia Bancaria'
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; 