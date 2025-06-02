-- Actualizamos el campo status para que coincida con los valores permitidos
ALTER TABLE transactions 
MODIFY COLUMN status ENUM('Pending', 'Completed') 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci 
DEFAULT 'Completed'; 