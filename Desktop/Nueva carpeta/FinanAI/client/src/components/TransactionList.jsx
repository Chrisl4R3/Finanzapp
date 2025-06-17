import React, { useState, useEffect, useMemo } from 'react';
import { FiDollarSign, FiPlusCircle, FiAlertCircle, FiLoader, FiSearch, FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { authenticatedFetch } from '../auth/auth';
import useAuth from '../hooks/useAuth';
import { useCurrency } from '../context/CurrencyContext';
import Swal from 'sweetalert2';
import TransactionForm from './TransactionForm';
import { format, parseISO } from 'date-fns';
import es from 'date-fns/locale/es';

const CATEGORIES = {
  Income: ['Salario', 'Regalo', 'Otros-Ingreso'],
  Expense: [
    'Alimentación', 'Servicios', 'Salud', 'Vivienda', 'Educación', 'Transporte',
    'Ropa', 'Seguros', 'Mantenimiento', 'Entretenimiento', 'Pasatiempos',
    'Restaurantes', 'Compras', 'Viajes', 'Otros-Gasto'
  ]
};

const PAYMENT_METHODS = ['Efectivo', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Transferencia Bancaria'];

const TransactionList = ({ searchTerm = '' }) => {
  const { formatCurrency } = useCurrency();
  const { isAuthenticated } = useAuth();

  // States
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // Mostrar 6 transacciones por página
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTermLocal, setSearchTermLocal] = useState(searchTerm);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [goals, setGoals] = useState([]);
  const [formData, setFormData] = useState({
    type: 'Expense',
    category: '',
    amount: '',
    description: '',
    payment_method: 'Efectivo',
    date: new Date().toISOString().split('T')[0],
    status: 'Completed',
    assignToGoal: false,
    goal_id: ''
  });

  // Fetch transactions and goals
  const fetchTransactions = async () => {
    try {
      console.log('Iniciando carga de transacciones...');
      // Usamos la ruta completa incluyendo /api
      const response = await authenticatedFetch('/api/transactions');
      
      console.log('Respuesta de transacciones recibida:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta de transacciones:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Error al cargar las transacciones: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Transacciones cargadas exitosamente:', data.length);
      
      // Ordenar por fecha descendente
      const sortedTransactions = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(sortedTransactions);
      setError(null); // Limpiar errores previos
      return true;
    } catch (err) {
      console.error('Error en fetchTransactions:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      setError(err.message || 'Error al cargar las transacciones');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      console.log('Iniciando carga de metas...');
      // Usamos la ruta completa incluyendo /api
      const response = await authenticatedFetch('/api/goals');
      
      console.log('Respuesta de metas recibida:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('No se pudieron cargar las metas, continuando sin ellas. Detalles:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        return false; // No lanzar error, solo continuar sin metas
      }
      
      const data = await response.json();
      console.log('Metas cargadas exitosamente:', data.length);
      
      // Filtrar solo metas activas
      const activeGoals = data.filter(goal => goal.status === 'Active');
      console.log('Metas activas encontradas:', activeGoals.length);
      
      setGoals(activeGoals);
      return true;
    } catch (err) {
      console.warn('Error al cargar las metas, continuando sin ellas. Detalles:', {
        message: err.message,
        stack: err.stack
      });
      return false;
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    console.log('Iniciando carga de datos...');
    setIsLoading(true);
    
    const loadData = async () => {
      try {
        // 1. Cargar transacciones primero
        console.log('Cargando transacciones...');
        const transactionsLoaded = await fetchTransactions();
        
        if (!transactionsLoaded) {
          console.error('No se pudieron cargar las transacciones');
          return;
        }
        
        // 2. Intentar cargar metas (pero no es crítico si falla)
        console.log('Intentando cargar metas...');
        await fetchGoals();
        
      } catch (error) {
        console.error('Error en loadData:', {
          message: error.message,
          stack: error.stack
        });
      } finally {
        console.log('Carga de datos completada');
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Limpiar al desmontar
    return () => {
      console.log('TransactionList desmontado');
    };
  }, [isAuthenticated]);

  // Helper functions
  const formatTransactionDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'PPP', { locale: es });
    } catch {
      return dateString;
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Salario: '💰',
      Regalo: '🎁',
      'Otros-Ingreso': '📈',
      Alimentación: '🍽️',
      Servicios: '💡',
      Salud: '🏥',
      Vivienda: '🏠',
      Educación: '📚',
      Transporte: '🚗',
      Ropa: '👗',
      Seguros: '🛡️',
      Mantenimiento: '🔧',
      Entretenimiento: '🎮',
      Pasatiempos: '🎨',
      Restaurantes: '🍴',
      Compras: '🛍️',
      Viajes: '✈️',
      'Otros-Gasto': '💸'
    };
    return icons[category] || '💵';
  };

  const getMonthTotal = (transactions) => {
    return transactions.reduce((sum, tx) => {
      return tx.type === 'Income' ? sum + parseFloat(tx.amount) : sum - parseFloat(tx.amount);
    }, 0);
  };

  // Filtering and grouping
  const filteredTransactionsList = useMemo(() => {
    let result = [...transactions];

    // Apply search
    if (searchTermLocal) {
      const searchLower = searchTermLocal.toLowerCase();
      result = result.filter(tx =>
        (tx.description?.toLowerCase().includes(searchLower)) ||
        (tx.category?.toLowerCase().includes(searchLower)) ||
        (tx.payment_method?.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (selectedCategory) {
      result = result.filter(tx => tx.category === selectedCategory);
    }

    // Apply type filter
    if (selectedType !== 'all') {
      result = result.filter(tx => tx.type === selectedType);
    }

    // Apply month filter
    if (selectedMonth) {
      result = result.filter(tx => {
        const txDate = new Date(tx.date);
        const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === selectedMonth;
      });
    }

    return result;
  }, [transactions, searchTermLocal, selectedCategory, selectedType, selectedMonth]);

  const groupedTransactionsList = useMemo(() => {
    const grouped = {};
    filteredTransactionsList.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(tx);
    });

    return Object.entries(grouped)
      .map(([month, transactions]) => ({
        month,
        transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date))
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredTransactionsList]);

  const availableCategories = useMemo(() => {
    const cats = new Set();
    transactions.forEach(tx => tx.category && cats.add(tx.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const availableMonths = useMemo(() => {
    const monthSet = new Set();
    transactions.forEach(tx => {
      if (tx.date) {
        const date = new Date(tx.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(monthYear);
      }
    });
    return Array.from(monthSet).sort().reverse();
  }, [transactions]);

  // Pagination
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedTransactionsList.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedTransactionsList, currentPage, itemsPerPage]);
  
  // Alias para mantener la compatibilidad
  const filteredTransactions = filteredTransactionsList;
  const totalPages = Math.ceil(groupedTransactionsList.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTermLocal, selectedCategory, selectedType, selectedMonth]);

  // Handlers
  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type || 'Expense',
      category: transaction.category || '',
      amount: transaction.amount || '',
      description: transaction.description || '',
      payment_method: transaction.payment_method || 'Efectivo',
      date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: transaction.status || 'Completed',
      assignToGoal: !!transaction.goal_id,
      goal_id: transaction.goal_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const response = await authenticatedFetch(`/api/transactions/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar la transacción');
        setTransactions(transactions.filter(tx => tx.id !== id));
        Swal.fire('Eliminado', 'La transacción ha sido eliminada', 'success');
      } catch (err) {
        setError(err.message);
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  const handleSubmit = async (data) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!data.type || !data.category || !data.amount || !data.description || !data.payment_method) {
        throw new Error('Todos los campos son requeridos');
      }

      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser un número positivo');
      }

      if (data.assignToGoal && !data.goal_id) {
        throw new Error('Debes seleccionar una meta');
      }

      const endpoint = editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions';
      const method = editingTransaction ? 'PUT' : 'POST';

      const requestData = {
        type: data.type,
        category: data.category,
        amount: amount,
        date: data.date,
        description: data.description,
        payment_method: data.payment_method,
        status: data.status || 'Completed',
        assignToGoal: data.assignToGoal,
        goal_id: data.assignToGoal ? data.goal_id : null
      };

      const response = await authenticatedFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la transacción');
      }

      setShowForm(false);
      setEditingTransaction(null);
      setFormData({
        type: 'Expense',
        category: '',
        amount: '',
        description: '',
        payment_method: 'Efectivo',
        date: new Date().toISOString().split('T')[0],
        status: 'Completed',
        assignToGoal: false,
        goal_id: ''
      });
      await fetchTransactions();
      Swal.fire('Éxito', `Transacción ${editingTransaction ? 'actualizada' : 'creada'} correctamente`, 'success');
    } catch (err) {
      setError(err.message);
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Render
  if (isLoading && !transactions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin w-8 h-8 text-accent-color" />
      </div>
    );
  }

  if (error && !transactions.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FiAlertCircle className="w-12 h-12 text-danger-color" />
        <div className="text-xl text-danger-color">{error}</div>
      </div>
    );
  }

  if (!filteredTransactionsList.length && !isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-24 h-24 rounded-full bg-accent-color/10 flex items-center justify-center">
          <FiDollarSign className="w-12 h-12 text-accent-color" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-2">No hay transacciones</h2>
          <p className="text-text-secondary max-w-md">
            Comienza a registrar tus ingresos y gastos para tener un mejor control de tus finanzas.
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-6 py-3 bg-accent-color hover:bg-accent-color-darker text-white rounded-xl transition-all duration-300 hover:scale-105"
          onClick={() => {
            setShowForm(true);
            setEditingTransaction(null);
            setFormData({
              type: 'Expense',
              category: '',
              amount: '',
              description: '',
              payment_method: 'Efectivo',
              date: new Date().toISOString().split('T')[0],
              status: 'Completed',
              assignToGoal: false,
              goal_id: ''
            });
          }}
        >
          <FiPlusCircle className="text-xl" />
          <span>Agregar Transacción</span>
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent-color focus:border-accent-color transition-all duration-200"
                placeholder="Buscar por descripción o categoría..."
                value={searchTermLocal}
                onChange={e => setSearchTermLocal(e.target.value)}
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              id="category"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent-color focus:border-accent-color transition-all duration-200"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {availableCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              id="type"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent-color focus:border-accent-color transition-all duration-200"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="Income">Ingresos</option>
              <option value="Expense">Gastos</option>
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="month" className="text-sm font-medium text-gray-700">Mes:</label>
            <select
              id="month"
              className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent-color focus:border-accent-color transition-all duration-200"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="">Todos los meses</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-color hover:bg-accent-color-darker text-white rounded-lg transition-all duration-200 hover:shadow-md"
            onClick={() => {
              setShowForm(true);
              setEditingTransaction(null);
              setFormData({
                type: 'Expense',
                category: '',
                amount: '',
                description: '',
                payment_method: 'Efectivo',
                date: new Date().toISOString().split('T')[0],
                status: 'Completed',
                assignToGoal: false,
                goal_id: ''
              });
            }}
          >
            <FiPlus className="text-lg" />
            <span>Nueva Transacción</span>
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-card-bg rounded-xl shadow-sm overflow-hidden">
        {currentItems.map(group => (
          <div key={group.month} className="mb-10 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-text-primary">
                {new Date(group.month + '-01').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              </h2>
              <span className={`font-bold ${getMonthTotal(group.transactions) >= 0 ? 'text-success-color' : 'text-danger-color'}`}>
                Total: {getMonthTotal(group.transactions) >= 0 ? '+' : ''}{formatCurrency(getMonthTotal(group.transactions))}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {group.transactions.map(tx => (
                <div key={tx.id} className={`flex items-center justify-between rounded-xl p-4 shadow-sm transition-all ${tx.type === 'Income' ? 'bg-emerald-900/20 hover:bg-emerald-900/30 border-l-4 border-emerald-500' : 'bg-red-900/20 hover:bg-red-900/30 border-l-4 border-red-500'} hover:shadow-md`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${tx.type === 'Income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div>
                      <div className="font-medium text-text-primary text-base">{tx.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${tx.type === 'Income' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                          {tx.category}
                        </span>
                        <span className="text-xs text-text-secondary">{formatTransactionDate(tx.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[120px]">
                    <span className={`font-bold text-lg ${tx.type === 'Income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${tx.type === 'Income' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'}`}>
                      {tx.payment_method}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleEdit(tx)}
                        className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors text-text-secondary hover:text-accent-color"
                      >
                        Editar
                      </button>
                      <span className="text-border-color">•</span>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors text-text-secondary hover:text-red-400"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Paginación */}
        <div className="flex items-center justify-between px-6 py-4 bg-card-bg border-t border-border-color/20">
          <div className="text-sm text-text-secondary">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length} transacciones
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-md ${currentPage === 1 ? 'text-text-secondary/50 cursor-not-allowed' : 'text-text-primary hover:bg-secondary-bg'}`}
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded-md flex items-center justify-center ${
                  currentPage === page 
                    ? 'bg-accent-color text-white' 
                    : 'text-text-primary hover:bg-secondary-bg'
                }`}
              >
                {page}
              </button>
            )).slice(
              Math.max(0, Math.min(currentPage - 2, totalPages - 5)),
              Math.min(Math.max(5, currentPage + 2), totalPages)
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-md ${
                currentPage === totalPages 
                  ? 'text-text-secondary/50 cursor-not-allowed' 
                  : 'text-text-primary hover:bg-secondary-bg'
              }`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 shadow-lg max-w-lg w-full relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-danger-color text-xl"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
            <TransactionForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              initialData={formData}
              categories={CATEGORIES}
              paymentMethods={PAYMENT_METHODS}
              goals={goals}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;