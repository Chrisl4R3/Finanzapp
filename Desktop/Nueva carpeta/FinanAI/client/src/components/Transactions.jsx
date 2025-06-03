import React, { useState, useEffect } from 'react';
import { authenticatedFetch } from '../auth/auth';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import TransactionList from './TransactionList';
import ScheduledTransactions from './ScheduledTransactions';
import { FiList, FiClock } from 'react-icons/fi';

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
  const { isAuthenticated } = useAuth();
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('regular');
  
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
    if (isAuthenticated) {
    fetchTransactions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!transactions.length) return;

    const filtered = transactions.filter(transaction => {
      const searchTermLower = searchTerm.toLowerCase();
      const amount = transaction.amount.toString();
      const date = transaction.date;
      const description = transaction.description.toLowerCase();
      const category = transaction.category.toLowerCase();
      const type = transaction.type.toLowerCase();

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

      const response = await authenticatedFetch('/transactions');
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
      await authenticatedFetch(`/transactions/${id}`, {
        method: 'DELETE'
      });

      setTransactions(prev => prev.filter(t => t.id !== id));
      setFilteredTransactions(prev => prev.filter(t => t.id !== id));
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

      const endpoint = editingTransaction 
        ? `/transactions/${editingTransaction.id}`
        : '/transactions';

      const method = editingTransaction ? 'PUT' : 'POST';

      const response = await authenticatedFetch(endpoint, {
        method,
        body: JSON.stringify({
          ...formData,
          amount
        })
      });

      const data = await response.json();

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
      await fetchTransactions();
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
    <div className="container mx-auto px-4 py-8">
      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('regular')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 ${
            activeTab === 'regular'
              ? 'bg-accent-color text-white'
              : 'bg-card-bg text-text-secondary hover:bg-accent-color/10'
          }`}
        >
          <FiList className="w-5 h-5" />
          <span>Transacciones</span>
        </button>
          <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 ${
            activeTab === 'scheduled'
              ? 'bg-accent-color text-white'
              : 'bg-card-bg text-text-secondary hover:bg-accent-color/10'
          }`}
        >
          <FiClock className="w-5 h-5" />
          <span>Programadas</span>
          </button>
      </div>

      {/* Content */}
      {activeTab === 'regular' ? (
        <TransactionList />
      ) : (
        <ScheduledTransactions />
      )}
    </div>
  );
};

export default Transactions;
