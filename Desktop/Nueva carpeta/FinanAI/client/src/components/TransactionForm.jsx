import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCalendar } from 'react-icons/fi';
import { getAllGoals } from '../services/goals';

const CATEGORIES = {
  Income: ['Salario', 'Regalo', 'Inversiones', 'Otros-Ingreso'],
  Expense: [
    'Alimentación',
    'Servicios',
    'Salud',
    'Vivienda',
    'Educación',
    'Transporte',
    'Ropa',
    'Seguros',
    'Mantenimiento',
    'Entretenimiento',
    'Pasatiempos',
    'Restaurantes',
    'Compras',
    'Viajes',
    'Otros-Gasto'
  ]
};

const PAYMENT_METHODS = [
  'Efectivo',
  'Tarjeta de Débito',
  'Tarjeta de Crédito',
  'Transferencia Bancaria'
];

const TransactionForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    type: 'Expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: '',
    assignToGoal: false,
    goal_id: '',
    ...initialData
  });

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (formData.assignToGoal) {
      loadGoals();
    }
  }, [formData.assignToGoal]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const goalsData = await getAllGoals();
      setGoals(goalsData);
    } catch (err) {
      setError('Error al cargar las metas');
      console.error('Error al cargar las metas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'type' && {
        category: '',
        goal_id: ''
      }),
      ...(name === 'assignToGoal' && !checked && {
        goal_id: ''
      })
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Si está asignado a una meta, forzamos el tipo a 'Income'
    const submissionData = {
      ...formData,
      type: formData.assignToGoal ? 'Income' : formData.type
    };
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card-bg p-6 rounded-2xl shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-text-secondary mb-2">Tipo</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full bg-background-color text-text-primary p-3 rounded-xl border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
            disabled={formData.assignToGoal}
          >
            <option value="Expense">Gasto</option>
            <option value="Income">Ingreso</option>
          </select>
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Categoría</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full bg-background-color text-text-primary p-3 rounded-xl border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
          >
            <option value="">Selecciona una categoría</option>
            {CATEGORIES[formData.assignToGoal ? 'Income' : formData.type]?.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Monto</label>
          <div className="relative">
            <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="w-full bg-background-color text-text-primary pl-10 p-3 rounded-xl border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Fecha</label>
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full bg-background-color text-text-primary pl-10 p-3 rounded-xl border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Método de Pago</label>
          <select
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            className="w-full bg-background-color text-text-primary p-3 rounded-xl border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
          >
            <option value="">Selecciona un método</option>
            {PAYMENT_METHODS.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Descripción</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full bg-background-color text-text-primary p-3 rounded-xl border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            placeholder="Descripción de la transacción"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="flex items-center space-x-2 text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              name="assignToGoal"
              checked={formData.assignToGoal}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-accent-color rounded border-border-color focus:ring-accent-color"
            />
            <span>Asignar directamente a una meta</span>
          </label>
        </div>

        {formData.assignToGoal && (
          <div className="col-span-2">
            <label className="block text-text-secondary mb-2">Meta</label>
            <select
              name="goal_id"
              value={formData.goal_id}
              onChange={handleChange}
              className="w-full bg-background-color text-text-primary p-3 rounded-xl border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
              required
            >
              <option value="">Selecciona una meta</option>
              {goals.map(goal => (
                <option key={goal.id} value={goal.id}>
                  {goal.title} - Progreso: {((goal.current_amount / goal.target_amount) * 100).toFixed(1)}%
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 rounded-xl border border-border-color text-text-secondary hover:bg-background-color transition-all duration-300"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 rounded-xl bg-accent-color text-white hover:bg-accent-color-darker transition-all duration-300"
        >
          {initialData ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm; 