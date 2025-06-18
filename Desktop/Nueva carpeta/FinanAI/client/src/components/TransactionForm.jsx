import React, { useState, useEffect, useCallback } from 'react';
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

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Cargando metas...');
      const goalsData = await getAllGoals();
      console.log('Todas las metas del servidor:', goalsData);
      
      const activeGoals = goalsData.filter(goal => goal.status === 'Active');
      console.log('Metas activas filtradas:', activeGoals);
      
      setGoals(activeGoals);
      
      // Si hay una meta seleccionada previamente, asegurarse de que el ID sea válido
      if (formData.goal_id) {
        console.log('Verificando meta seleccionada:', formData.goal_id);
        const goalExists = activeGoals.some(goal => {
          const goalId = goal._id || goal.id;
          console.log('Comparando meta:', { goalId, formGoalId: formData.goal_id, match: goalId === formData.goal_id });
          return goalId === formData.goal_id;
        });
        
        if (!goalExists) {
          console.log('Meta seleccionada no encontrada, limpiando selección');
          setFormData(prev => ({ ...prev, goal_id: '' }));
        }
      }
    } catch (err) {
      setError('Error al cargar las metas. Por favor, inténtalo de nuevo.');
      console.error('Error al cargar las metas:', err);
    } finally {
      setLoading(false);
    }
  }, [formData.goal_id]);

  useEffect(() => {
    if (formData.assignToGoal) {
      loadGoals();
    }
  }, [formData.assignToGoal, loadGoals]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('Campo cambiado:', { 
      name, 
      value, 
      type, 
      checked,
      target: e.target,
      selectedValue: e.target.value,
      selectedOptions: e.target.selectedOptions
    });
    
    setFormData(prev => {
      const newValue = type === 'checkbox' ? checked : value;
      const newData = {
        ...prev,
        [name]: newValue,
        ...(name === 'type' && {
          category: '',
          goal_id: ''
        }),
        ...(name === 'assignToGoal' && !checked && {
          goal_id: ''
        })
      };
      
      console.log('Nuevo estado de formData:', newData);
      return newData;
    });
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
    <form onSubmit={handleSubmit} className="bg-[var(--page-bg)] p-6 rounded-2xl shadow-lg text-text-primary w-full max-w-2xl mx-auto border border-border-color">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-text-secondary mb-2">Tipo</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full bg-secondary-bg text-text-primary p-3 rounded-xl border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
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
            className="w-full bg-gray-900 text-gray-100 p-3 rounded-xl border border-gray-700 focus:border-accent-color focus:ring-1 focus:ring-accent-color"
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
            <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="w-full bg-gray-900 text-gray-100 pl-10 p-3 rounded-xl border border-gray-700 focus:border-accent-color focus:ring-1 focus:ring-accent-color"
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
            <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" />
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full bg-gray-900 text-gray-100 pl-10 p-3 rounded-xl border border-gray-700 focus:border-accent-color focus:ring-1 focus:ring-accent-color"
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
            className="w-full bg-gray-900 text-gray-100 p-3 rounded-xl border border-gray-700 focus:border-accent-color focus:ring-1 focus:ring-accent-color"
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
            className="w-full bg-gray-900 text-gray-100 p-3 rounded-xl border border-gray-700 focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            placeholder="Descripción de la transacción"
            required
          />
        </div>

        <div className="col-span-2">
          <div className="flex items-center space-x-4 mt-4">
            <input
              type="checkbox"
              name="assignToGoal"
              checked={formData.assignToGoal}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-accent-color rounded border-border-color focus:ring-accent-color"
            />
            <span className="text-text-secondary cursor-pointer">Asignar a una meta de ahorro</span>
          </div>
        </div>

        {formData.assignToGoal && (
          <div className="mt-4">
            <label className="block text-text-secondary mb-2">Seleccionar Meta</label>
            {error ? (
              <div className="text-red-500 text-sm mb-2">{error}</div>
            ) : loading ? (
              <div className="flex items-center justify-center p-3 text-text-secondary">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-color mr-2"></div>
                Cargando metas...
              </div>
            ) : (
              <div className="relative">
                <select
                  id="goal-selector"
                  name="goal_id"
                  value={formData.goal_id || ''}
                  onChange={handleChange}
                  className="w-full px-6 py-2 rounded-xl bg-secondary-bg text-text-primary hover:bg-accent-color/10 transition-colors font-medium appearance-none"
                  required={formData.assignToGoal}
                >
                  <option value="">Selecciona una meta</option>
                  {goals.map(goal => {
                    const goalId = goal._id || goal.id;
                    return (
                      <option 
                        key={goalId} 
                        value={goalId}
                        data-goal={JSON.stringify(goal)}
                      >
                        {goal.name} (${goal.current_amount || goal.progress} de ${goal.target_amount})
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-600 text-white px-6 py-2 rounded-xl hover:bg-gray-700 transition-colors font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="bg-gray-600 text-white px-6 py-2 rounded-xl hover:bg-gray-700 transition-colors font-medium"
        >
          {initialData ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm; 



