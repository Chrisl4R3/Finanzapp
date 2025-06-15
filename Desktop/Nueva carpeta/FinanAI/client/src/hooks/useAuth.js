import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

// Hook personalizado para usar el contexto de autenticación
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

export default useAuth;
