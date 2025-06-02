import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login as authLogin } from '../auth/auth';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    cedula: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cedula') {
      // Eliminar cualquier carácter que no sea número
      const numericValue = value.replace(/\D/g, '');
      
      // Aplicar el formato XXX-XXXXXXX-X
      let formattedValue = numericValue;
      if (numericValue.length > 0) {
        formattedValue = numericValue.slice(0, 11);
        if (numericValue.length > 3) {
          formattedValue = formattedValue.slice(0, 3) + '-' + formattedValue.slice(3);
        }
        if (numericValue.length > 10) {
          formattedValue = formattedValue.slice(0, 11) + '-' + formattedValue.slice(11);
        }
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    const cedulaRegex = /^\d{3}-\d{7}-\d{1}$/;
    if (!cedulaRegex.test(formData.cedula)) {
      setError('La cédula debe tener el formato correcto (XXX-XXXXXXX-X)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await authLogin(formData);
      
      // Actualizar el estado de autenticación
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        cedula: data.user.cedula
      });

      // Redirigir al usuario
      const from = location.state?.from?.pathname || "/dashboard";
      console.log('Redirigiendo a:', from);
      navigate(from, { replace: true });
      
    } catch (err) {
      console.error('Error en el login:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-color py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            Iniciar Sesión
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="cedula" className="sr-only">
                Cédula
              </label>
              <input
                id="cedula"
                name="cedula"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border-color placeholder-text-secondary text-text-primary rounded-t-md focus:outline-none focus:ring-accent-color focus:border-accent-color focus:z-10 sm:text-sm bg-card-bg"
                placeholder="Cédula (XXX-XXXXXXX-X)"
                value={formData.cedula}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border-color placeholder-text-secondary text-text-primary rounded-b-md focus:outline-none focus:ring-accent-color focus:border-accent-color focus:z-10 sm:text-sm bg-card-bg"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent-color hover:bg-accent-color-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link to="/register" className="font-medium text-accent-color hover:text-accent-color-darker">
              ¿No tienes una cuenta? Regístrate
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
