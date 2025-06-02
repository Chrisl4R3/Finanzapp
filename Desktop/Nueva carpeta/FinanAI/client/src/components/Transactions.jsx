import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';

const CATEGORIES = {
  Income: ['Salario', 'Regalo', 'Otros-Ingreso'],
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

const PAYMENT_METHODS = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia Bancaria'];

const Transactions = () => {
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'Expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'Efectivo',
    status: 'Completed'
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTransactions(transactions);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = transactions.filter(transaction => {
      const amount = transaction.amount.toString();
      const date = new Date(transaction.date).toLocaleDateString();
      const description = transaction.description.toLowerCase();
      const category = transaction.category.toLowerCase();
      const type = transaction.type === 'Income' ? 'ingreso' : 'gasto';

      return amount.includes(searchTermLower) ||
             date.includes(searchTermLower) ||
             description.includes(searchTermLower) ||
             category.includes(searchTermLower) ||
             type.includes(searchTermLower);
    });

    setFilteredTransactions(filtered);
  }, [searchTerm, transactions]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('https://backend-production-cf437.up.railway.app/api/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar las transacciones');
      }
      
      const data = await response.json();
      setTransactions(data);
      setFilteredTransactions(data);
    } catch (err) {
      setError('Error al cargar las transacciones: ' + err.message);
      console.error('Error detallado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'type' ? { category: '' } : {})
    }));
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      date: transaction.date.split('T')[0],
      description: transaction.description,
      payment_method: transaction.payment_method,
      status: transaction.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`http://localhost:3000/api/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar la transacción');
      }

      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError('Error al eliminar la transacción: ' + err.message);
      console.error('Error detallado:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Validaciones
      if (!formData.type || !formData.category || !formData.amount || !formData.date || !formData.description || !formData.payment_method) {
        throw new Error('Todos los campos son requeridos');
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser un número positivo');
      }

      if (!CATEGORIES[formData.type].includes(formData.category)) {
        throw new Error(`Categoría inválida para ${formData.type}`);
      }

      const url = editingTransaction 
        ? `http://localhost:3000/api/transactions/${editingTransaction.id}`
        : 'http://localhost:3000/api/transactions';

      const method = editingTransaction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          amount
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `Error al ${editingTransaction ? 'actualizar' : 'crear'} la transacción`);
      }

      // Limpiar formulario y actualizar lista
      setFormData({
        type: 'Expense',
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        payment_method: 'Efectivo',
        status: 'Completed'
      });
      setShowForm(false);
      setEditingTransaction(null);
      fetchTransactions();
    } catch (err) {
      setError('Error al guardar la transacción: ' + err.message);
      console.error('Error detallado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para agrupar transacciones por fecha
  const groupTransactionsByDate = (transactions) => {
    const groups = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dateKey = date.toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: new Date(dateKey),
          transactions: [],
          total: 0
        };
      }
      groups[dateKey].transactions.push(transaction);
      groups[dateKey].total += transaction.type === 'Income' ? 
        parseFloat(transaction.amount) : 
        -parseFloat(transaction.amount);
    });
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
      .map(([_, group]) => group);
  };

  // Función para formatear la fecha
  const formatDate = (date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return `${days[date.getDay()]}, ${date.getDate()} De ${months[date.getMonth()]}`;
  };

  // Función para obtener el icono según la categoría
  const getCategoryIcon = (category) => {
    const icons = {
      'Alimentación': '🛒',
      'Servicios': '💡',
      'Salud': '💊',
      'Vivienda': '🏠',
      'Educación': '📚',
      'Transporte': '🚗',
      'Ropa': '👕',
      'Seguros': '🔒',
      'Mantenimiento': '🔧',
      'Entretenimiento': '🎮',
      'Pasatiempos': '⚽',
      'Restaurantes': '🍽️',
      'Compras': '🛍️',
      'Viajes': '✈️',
      'Salario': '💰',
      'Regalo': '🎁',
      'Otros-Ingreso': '💵',
      'Otros-Gasto': '📝'
    };
    return icons[category] || '💰';
  };

  if (isLoading && !showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-24">
      {/* Barra superior con filtros */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-12">
        <div className="flex-1 w-full">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar transacción..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full p-4 mt-6 rounded-xl bg-card-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <select
            className="p-4 mt-6 rounded-xl bg-card-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
            defaultValue="all"
          >
            <option value="all">Todas las categorías</option>
            {CATEGORIES.Income.map(cat => (
              <option key={`income-${cat}`} value={cat}>{cat}</option>
            ))}
            {CATEGORIES.Expense.map(cat => (
              <option key={`expense-${cat}`} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="p-4 mt-6 rounded-xl bg-card-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
            defaultValue="all"
          >
            <option value="all">Todo el tiempo</option>
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="year">Este año</option>
          </select>
          <button
            onClick={() => {
              setEditingTransaction(null);
              setShowForm(!showForm);
              setFormData({
                type: 'Expense',
                category: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                description: '',
                payment_method: 'Efectivo',
                status: 'Completed'
              });
            }}
            className="p-4 mt-6 rounded-xl bg-accent-color text-page-bg hover:bg-accent-color-darker transition-all duration-300"
          >
            {showForm ? 'Cancelar' : 'Nueva Transacción'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-color bg-opacity-10 border border-danger-color text-danger-color px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="card mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">
            {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-secondary mb-2">Tipo</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full p-2 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
                  required
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
                  className="w-full p-2 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {CATEGORIES[formData.type].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-secondary mb-2">Monto</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full p-2 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-2">Fecha</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full p-2 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
                  required
                />
              </div>

              <div>
                <label className="block text-text-secondary mb-2">Método de Pago</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full p-2 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
                  required
                >
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
                  className="w-full p-2 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                className="bg-accent-color text-page-bg px-6 py-2 rounded-lg hover:bg-accent-color-darker transition-all duration-300 transform hover:-translate-y-1"
                disabled={isLoading}
              >
                {isLoading ? 'Guardando...' : editingTransaction ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de transacciones agrupadas por fecha */}
      <div className="space-y-8">
        {groupTransactionsByDate(filteredTransactions).map(group => (
          <div key={group.date.toISOString()} className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-text-primary">
                {formatDate(group.date)}
              </h2>
              <span className={`text-lg font-medium ${
                group.total >= 0 ? 'amount-positive' : 'amount-negative'
              }`}>
                Total: {formatCurrency(group.total)}
              </span>
            </div>
            <div className="space-y-2">
              {group.transactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="card hover:transform hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">
                        {getCategoryIcon(transaction.category)}
                      </div>
                      <div>
                        <h3 className="text-text-primary font-medium">
                          {transaction.description}
                        </h3>
                        <p className="text-text-secondary text-sm">
                          {transaction.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`text-lg font-medium ${
                        transaction.type === 'Income' ? 'amount-positive' : 'amount-negative'
                      }`}>
                        {transaction.type === 'Income' ? '+' : '-'}
                        {formatCurrency(Math.abs(parseFloat(transaction.amount)))}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-2 text-text-secondary hover:text-accent-color transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="p-2 text-text-secondary hover:text-danger-color transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-secondary">
              {searchTerm ? 'No se encontraron transacciones que coincidan con la búsqueda' : 'No hay transacciones registradas'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
