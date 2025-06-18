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
  const [itemsPerPage] = useState(6); 
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTermLocal, setSearchTermLocal] = useState(searchTerm);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');

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
      
      const sortedTransactions = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(sortedTransactions);
      setError(null); 
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



  useEffect(() => {
    if (!isAuthenticated) return;
    
    console.log('Iniciando carga de datos...');
    setIsLoading(true);
    
    const loadData = async () => {
      try {
        console.log('Cargando transacciones...');
        const transactionsLoaded = await fetchTransactions();
        
        if (!transactionsLoaded) {
          console.error('No se pudieron cargar las transacciones');
          return;
        }
        
        // Meta loading functionality removed as it's not being used
        
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
      Ropa: '👕',
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


  // Filtering and grouping
  const filteredTransactionsList = useMemo(() => {
    let result = [...transactions];

    if (searchTermLocal) {
      const searchLower = searchTermLocal.trim().toLowerCase();
      
      const searchNumber = parseFloat(searchLower.replace(/[^0-9.,]/g, '').replace(',', '.'));
      const isNumberSearch = !isNaN(searchNumber);

      result = result.filter(tx => {
        const textMatch = 
          (tx.description?.toLowerCase().includes(searchLower)) ||
          (tx.category?.toLowerCase().includes(searchLower)) ||
          (tx.payment_method?.toLowerCase().includes(searchLower));

        let amountMatch = false;
        if (isNumberSearch) {
          try {
            const txAmount = typeof tx.amount === 'string' 
              ? parseFloat(tx.amount.replace(/[^0-9.,]/g, '').replace(',', '.')) 
              : Number(tx.amount);
            
            amountMatch = tx.amount.toString().includes(searchLower) || 
                        (!isNaN(txAmount) && Math.abs(txAmount - searchNumber) < 0.01);
          } catch (e) {
            console.warn('Error al procesar monto de transacción:', tx.amount, e);
          }
        }
        
        return textMatch || amountMatch;
      });
      
      console.log('Resultados encontrados:', result.length);
    }

    if (selectedCategory) {
      result = result.filter(tx => tx.category === selectedCategory);
    }

    if (selectedType !== 'all') {
      result = result.filter(tx => tx.type === selectedType);
    }

    if (selectedMonth) {
      result = result.filter(tx => {
        const txDate = new Date(tx.date);
        const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === selectedMonth;
      });
    }

    return result;
  }, [transactions, searchTermLocal, selectedCategory, selectedType, selectedMonth]);


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
  const totalPages = Math.ceil(
    filteredTransactionsList.length / itemsPerPage
  );


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

  const handleSaveTransaction = async (data) => {
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

  // Render loading state
  if (isLoading && !transactions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin w-8 h-8 text-accent-color" />
      </div>
    );
  }

  // Render error state
  if (error && !transactions.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FiAlertCircle className="w-12 h-12 text-danger-color" />
        <div className="text-xl text-danger-color">{error}</div>
      </div>
    );
  }

  // Check if it's an empty state or search with no results
  const showNoTransactions = !isLoading && filteredTransactionsList.length === 0;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Transacciones</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar transacciones..."
            className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent-color focus:border-accent-color transition-all duration-200 w-64"
            value={searchTermLocal}
            onChange={e => setSearchTermLocal(e.target.value)}
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <select
                id="category"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1">
              <select
                id="type"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="Income">Ingresos</option>
                <option value="Expense">Gastos</option>
              </select>
            </div>
            <div className="relative flex-1">
              <select
                id="month"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                <option value="">Todos los meses</option>
                {availableMonths.map(month => {
                  const [year, monthNum] = month.split('-');
                  const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleString('es-ES', { month: 'long' });
                  return (
                    <option key={month} value={month}>
                      {`${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <div className="relative">
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar transacciones..."
                value={searchTermLocal}
                onChange={e => setSearchTermLocal(e.target.value)}
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de transacciones */}
      <div className="bg-card-bg rounded-xl p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Transacciones Recientes</h2>
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

      {/* Mensaje cuando no hay transacciones */}
      {showNoTransactions && (
        <div className="py-12 text-center">
          <FiSearch className="mx-auto w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No se ha encontrado lo que busca</h3>
          <p className="text-gray-500 mt-1">
            {searchTermLocal 
              ? `No hay resultados para "${searchTermLocal}"`
              : 'Intenta con otros filtros de búsqueda'}
          </p>
        </div>
      )}

      {/* Lista de transacciones */}
      {!showNoTransactions && filteredTransactionsList.length > 0 && (
        <div className="bg-background rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="space-y-4">
              {filteredTransactionsList.slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              ).map((tx) => (
                <div key={tx._id} className="bg-card-bg rounded-lg p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div>
                      <h4 className="font-medium text-text-primary">{tx.description}</h4>
                      <p className="text-sm text-text-secondary">
                        {formatTransactionDate(tx.date)} • {tx.category}
                      </p>
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

            {/* Paginación */}
            <div className="flex items-center justify-between px-6 py-4 bg-card-bg border-t border-border-color/20 mt-6">
              <div className="text-sm text-text-secondary">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredTransactionsList.length)} de {filteredTransactionsList.length} transacciones
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md ${currentPage === 1 ? 'text-text-secondary/50 cursor-not-allowed' : 'text-text-primary hover:bg-secondary-bg'}`}
                >
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-md flex items-center justify-center ${
                        currentPage === page
                          ? 'bg-accent-color text-white'
                          : 'text-text-secondary hover:bg-secondary-bg'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
        </div>
      )}

      {/* Formulario de transacción */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <TransactionForm
              onSubmit={handleSaveTransaction}
              onCancel={() => setShowForm(false)}
              initialData={editingTransaction || formData}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;