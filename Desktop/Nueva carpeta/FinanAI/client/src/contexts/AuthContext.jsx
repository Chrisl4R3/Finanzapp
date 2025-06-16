import { createContext } from 'react';
import { AuthContextType } from './authTypes';

// Crear y exportar el contexto de autenticación
const AuthContext = createContext(AuthContextType);

export default AuthContext;
