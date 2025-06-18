import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://backend-production-cf437.up.railway.app',
        changeOrigin: true,
        secure: true,
        ws: true,
        cookieDomainRewrite: {
          '*': ''
        },
        onProxyReq: (proxyReq, req) => {
          console.log('Proxy request to:', req.url);
          // Agregar encabezados CORS
          proxyReq.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
          proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
          proxyReq.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept');
          proxyReq.setHeader('Access-Control-Allow-Credentials', 'true');
        },
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error('Proxy error:', err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
            }
            res.end(JSON.stringify({ 
              error: 'Proxy Error', 
              message: err.message,
              code: err.code
            }));
          });
          
          // Log de las peticiones al proxy
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxy request to:', req.url);
          });
          
          proxy.on('proxyRes', (proxyRes, req) => {
            proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'X-Requested-With, Content-Type, Authorization, Accept';
          });
          
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            // Agregar encabezados CORS para solicitudes de opciones
            if (req.method === 'OPTIONS') {
              proxyReq.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
              proxyReq.setHeader('Access-Control-Allow-Credentials', 'true');
              proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
              proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            // Asegurar que las cabeceras CORS estén presentes en la respuesta
            proxyRes.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000';
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
          });
        }
      }
    }
  },
  define: {
    // @ts-ignore - process is a global in Node.js
    'process.env': {}
  }
})
