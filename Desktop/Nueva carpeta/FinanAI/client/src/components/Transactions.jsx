import React, { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../auth/auth';
import useAuth from '../hooks/useAuth';
import { useCurrency } from '../context/CurrencyContext';
import TransactionList from './TransactionList';
import ScheduledTransactions from './ScheduledTransactions';
import { FiList, FiClock, FiPlus } from 'react-icons/fi';
import Swal from 'sweetalert2';

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
  const [_error, setError] = useState(null); 
  const [_editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('regular');
  
  const [_formData, setFormData] = useState({
    type: 'Expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'Efectivo',
    status: 'Completed'
  });

  const fetchTransactions = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [isAuthenticated, fetchTransactions]);

  useEffect(() => {
    if (!transactions.length) return;

    const filtered = transactions.filter(transaction => {
      const searchTermLower = searchTerm.toLowerCase();
      const amount = transaction.amount.toString();
      const date = transaction.date;
      const description = transaction.description.toLowerCase();
      const category = transaction.category.toLowerCase();
      const type = transaction.type.toLowerCase();
      const paymentMethod = transaction.payment_method.toLowerCase();

      return amount.includes(searchTermLower) ||
             date.includes(searchTermLower) ||
             description.includes(searchTermLower) ||
             category.includes(searchTermLower) ||
             type.includes(searchTermLower) ||
             paymentMethod.includes(searchTermLower);
    });

    setFilteredTransactions(filtered);
  }, [searchTerm, transactions]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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

  // Función para agrupar transacciones por fecha
  const groupTransactionsByDate = (transactions) => {
    const groups = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0];
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
      .map(([, group]) => group);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">
          Transacciones
        </h1>
          </div>

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
      ) : activeTab === 'regular' ? ( // This condition appears to be a duplicate
        <>
        <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar por Fecha, Descripción, Categoría, Monto"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-color focus:border-accent-color"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <TransactionList
            groupedTransactions={groupTransactionsByDate(filteredTransactions)}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getCategoryIcon={getCategoryIcon}
            onEdit={handleEdit}
            onDelete={handleDelete}
 />
        </>
      )
       : (
        <ScheduledTransactions />
      )}
    </div>
  );
};

export default Transactions;
