import { useNavigate, NavLink } from 'react-router-dom';
import { logout } from '../auth/auth';
import { FiHome, FiDollarSign, FiTarget, FiBarChart2, FiLogOut, FiUser, FiChevronDown } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Cerrar el menú cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="bg-card-bg shadow-lg backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <span className="text-3xl font-bold bg-gradient-to-r from-accent-color to-purple-500 bg-clip-text text-transparent tracking-tight hover:scale-105 transition-transform duration-300">
              Finanzapp
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `
                px-5 py-2.5 rounded-xl transition-all duration-300
                flex items-center gap-3 font-medium text-[15px] tracking-wide
                ${isActive 
                  ? 'bg-accent-color/10 text-accent-color scale-105' 
                  : 'text-text-secondary hover:text-accent-color hover:bg-accent-color/5 hover:scale-105'
                }
              `}
            >
              <FiHome className="text-xl" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/transactions"
              className={({ isActive }) => `
                px-5 py-2.5 rounded-xl transition-all duration-300
                flex items-center gap-3 font-medium text-[15px] tracking-wide
                ${isActive 
                  ? 'bg-accent-color/10 text-accent-color scale-105' 
                  : 'text-text-secondary hover:text-accent-color hover:bg-accent-color/5 hover:scale-105'
                }
              `}
            >
              <FiDollarSign className="text-xl" />
              <span>Transacciones</span>
            </NavLink>

            <NavLink
              to="/goals"
              className={({ isActive }) => `
                px-5 py-2.5 rounded-xl transition-all duration-300
                flex items-center gap-3 font-medium text-[15px] tracking-wide
                ${isActive 
                  ? 'bg-accent-color/10 text-accent-color scale-105' 
                  : 'text-text-secondary hover:text-accent-color hover:bg-accent-color/5 hover:scale-105'
                }
              `}
            >
              <FiTarget className="text-xl" />
              <span>Metas</span>
            </NavLink>

            <NavLink
              to="/statistics"
              className={({ isActive }) => `
                px-5 py-2.5 rounded-xl transition-all duration-300
                flex items-center gap-3 font-medium text-[15px] tracking-wide
                ${isActive 
                  ? 'bg-accent-color/10 text-accent-color scale-105' 
                  : 'text-text-secondary hover:text-accent-color hover:bg-accent-color/5 hover:scale-105'
                }
              `}
            >
              <FiBarChart2 className="text-xl" />
              <span>Estadísticas</span>
            </NavLink>

            <div className="h-8 w-[1px] bg-border-color/10 mx-3"></div>

            {/* Menú de perfil */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="px-5 py-2.5 rounded-xl transition-all duration-300
                  flex items-center gap-3 font-medium text-[15px] tracking-wide
                  text-text-primary hover:bg-accent-color/5 hover:scale-105"
              >
                <div className="w-8 h-8 rounded-full bg-accent-color/10 flex items-center justify-center">
                  <FiUser className="text-xl text-accent-color" />
                </div>
                <span>{user?.name || 'Usuario'}</span>
                <FiChevronDown className={`text-lg transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Menú desplegable */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-card-bg border border-border-color/10 shadow-lg backdrop-blur-xl z-50 overflow-hidden">
                  <div className="p-4 border-b border-border-color/10">
                    <p className="text-sm text-text-secondary">Conectado como</p>
                    <p className="font-medium text-text-primary truncate">{user?.email || 'usuario@email.com'}</p>
                  </div>
                  
                  <div className="p-2">
                    <NavLink
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px]
                        text-text-primary hover:bg-accent-color/5 transition-colors duration-300"
                    >
                      <FiUser className="text-lg" />
                      <span>Mi Perfil</span>
                    </NavLink>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px]
                        text-danger-color hover:bg-danger-color/10 transition-colors duration-300"
                    >
                      <FiLogOut className="text-lg" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
