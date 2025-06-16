// Verificar variables de entorno requeridas
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'SESSION_SECRET',
  'JWT_SECRET',
  'NODE_ENV',
  'FRONTEND_URL',
  'BACKEND_URL'
];

console.log('🔍 Verificando variables de entorno...');

let missingVars = [];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
    console.error(`❌ Variable de entorno faltante: ${varName}`);
  } else {
    console.log(`✅ ${varName} = ${varName.includes('PASSWORD') ? '*****' : process.env[varName]}`);
  }
});

if (missingVars.length > 0) {
  console.error('\n❌ Error: Faltan variables de entorno requeridas');
  process.exit(1);
}

console.log('\n✅ Todas las variables de entorno requeridas están configuradas correctamente');

// Mostrar configuración de cookies
console.log('\n🔧 Configuración de cookies:');
console.log(`- DOMINIO: ${process.env.COOKIE_DOMAIN || 'No definido (usando predeterminado)'}`);
console.log(`- SEGURO: ${process.env.COOKIE_SECURE || 'true (predeterminado)'}`);
console.log(`- HTTP ONLY: ${process.env.COOKIE_HTTPONLY || 'true (predeterminado)'}`);
console.log(`- SAME SITE: ${process.env.COOKIE_SAMESITE || 'lax (predeterminado)'}`);
console.log(`- DURACIÓN: ${(process.env.COOKIE_MAX_AGE || 86400000) / (1000 * 60 * 60)} horas`);

// Mostrar configuración de CORS
console.log('\n🌐 Configuración de CORS:');
console.log(`- ORÍGENES PERMITIDOS: ${process.env.ALLOWED_ORIGINS || 'No definido (permitiendo todos los orígenes)'}`);
console.log(`- MÉTODOS PERMITIDOS: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD`);

process.exit(0);
