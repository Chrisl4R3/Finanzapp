import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiCalendar } from 'react-icons/fi';
import { getAllGoals } from '../services/goals';

const CATEGORIES = {
  Income: [
    'Salario',
    'Freelance',
    'Inversiones',
    'Regalos',
    'Otros-Ingreso'
  ],
  Expense: [
    'Comida',
    'Transporte',
    'Vivienda',
    'Servicios',
    'Salud',
    'Educación',
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
  // Estados del formulario
  const [formData, setFormData] = useState(() => ({
    type: 'Expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: '',
    assignToGoal: false,
    goal_id: '',
    ...initialData
  }));
  
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar metas cuando se marque assignToGoal
  useEffect(() => {
    let isMounted = true;
    
    const loadGoals = async () => {
      if (!formData.assignToGoal) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('Cargando metas...');
        
        const goalsData = await getAllGoals();
        console.log('Metas recibidas:', goalsData);
        
        if (isMounted) {
          const activeGoals = goalsData.filter(goal => goal.status === 'Active');
          console.log('Metas activas:', activeGoals);
          setGoals(activeGoals);
        }
      } catch (err) {
        console.error('Error al cargar metas:', err);
        if (isMounted) {
          setError('Error al cargar las metas');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadGoals();
    
    return () => {
      isMounted = false;
    };
  }, [formData.assignToGoal]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newValue = type === 'checkbox' ? checked : value;
      const newState = { ...prev, [name]: newValue };
      
      // Si se desactiva assignToGoal, limpiamos el goal_id
      if (name === 'assignToGoal' && !checked) {
        newState.goal_id = '';
      }
      
      // Si cambia el tipo, limpiamos la categoría
      if (name === 'type') {
        newState.category = '';
      }
      
      return newState;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar el ID de la meta si está asignado a una
    if (formData.assignToGoal) {
      // Verificar que se haya seleccionado una meta
      if (!formData.goal_id) {
        setError('Debes seleccionar una meta');
        return;
      }
      
      // Verificar que el ID tenga un formato válido (24 caracteres hexadecimales para MongoDB)
      const isValidId = /^[0-9a-fA-F]{24}$/.test(formData.goal_id);
      if (!isValidId) {
        setError('El ID de la meta no tiene un formato válido');
        return;
      }
      
      // Verificar que la meta seleccionada exista en la lista de metas cargadas
      const goalExists = goals.some(goal => {
        const goalId = goal._id || goal.id;
        return goalId === formData.goal_id;
      });
      
      if (!goalExists) {
        setError('La meta seleccionada no es válida');
        return;
      }
    }
    
    // Si todo está bien, proceder con el envío
    const submissionData = {
      ...formData,
      type: formData.assignToGoal ? 'Income' : formData.type
    };
    
    console.log('Enviando datos del formulario:', submissionData);
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-text-secondary mb-2">Tipo</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-secondary-bg text-text-primary"
            disabled={formData.assignToGoal}
          >
            <option value="Income">Ingreso</option>
            <option value="Expense">Gasto</option>
          </select>
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Categoría</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-secondary-bg text-text-primary"
            required
          >
            <option value="">Selecciona una categoría</option>
            {CATEGORIES[formData.type]?.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-text-secondary mb-2">Monto</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiDollarSign className="text-text-secondary" />
            </div>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary-bg text-text-primary"
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
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCalendar className="text-text-secondary" />
            </div>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary-bg text-text-primary"
              required
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-text-secondary mb-2">Descripción</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-secondary-bg text-text-primary"
            placeholder="Ej: Compra en supermercado"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-text-secondary mb-2">Método de pago</label>
          <select
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-secondary-bg text-text-primary"
            required
          >
            <option value="">Selecciona un método de pago</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center space-x-4">
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
          <div className="md:col-span-2">
            <label className="block text-text-secondary mb-2">Seleccionar Meta</label>
            {error ? (
              <div className="text-red-500 text-sm mb-2">{error}</div>
            ) : loading ? (
              <div className="flex items-center justify-center p-3 text-text-secondary">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-color mr-2"></div>
                Cargando metas...
              </div>
            ) : (
              <select
                name="goal_id"
                value={formData.goal_id || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-secondary-bg text-text-primary"
                required={formData.assignToGoal}
              >
                <option value="">Selecciona una meta</option>
                {goals.map((goal) => {
                  const goalId = goal._id || goal.id;
                  return (
                    <option 
                      key={goalId} 
                      value={goalId}
                    >
                      {goal.name} (${goal.current_amount || goal.progress} de ${goal.target_amount})
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 rounded-lg border border-border-color text-text-secondary hover:bg-secondary-bg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 rounded-lg bg-accent-color text-white hover:bg-accent-color/90 transition-colors"
        >
          {initialData ? 'Actualizar' : 'Agregar'} Transacción
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
