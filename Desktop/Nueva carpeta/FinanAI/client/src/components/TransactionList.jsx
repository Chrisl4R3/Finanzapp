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
  FiPlus,
  FiChevronUp,
  FiChevronDown,
  FiEdit2,
  FiTrash2,
  FiChevronUp as FiChevronUpIcon,
  FiChevronDown as FiChevronDownIcon
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { authenticatedFetch } from '../auth/auth';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import TransactionForm from './TransactionForm';
import { format, parseISO } from 'date-fns';
import es from 'date-fns/locale/es';

// Constantes
const TRANSACTION_TYPES = {
  INCOME: 'Income',
  EXPENSE: 'Expense'
};

// Configuración de paginación
const PAGINATION_CONFIG = {
  ITEMS_PER_PAGE: 10,
  VISIBLE_PAGES: 5
};

// Estilos para las categorías - Se usa en el componente
const categoryStyles = {
  'Salario': 'bg-green-100 text-green-800',
  'Regalo': 'bg-purple-100 text-purple-800',
  'Otros-Ingreso': 'bg-blue-100 text-blue-800',
  'Alimentación': 'bg-red-100 text-red-800',
  'Servicios': 'bg-yellow-100 text-yellow-800',
  'Salud': 'bg-pink-100 text-pink-800',
  'Vivienda': 'bg-indigo-100 text-indigo-800',
  'Educación': 'bg-teal-100 text-teal-800',
  'Transporte': 'bg-cyan-100 text-cyan-800',
  'Ropa': 'bg-orange-100 text-orange-800',
  'Seguros': 'bg-amber-100 text-amber-800',
  'Mantenimiento': 'bg-lime-100 text-lime-800',
  'Entretenimiento': 'bg-emerald-100 text-emerald-800',
  'Pasatiempos': 'bg-sky-100 text-sky-800',
  'Restaurantes': 'bg-rose-100 text-rose-800',
  'Compras': 'bg-fuchsia-100 text-fuchsia-800',
  'Viajes': 'bg-violet-100 text-violet-800',
  'Otros-Gasto': 'bg-slate-100 text-slate-800'
};

// Estilos para los tipos de transacción - Se usa en el componente
const typeStyles = {
  'Income': 'text-green-600',
  'Expense': 'text-red-600'
};

// Estilos para los métodos de pago - Se usa en el componente
const paymentMethodStyles = {
  'Efectivo': 'bg-gray-100 text-gray-800',
  'Tarjeta de Débito': 'bg-blue-50 text-blue-800',
  'Tarjeta de Crédito': 'bg-purple-50 text-purple-800',
  'Transferencia Bancaria': 'bg-cyan-50 text-cyan-800'
};

// Función para formatear fechas
// Se usa en el componente
const formatTransactionDate = (dateString) => {
  try {
    const date = parseISO(dateString);
    return format(date, "PPP", { locale: es });
  } catch (error) {
    return dateString;
  }
};

// Función para obtener el nombre del mes en español
// Se usa en el componente
const getMonthName = (date) => {
  return format(parseISO(date), 'MMMM yyyy', { locale: es });
};

// Función para agrupar transacciones por mes
const groupTransactionsByMonth = (transactions) => {
  const groups = {};
  
  transactions.forEach(transaction => {
    const date = parseISO(transaction.date);
    const monthKey = format(date, 'yyyy-MM');
    const monthName = format(date, 'MMMM yyyy', { locale: es });
    
    if (!groups[monthKey]) {
      groups[monthKey] = {
        month: monthName,
        date: date,
        transactions: [],
        totalIncome: 0,
        totalExpense: 0
      };
    }
    
    groups[monthKey].transactions.push(transaction);
    
    if (transaction.type === 'Income') {
      groups[monthKey].totalIncome += parseFloat(transaction.amount);
    } else {
      groups[monthKey].totalExpense += parseFloat(transaction.amount);
    }
  });
  
  // Ordenar los meses de más reciente a más antiguo
  return Object.values(groups).sort((a, b) => b.date - a.date);
};

