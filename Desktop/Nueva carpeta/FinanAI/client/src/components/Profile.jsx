import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    cedula: user?.cedula || '',
    email: user?.email || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Aquí implementaremos la actualización del perfil
    setIsEditing(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Mi Perfil</h1>
          <p className="text-text-secondary mt-2">Gestiona tu información personal</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-accent-color flex items-center justify-center text-white text-2xl">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary">{user?.name}</h2>
                <p className="text-text-secondary">{user?.cedula}</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 rounded-lg bg-accent-color text-white hover:bg-accent-color-darker transition-colors"
            >
              {isEditing ? 'Cancelar' : 'Editar Perfil'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-text-secondary mb-2">Nombre</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-2">Cédula</label>
                <input
                  type="text"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
                  disabled
                />
                <p className="text-xs text-text-secondary mt-1">La cédula no puede ser modificada</p>
              </div>

              <div>
                <label className="block text-text-secondary mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-accent-color text-white hover:bg-accent-color-darker transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-text-secondary">Información Personal</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between py-2 border-b border-secondary-bg">
                    <span className="text-text-secondary">Nombre</span>
                    <span className="text-text-primary">{user?.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-secondary-bg">
                    <span className="text-text-secondary">Cédula</span>
                    <span className="text-text-primary">{user?.cedula}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-secondary-bg">
                    <span className="text-text-secondary">Correo</span>
                    <span className="text-text-primary">{user?.email || 'No especificado'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 