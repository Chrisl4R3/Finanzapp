import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background-color">
      {/* Navbar */}
      <nav className="bg-card-bg shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo y nombre */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-accent-color">Finanzapp</span>
            </Link>

            {/* Navegación principal */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/dashboard" className="text-text-primary hover:text-accent-color transition-colors">
                Dashboard
              </Link>
              <Link to="/transactions" className="text-text-primary hover:text-accent-color transition-colors">
                Transacciones
              </Link>
              <Link to="/goals" className="text-text-primary hover:text-accent-color transition-colors">
                Metas
              </Link>
              <Link to="/statistics" className="text-text-primary hover:text-accent-color transition-colors">
                Estadísticas
              </Link>
            </div>

            {/* Menú de perfil */}
            <div className="flex items-center">
              {/* Menú de perfil */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-3 bg-card-bg rounded-xl px-4 py-2 text-text-secondary hover:bg-secondary-bg transition-all duration-300 focus:outline-none"
                >
                  <div className="w-10 h-10 rounded-full bg-accent-color/80 flex items-center justify-center text-white/90 text-xl">
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-lg font-medium">{user?.name}</span>
                  <svg 
                    className={`w-5 h-5 transition-transform duration-200 ${showProfileMenu ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Menú desplegable */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-card-bg shadow-xl py-2 z-[9999]">
                    <div className="px-4 py-3 border-b border-secondary-bg/10">
                      <p className="text-base font-medium text-text-primary">{user?.name}</p>
                      <p className="text-sm text-text-secondary truncate mt-1">{user?.cedula}</p>
                    </div>
                    
                    <div className="py-2">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-3 text-base text-text-secondary hover:bg-secondary-bg transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <svg className="w-5 h-5 mr-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Mi Perfil
                      </Link>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-base text-danger-color hover:bg-secondary-bg transition-colors"
                      >
                        <svg className="w-5 h-5 mr-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-12 mt-6">
        {children}
      </main>
    </div>
  );
};

export default Layout; 