const TransactionList = ({ searchTerm = '', filters = {} }) => {
  // Estados principales
  const { formatCurrency } = useCurrency();
  const { isAuthenticated } = useAuth();
  
  // Estados de datos
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // 5 transacciones por página
  const [expandedMonths, setExpandedMonths] = useState({});
  
  // Estados para los filtros
  const [searchTermLocal, setSearchTermLocal] = useState(searchTerm);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [localFilters, setLocalFilters] = useState({
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: ''
  });
  
  // Obtener categorías únicas para el filtro
  const availableCategories = useMemo(() => {
    const cats = new Set();
    transactions.forEach(tx => tx.category && cats.add(tx.category));
    return Array.from(cats).sort();
  }, [transactions]);
  
  // Obtener meses únicos para el filtro
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
  
  // Filtrar transacciones - Se usa en el componente
  const filteredTransactionsList = useMemo(() => {
    let result = [...transactions];
    
    // Aplicar búsqueda
    if (searchTermLocal) {
      const searchLower = searchTermLocal.toLowerCase();
      result = result.filter(tx => 
        tx.description?.toLowerCase().includes(searchLower) ||
        (tx.category && tx.category.toLowerCase().includes(searchLower)) ||
        (tx.payment_method && tx.payment_method.toLowerCase().includes(searchLower))
      );
    }
    
    // Aplicar filtros
    if (selectedCategory) {
      result = result.filter(tx => tx.category === selectedCategory);
    }
    
    if (localFilters && localFilters.type !== 'all') {
      result = result.filter(tx => tx.type === localFilters.type);
    }
    
    if (selectedType !== 'all') {
      result = result.filter(tx => tx.type === selectedType);
    }
    
    // Filtrar por mes
    if (selectedMonth) {
      result = result.filter(tx => {
        const txDate = new Date(tx.date);
        const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === selectedMonth;
      });
    }
      
      return result;
    }, [transactions, searchTermLocal, selectedCategory, selectedType, selectedMonth, localFilters]);

  // Calcular páginas totales
  const totalPagesCount = Math.ceil(groupedTransactionsList.length / itemsPerPage);
  
  // Obtener transacciones para la página actual
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedTransactionsList.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedTransactionsList, currentPage, itemsPerPage]);
  
  // Resetear a la primera página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTermLocal, selectedCategory, selectedType, selectedMonth]);
  
  // Estados para el formulario
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    type: TRANSACTION_TYPES.EXPENSE,
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
  
  // Obtener transacciones al cargar el componente
  useEffect(() => {
    if (isAuthenticated) {
      const loadTransactions = async () => {
        setIsLoading(true);
        try {
          const response = await authenticatedFetch('/api/transactions');
          if (response.ok) {
            const data = await response.json();
            setTransactions(data);
            // Inicializar expandedMonths con todos los meses colapsados
            const transactionMonths = groupTransactionsByMonth(data).map(g => g.month);
            const initialExpanded = {};
            transactionMonths.forEach(month => {
              initialExpanded[month] = false;
            });
            setExpandedMonths(initialExpanded);
          } else {
            throw new Error('Error al cargar las transacciones');
          }
        } catch (err) {
          setError(err.message || 'Error al cargar las transacciones');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadTransactions();
    }
  }, [isAuthenticated]);

  // Calcular resumen de transacciones - Se usa en el componente
  const transactionSummary = useMemo(() => {
    return transactions.reduce((summary, transaction) => {
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
  }, [transactions]);

  // Obtener categorías únicas para el filtro - Se usa en el componente
  const categories = useMemo(() => {
    const cats = new Set();
    transactions.forEach(tx => {
      if (tx.category) cats.add(tx.category);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  // Obtener meses únicos para el filtro - Se usa en el componente
  const months = useMemo(() => {
    const monthsSet = new Set();
    transactions.forEach(tx => {
      if (tx.date) {
        const date = parseISO(tx.date);
        const monthKey = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMMM yyyy', { locale: es });
        monthsSet.add({ value: monthKey, label: monthName });
      }
    });
    return Array.from(monthsSet).sort((a, b) => b.value.localeCompare(a.value));
  }, [transactions]);

  // Manejar cambio de página - Se usa en el componente
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Manejar cambio de mes - Se usa en el componente
  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setCurrentPage(1); // Resetear a la primera página al cambiar de mes
  };

  // Manejar cambio de categoría - Se usa en el componente
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1); // Resetear a la primera página al cambiar de categoría
  };

  // Manejar cambio de tipo - Se usa en el componente
  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
    setCurrentPage(1); // Resetear a la primera página al cambiar de tipo
  };

  // Aplicar filtros adicionales
  const applyAdditionalFilters = (transactions) => {
    let result = [...transactions];
    
    if (localFilters?.minAmount) {
      result = result.filter(tx => parseFloat(tx.amount) >= parseFloat(localFilters.minAmount));
    }
    if (localFilters?.maxAmount) {
      result = result.filter(tx => parseFloat(tx.amount) <= parseFloat(localFilters.maxAmount));
    }
    if (localFilters?.startDate) {
      result = result.filter(tx => new Date(tx.date) >= new Date(localFilters.startDate));
    }
    if (localFilters?.endDate) {
      const endDate = new Date(localFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(tx => new Date(tx.date) <= endDate);
    }

    // Ordenar por fecha (más reciente primero)
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Agrupar transacciones por mes
  const transactionsByMonth = useMemo(() => {
    return groupTransactionsByMonth(filteredTransactionsList);
  }, [filteredTransactionsList]);

  // Calcular el total de páginas
  const totalPages = Math.ceil(filteredTransactionsList.length / itemsPerPage);

  // Obtener transacciones para la página actual
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactionsList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactionsList, currentPage, itemsPerPage]);

  // Alternar visibilidad de un mes - Se usa en el componente
  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  // Expandir/colapsar todos los meses
  const toggleAllMonths = (expand) => {
    const newState = {};
    transactionsByMonth.forEach(month => {
      newState[month.month] = expand;
    });
    setExpandedMonths(newState);
  };

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authenticatedFetch('/transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      setError(err.message);
      console.error('Error al cargar transacciones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (isAuthenticated) {
      const loadInitialData = async () => {
        try {
          await Promise.all([
            fetchTransactions(),
            fetchGoals()
          ]);
        } catch (err) {
          console.error('Error al cargar datos iniciales:', err);
        }
      };

      loadInitialData();
    }
  }, [isAuthenticated]);

  // Obtener metas para asignar a transacciones
  const fetchGoals = async () => {
    try {
      const response = await authenticatedFetch('/goals');
      const data = await response.json();
      // Solo mostrar metas activas que no estén completadas
      const activeGoals = data.filter(goal => goal.status === 'Active');
      // Comentado ya que setGoals no está definido en este componente
      // Si se necesita esta funcionalidad, se debe pasar como prop desde el componente padre
      // setGoals(activeGoals);
      return activeGoals;
    } catch (err) {
      console.error('Error al cargar las metas:', err);
      return [];
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
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

  // Obtener transacciones agrupadas por mes
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
    
    // Convertir a array y ordenar por mes (más reciente primero)
    return Object.entries(grouped)
      .map(([month, transactions]) => ({
        month,
        transactions: [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredTransactionsList]);
  
  // Obtener meses únicos para el filtro
  const availableMonthsList = useMemo(() => 
    [...new Set(transactions.map(tx => {
      const date = new Date(tx.date);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }))].sort().reverse()
  , [transactions]);
  
  // Filtrar por mes seleccionado
  const filteredByMonth = useMemo(() => {
    if (!selectedMonth) return groupedTransactionsList;
    return groupedTransactionsList.filter(g => g.month === selectedMonth);
  }, [groupedTransactionsList, selectedMonth]);

  // Función auxiliar para filtrar transacciones por búsqueda
  const filterTransactionsBySearch = (txs, searchTerm) => {
    if (!searchTerm?.trim()) return txs;
    const term = searchTerm.toLowerCase();
    return txs.filter(tx =>
      (tx.description && tx.description.toLowerCase().includes(term)) ||
      (tx.category && tx.category.toLowerCase().includes(term)) ||
      (tx.payment_method && tx.payment_method.toLowerCase().includes(term)) ||
      (tx.type && tx.type.toLowerCase().includes(term)) ||
      (String(tx.amount).includes(term)) ||
      (tx.date && new Date(tx.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase().includes(term))
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
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Búsqueda */}
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
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          </div>
          {/* Filtro de categoría */}
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
          
          {/* Filtro de tipo */}
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
            {/* Filtro de mes */}
            <div className="flex items-center gap-2">
              <label htmlFor="month" className="text-sm font-medium text-gray-700">Mes:</label>
              <select
                id="month"
                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent-color focus:border-accent-color transition-all duration-200"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                <option value="">Todos los meses</option>
                {availableMonthsList.map(month => (
                  <option key={month} value={month}>
                    {new Date(month + '-01').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Botón para agregar transacción */}
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
              <FiPlus className="text-lg" />
              <span>Nueva Transacción</span>
            </button>
          </div>
        </div>
      {/* Lista de transacciones */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="min-h-[40vh] flex items-center justify-center">
            <FiLoader className="animate-spin w-8 h-8 text-accent-color" />
          </div>
        ) : error ? (
          <div className="min-h-[40vh] flex items-center justify-center text-danger-color">{error}</div>
        ) : (
          <div>
            {currentItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No se encontraron transacciones con los filtros actuales.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {currentItems.map(group => {
                const totalAmount = group.transactions.reduce((sum, tx) => {
                  return tx.type === 'Income' ? sum + parseFloat(tx.amount) : sum - parseFloat(tx.amount);
                }, 0);
                
                return (
                  <div key={group.month} className="mb-10">
                    {/* Header del mes */}
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold text-text-primary">
                        {new Date(group.month + '-01').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                      </h2>
                      <span className="text-success-color font-bold">
                        Total: {getMonthTotal(group.transactions) >= 0 ? '+' : ''}{formatCurrency(getMonthTotal(group.transactions))}
                      </span>
                    </div>
                    {/* Cards de transacciones */}
                    <div className="flex flex-col gap-3 bg-card-bg rounded-2xl p-4">
                      {group.transactions.map(tx => (
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
              })}
            </div>)}
        </div>
      </div>
      {/* Controles de paginación */}
      {totalPagesCount > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ‹
            </button>
            
            {Array.from({ length: Math.min(5, totalPagesCount) }, (_, i) => {
              let pageNum;
              if (totalPagesCount <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPagesCount - 2) {
                pageNum = totalPagesCount - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1.5 rounded-md border ${
                    currentPage === pageNum 
                      ? 'bg-accent-color text-white border-accent-color' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPagesCount, p + 1))}
              disabled={currentPage === totalPagesCount}
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPagesCount)}
              disabled={currentPage === totalPagesCount}
              className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              »
            </button>
          </nav>
        </div>
      )}

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
              initialData={editingTransaction}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
