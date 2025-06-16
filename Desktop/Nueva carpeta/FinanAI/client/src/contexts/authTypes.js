// Definir el tipo del contexto
export const AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  initialCheckComplete: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  refreshToken: async () => {},
  clearAuth: () => {}
};
