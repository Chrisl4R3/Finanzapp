import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

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
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    // Validar formato de cédula dominicana (XXX-XXXXXXX-X)
    const cedulaRegex = /^\d{3}-\d{7}-\d{1}$/;
    if (!cedulaRegex.test(formData.cedula)) {
      setError('La cédula debe tener el formato correcto (XXX-XXXXXXX-X)');
      return false;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (!/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError('La contraseña debe contener al menos una letra y un número');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cedula: formData.cedula,
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar usuario');
      }

      console.log('Registro exitoso:', data);
      navigate('/login');
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      setError(error.message || 'Error al registrar usuario');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg">
      <div className="max-w-md w-full space-y-8 p-8 bg-card-bg rounded-xl shadow-lg border border-border-color">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            Registro en FinanAI
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger-color bg-opacity-10 border border-danger-color text-danger-color px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary">
                Nombre Completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-border-color bg-card-bg placeholder-text-muted text-text-primary rounded-md focus:outline-none focus:ring-accent-color focus:border-accent-color focus:z-10 sm:text-sm"
                placeholder="Nombre completo"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="cedula" className="block text-sm font-medium text-text-secondary">
                Cédula
              </label>
              <input
                id="cedula"
                name="cedula"
                type="text"
                required
                maxLength="13"
                className="appearance-none relative block w-full px-3 py-2 border border-border-color bg-card-bg placeholder-text-muted text-text-primary rounded-md focus:outline-none focus:ring-accent-color focus:border-accent-color focus:z-10 sm:text-sm"
                placeholder="Ejemplo: 402-1234567-8"
                value={formData.cedula}
                onChange={handleChange}
              />
              <p className="mt-1 text-sm text-text-secondary">
                Formato: XXX-XXXXXXX-X
              </p>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-border-color bg-card-bg placeholder-text-muted text-text-primary rounded-md focus:outline-none focus:ring-accent-color focus:border-accent-color focus:z-10 sm:text-sm"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-border-color bg-card-bg placeholder-text-muted text-text-primary rounded-md focus:outline-none focus:ring-accent-color focus:border-accent-color focus:z-10 sm:text-sm"
                placeholder="Contraseña (mínimo 8 caracteres)"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary">
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-border-color bg-card-bg placeholder-text-muted text-text-primary rounded-md focus:outline-none focus:ring-accent-color focus:border-accent-color focus:z-10 sm:text-sm"
                placeholder="Confirmar contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-page-bg bg-accent-color hover:bg-accent-color-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-color"
            >
              Registrarse
            </button>
          </div>
          
          <div className="text-center">
            <a href="/login" className="text-sm text-accent-color hover:text-accent-color-darker">
              ¿Ya tienes cuenta? Inicia sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
