import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
      const response = await fetch('https://backend-production-cf437.up.railway.app/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log('Respuesta del login:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Guardar el token en sessionStorage
      sessionStorage.setItem('token', data.token);
      console.log('Token guardado:', data.token);

      // Actualizar el estado de autenticación
      await login({
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
    <div className="min-h-screen flex items-center justify-center bg-background-color">
      <div className="max-w-md w-full space-y-8 p-8 bg-card-bg rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            Iniciar Sesión
          </h2>
        </div>
        {error && (
          <div className="bg-danger-color bg-opacity-10 border border-danger-color border-opacity-20 text-danger-color px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="cedula" className="block text-sm font-medium text-text-secondary mb-2">Cédula</label>
              <input
                id="cedula"
                name="cedula"
                type="text"
                required
                maxLength="13"
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-secondary-bg placeholder-text-secondary text-text-primary bg-secondary-bg focus:outline-none focus:ring-2 focus:ring-accent-color focus:border-transparent"
                placeholder="Ejemplo: 402-1234567-8"
                value={formData.cedula}
                onChange={handleChange}
              />
              <p className="mt-1 text-sm text-text-secondary">
                Formato: XXX-XXXXXXX-X
              </p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-secondary-bg placeholder-text-secondary text-text-primary bg-secondary-bg focus:outline-none focus:ring-2 focus:ring-accent-color focus:border-transparent"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                isLoading 
                  ? 'bg-accent-color-darker cursor-not-allowed'
                  : 'bg-accent-color hover:bg-accent-color-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color'
              }`}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>

          <div className="text-center">
            <Link 
              to="/register" 
              className="font-medium text-accent-color hover:text-accent-color-darker"
            >
              ¿No tienes una cuenta? Regístrate
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
