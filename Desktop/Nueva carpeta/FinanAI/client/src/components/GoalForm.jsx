import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';

const GoalForm = ({ goal, onSubmit, onClose }) => {
  const { formatCurrency } = useCurrency();
  const [formData, setFormData] = useState({
    name: '',
    type: 'Saving',
    target_amount: '',
    end_date: '',
    payment_schedule: null,
    status: 'Active'
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name || '',
        type: goal.type || 'Saving',
        target_amount: goal.target_amount || '',
        end_date: goal.end_date ? new Date(goal.end_date).toISOString().split('T')[0] : '',
        payment_schedule: goal.payment_schedule || null,
        status: goal.status || 'Active'
      });
    }
  }, [goal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.name.trim()) {
      setError('El nombre de la meta es requerido');
      return;
    }

    if (!formData.target_amount || formData.target_amount <= 0) {
      setError('El monto objetivo debe ser mayor a 0');
      return;
    }

    if (!formData.end_date) {
      setError('La fecha límite es requerida');
      return;
    }

    // Validar que la fecha no sea anterior a hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.end_date);
    if (selectedDate < today) {
      setError('La fecha límite no puede ser anterior a hoy');
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar la meta');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card-bg rounded-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          {goal ? 'Editar Meta' : 'Nueva Meta'}
        </h2>

        {error && (
          <div className="bg-danger-color bg-opacity-10 border border-danger-color text-danger-color px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Nombre de la Meta
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
              placeholder="Ej: Fondo de emergencia"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Tipo de Meta
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
            >
              <option value="Saving">Ahorro</option>
              <option value="Spending Reduction">Reducción de Gastos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Monto Objetivo
            </label>
            <input
              type="number"
              name="target_amount"
              value={formData.target_amount}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Fecha Límite
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-accent-color text-white rounded-lg hover:bg-accent-color-darker transition-colors"
            >
              {goal ? 'Guardar Cambios' : 'Crear Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalForm; 