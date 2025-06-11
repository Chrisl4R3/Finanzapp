import React, { useState, useEffect, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { 
  FiDollarSign, 
  FiPlusCircle, 
  FiAlertCircle, 
  FiLoader, 
  FiSearch,
  FiFilter,
  FiArrowUp,
  FiArrowDown,
  FiCalendar,
  FiTrendingUp,
  FiTrendingDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiPlus
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { authenticatedFetch } from '../auth/auth';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import TransactionForm from './TransactionForm';
// ... rest of imports ...

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

const TransactionList = ({ searchTerm = '', filters = {} }) => {
  const { formatCurrency } = useCurrency();
  const { isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTermLocal, setSearchTermLocal] = useState(searchTerm);
  const [goals, setGoals] = useState([]);
  const [localFilters, setLocalFilters] = useState({
    type: 'all',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: ''
  });
  const [formData, setFormData] = useState({
    type: 'Expense',
    category: '',
    amount: '',
    description: '',
    payment_method: 'Efectivo',
    date: new Date().toISOString().split('T')[0],
    status: 'Completed',
    schedule: null,
    recurrence: '',
    is_scheduled: 0,
    end_date: null,
    parent_transaction_id: null,
    assignToGoal: false,
    goal_id: ''
  });
  const [groupedTransactions, setGroupedTransactions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchTermGlobal, setSearchTermGlobal] = useState('');

  // Calcular resumen de transacciones
  const transactionSummary = transactions.reduce((summary, transaction) => {
    if (transaction.type === 'income') {
      summary.totalIncome += parseFloat(transaction.amount);
      summary.totalTransactions.income++;
    } else {
      summary.totalExpenses += parseFloat(transaction.amount);
      summary.totalTransactions.expenses++;
    }
    return summary;
  }, {
    totalIncome: 0,
    totalExpenses: 0,
    totalTransactions: { income: 0, expenses: 0 }
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions();
      fetchGoals();
    }
  }, [isAuthenticated]);

  // Ordenar transacciones por fecha más reciente
  useEffect(() => {
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    setTransactions(sortedTransactions);
  }, [transactions.length]);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTermLocal.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTermLocal.toLowerCase());
    
    const matchesType = localFilters.type === 'all' || transaction.type === localFilters.type;
    
    const amount = parseFloat(transaction.amount);
    const matchesAmount = (!localFilters.minAmount || amount >= parseFloat(localFilters.minAmount)) &&
                         (!localFilters.maxAmount || amount <= parseFloat(localFilters.maxAmount));
    
    const date = new Date(transaction.date);
    const matchesDate = (!localFilters.startDate || date >= new Date(localFilters.startDate)) &&
                       (!localFilters.endDate || date <= new Date(localFilters.endDate));

    return matchesSearch && matchesType && matchesAmount && matchesDate;
  });

    const fetchTransactions = async () => {
      try {
      setIsLoading(true);
      setError(null);

      const response = await authenticatedFetch('/transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      setError(err.message);
      console.error('Error detallado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await authenticatedFetch('/goals');
      const data = await response.json();
      // Solo mostrar metas activas que no estén completadas
      const activeGoals = data.filter(goal => goal.status === 'Active');
      setGoals(activeGoals);
    } catch (err) {
      console.error('Error al cargar las metas:', err);
    }
  };

  const handleSubmit = async (dataOrEvent) => {
    let data;
    if (dataOrEvent && dataOrEvent.preventDefault) {
      // Llamado desde un submit tradicional (no debería pasar)
      dataOrEvent.preventDefault();
      data = formData;
    } else {
      // Llamado desde TransactionForm pasando los datos
      data = dataOrEvent;
    }
    try {
      setIsLoading(true);
      setError(null);

      // Validaciones básicas
      if (!data.type || !data.category || !data.amount || !data.description || !data.payment_method) {
        throw new Error('Todos los campos son requeridos');
      }

      if (data.assignToGoal && !data.goal_id) {
        throw new Error('Debes seleccionar una meta');
      }

      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser un número positivo');
      }

      const endpoint = editingTransaction 
        ? `/transactions/${editingTransaction.id}`
        : '/transactions';

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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la transacción');
      }

      // Limpiar formulario y actualizar lista
      setFormData({
        type: 'Expense',
        category: '',
        amount: '',
        description: '',
        payment_method: 'Efectivo',
        date: new Date().toISOString().split('T')[0],
        status: 'Completed',
        schedule: null,
        recurrence: '',
        is_scheduled: 0,
        end_date: null,
        parent_transaction_id: null,
        assignToGoal: false,
        goal_id: ''
      });
      setShowForm(false);
      setEditingTransaction(null);
      await Promise.all([
        fetchTransactions(),
        fetchGoals(),
        fetchGroupedTransactions()
      ]);
    } catch (err) {
      console.error('Error completo:', err);
      setError('Error al guardar la transacción: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await authenticatedFetch(`/transactions/${id}`, {
          method: 'DELETE',
        });
        await fetchTransactions();
      } catch (err) {
        setError('Error al eliminar la transacción');
        console.error('Error:', err);
      }
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      description: transaction.description,
      payment_method: transaction.payment_method,
      date: transaction.date,
      status: transaction.status,
      schedule: transaction.schedule,
      recurrence: transaction.recurrence,
      is_scheduled: transaction.is_scheduled,
      end_date: transaction.end_date,
      parent_transaction_id: transaction.parent_transaction_id,
      assignToGoal: false,
      goal_id: ''
    });
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'type' ? { category: '' } : {})
    }));
  };

  const handleSearchChange = (e) => {
    setSearchTermLocal(e.target.value);
  };

  const groupTransactionsByDate = (transactions) => {
    const groups = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.date);
      date.setHours(0, 0, 0, 0);
      
      const existingGroup = acc.find(group => 
        group.date.getTime() === date.getTime()
      );

      if (existingGroup) {
        existingGroup.transactions.push(transaction);
        existingGroup.total += transaction.type === 'income' 
          ? parseFloat(transaction.amount) 
          : -parseFloat(transaction.amount);
      } else {
        acc.push({
          date,
          transactions: [transaction],
          total: transaction.type === 'income' 
            ? parseFloat(transaction.amount) 
            : -parseFloat(transaction.amount)
        });
      }

      return acc;
  }, []);

    return groups.sort((a, b) => b.date - a.date);
  };

  const formatDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getTime() === today.getTime()) {
      return 'Hoy';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Alimentación': '🍽️',
      'Servicios': '🔧',
      'Salud': '🏥',
      'Vivienda': '🏠',
      'Educación': '📚',
      'Transporte': '🚗',
      'Ropa': '👕',
      'Seguros': '🛡️',
      'Mantenimiento': '🔨',
      'Entretenimiento': '🎮',
      'Pasatiempos': '🎨',
      'Restaurantes': '🍴',
      'Compras': '🛍️',
      'Viajes': '✈️',
      'Otros-Gasto': '📦',
      'Salario': '💰',
      'Regalo': '🎁',
      'Otros-Ingreso': '💵'
    };
    return icons[category] || '💰';
  };

  // Nuevo: cargar agrupadas por mes y categoría
  useEffect(() => {
    if (isAuthenticated) {
      fetchGroupedTransactions();
      fetchGoals();
    }
  }, [isAuthenticated, selectedCategory]);

  const fetchGroupedTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let url = '/transactions/grouped';
      if (selectedCategory) {
        url += `?category=${encodeURIComponent(selectedCategory)}`;
      }
      const response = await authenticatedFetch(url);
      const data = await response.json();
      setGroupedTransactions(data);
    } catch (err) {
      setError('Error al cargar transacciones agrupadas: ' + err.message);
      console.error('Error detallado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // UI para filtro de categoría
  const allCategories = useMemo(() => {
    return [
      ...CATEGORIES.Income,
      ...CATEGORIES.Expense
    ];
  }, []);

  // Agrupar por mes (ya viene agrupado del backend)
  const getMonthTotal = (transactions) => {
    return transactions.reduce((acc, tx) => {
      if (tx.type === 'Income') return acc + Number(tx.amount);
      else return acc - Number(tx.amount);
    }, 0);
  };

  // Obtener meses únicos de groupedTransactions
  const availableMonths = useMemo(() => groupedTransactions.map(g => g.month), [groupedTransactions]);

  // Filtrar por mes
  const filteredByMonth = useMemo(() => {
    if (!selectedMonth) return groupedTransactions;
    return groupedTransactions.filter(g => g.month === selectedMonth);
  }, [groupedTransactions, selectedMonth]);

  // Filtrar por búsqueda global
  const filterTransactions = (transactions) => {
    if (!searchTermGlobal.trim()) return transactions;
    const term = searchTermGlobal.toLowerCase();
    return transactions.filter(tx =>
      (tx.description && tx.description.toLowerCase().includes(term)) ||
      (tx.category && tx.category.toLowerCase().includes(term)) ||
      (tx.payment_method && tx.payment_method.toLowerCase().includes(term)) ||
      (tx.type && tx.type.toLowerCase().includes(term)) ||
      (String(tx.amount).includes(term)) ||
      (tx.date && new Date(tx.date).toLocaleDateString('es-ES').toLowerCase().includes(term))
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-text-secondary">Cargando transacciones...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FiAlertCircle className="w-12 h-12 text-danger-color" />
        <div className="text-xl text-danger-color">{error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
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
              schedule: null,
              recurrence: '',
              is_scheduled: 0,
              end_date: null,
              parent_transaction_id: null,
              assignToGoal: false,
              goal_id: ''
            });
          }}
        >
          <FiPlusCircle className="text-xl" />
          <span>Agregar Transacción</span>
        </button>
        {/* Modal de formulario de transacción */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-card-bg rounded-2xl p-6 shadow-lg max-w-lg w-full relative">
              <button
                className="absolute top-4 right-4 text-text-secondary hover:text-danger-color text-xl"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
              <TransactionForm
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
                initialData={editingTransaction}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Lógica de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Barra de búsqueda, filtro de mes y botón agregar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <input
          type="text"
          className="w-full md:w-1/2 p-2 rounded border border-border-color bg-secondary-bg text-text-primary"
          placeholder="Buscar por cualquier dato..."
          value={searchTermGlobal}
          onChange={e => setSearchTermGlobal(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Mes:</label>
          <select
            className="p-2 rounded border border-border-color bg-secondary-bg text-text-primary"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="">Todos</option>
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {new Date(month + '-01').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-accent-color text-white rounded-lg hover:bg-accent-color-darker transition-colors ml-2"
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
                schedule: null,
                recurrence: '',
                is_scheduled: 0,
                end_date: null,
                parent_transaction_id: null,
                assignToGoal: false,
                goal_id: ''
              });
            }}
          >
            <FiPlus /> Nueva transacción
          </button>
        </div>
      </div>

      {/* Mostrar agrupadas por mes (filtradas) */}
      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <FiLoader className="animate-spin w-8 h-8 text-accent-color" />
        </div>
      ) : error ? (
        <div className="min-h-[40vh] flex items-center justify-center text-danger-color">{error}</div>
      ) : (
        <div>
          {filteredByMonth.length === 0 ? (
            <div className="text-center text-text-secondary py-8">No hay transacciones para mostrar.</div>
          ) : (
            filteredByMonth.map(group => {
              const filteredTxs = filterTransactions(group.transactions);
              if (filteredTxs.length === 0) return null;
              return (
                <div key={group.month} className="mb-10">
                  {/* Header del mes */}
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-text-primary">
                      {new Date(group.month + '-01').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                    </h2>
                    <span className="text-success-color font-bold">
                      Total: {getMonthTotal(filteredTxs) >= 0 ? '+' : ''}{formatCurrency(getMonthTotal(filteredTxs))}
                    </span>
                  </div>
                  {/* Cards de transacciones */}
                  <div className="flex flex-col gap-3 bg-card-bg rounded-2xl p-4">
                    {filteredTxs.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between rounded-xl px-4 py-3 shadow-sm bg-secondary-bg hover:bg-secondary-bg/80 transition-all">
                        {/* Icono y descripción */}
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">
                            {getCategoryIcon(tx.category)}
                          </span>
                          <div>
                            <div className="font-medium text-text-primary text-base">
                              {tx.description}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-1 rounded bg-background-color text-text-secondary">
                                {tx.category}
                              </span>
                              <span className="text-xs text-text-secondary">
                                {new Date(tx.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Monto, método de pago y acciones */}
                        <div className="flex flex-col items-end gap-2 min-w-[120px]">
                          <span className={`font-bold text-base ${tx.type === 'Income' ? 'text-success-color' : 'text-danger-color'}`}>
                            {tx.type === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                          </span>
                          <span className="text-xs mt-1 px-2 py-1 rounded bg-background-color text-text-secondary">
                            {tx.payment_method}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => handleEdit(tx)}
                              className="text-xs text-accent-color hover:text-accent-color-darker transition-colors"
                            >
                              Editar
                            </button>
                            <span className="text-border-color">|</span>
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="text-xs text-danger-color hover:text-danger-color-darker transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionList; 


