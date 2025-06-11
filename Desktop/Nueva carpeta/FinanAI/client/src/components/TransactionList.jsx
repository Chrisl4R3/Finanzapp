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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);

      // Validaciones básicas
      if (!formData.type || !formData.category || !formData.amount || !formData.description || !formData.payment_method) {
        throw new Error('Todos los campos son requeridos');
      }

      if (formData.assignToGoal && !formData.goal_id) {
        throw new Error('Debes seleccionar una meta');
        }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser un número positivo');
      }

      const endpoint = editingTransaction 
        ? `/transactions/${editingTransaction.id}`
        : '/transactions';

      const method = editingTransaction ? 'PUT' : 'POST';

      const requestData = {
        type: formData.type,
        category: formData.category,
        amount: amount,
        date: formData.date,
        description: formData.description,
        payment_method: formData.payment_method,
        status: formData.status,
        assignToGoal: formData.assignToGoal,
        goal_id: formData.assignToGoal ? formData.goal_id : null
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
      
      // Actualizar tanto las transacciones como las metas
      await Promise.all([
        fetchTransactions(),
        fetchGoals()
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
        <Link
          to="/transactions"
          className="flex items-center gap-2 px-6 py-3 bg-accent-color hover:bg-accent-color-darker text-white rounded-xl transition-all duration-300 hover:scale-105"
        >
          <FiPlusCircle className="text-xl" />
          <span>Agregar Transacción</span>
        </Link>
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
      {/* Filtro de categoría arriba a la derecha */}
      <div className="flex justify-end mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Categoría:</label>
          <select
            className="p-2 rounded border border-border-color bg-secondary-bg text-text-primary"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mostrar agrupadas por mes */}
      {isLoading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <FiLoader className="animate-spin w-8 h-8 text-accent-color" />
        </div>
      ) : error ? (
        <div className="min-h-[40vh] flex items-center justify-center text-danger-color">{error}</div>
      ) : (
        <div>
          {groupedTransactions.length === 0 ? (
            <div className="text-center text-text-secondary py-8">No hay transacciones para mostrar.</div>
          ) : (
            groupedTransactions.map(group => (
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
                      {/* Monto y método de pago */}
                      <div className="flex flex-col items-end">
                        <span className={`font-bold text-base ${tx.type === 'Income' ? 'text-success-color' : 'text-danger-color'}`}>
                          {tx.type === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                        </span>
                        <span className="text-xs mt-1 px-2 py-1 rounded bg-background-color text-text-secondary">
                          {tx.payment_method}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Lista de transacciones */}
      <div className="bg-card-bg rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-color">
            <thead className="bg-secondary-bg">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Fecha</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Descripción</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Categoría</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Monto</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Acciones</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-border-color">
            {currentItems.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-secondary-bg/50 transition-all duration-300">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text-primary">
                        {formatDate(new Date(transaction.date))}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {new Date(transaction.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(transaction.category)}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-primary">{transaction.description}</span>
                        <span className="text-xs text-text-secondary">{transaction.payment_method}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary-bg text-text-primary">
                      {transaction.category}
                    </span>
                </td>
                  <td className={`px-6 py-4 text-sm font-medium ${
                    transaction.type === 'Income' ? 'text-success-color' : 'text-danger-color'
                }`}>
                    {transaction.type === 'Income' ? '+' : '-'}
                  {formatCurrency(Math.abs(transaction.amount))}
                </td>
                  <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      transaction.type === 'Income' 
                      ? 'bg-success-color/10 text-success-color' 
                      : 'bg-danger-color/10 text-danger-color'
                  }`}>
                      {transaction.type === 'Income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="text-sm text-accent-color hover:text-accent-color-darker transition-colors"
                      >
                    Editar
                  </button>
                      <span className="text-border-color">|</span>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-sm text-danger-color hover:text-danger-color-darker transition-colors"
                      >
                    Eliminar
                  </button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

        {/* Mensaje cuando no hay resultados en la búsqueda */}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-secondary">No se encontraron transacciones que coincidan con los filtros.</p>
          </div>
        )}

        {/* Paginación */}
        {filteredTransactions.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <span>Mostrar</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-secondary-bg border-none rounded-lg px-2 py-1 focus:ring-2 focus:ring-accent-color"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
              <span>por página</span>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-sm text-text-secondary">
                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredTransactions.length)} de {filteredTransactions.length} transacciones
              </p>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    currentPage === 1
                      ? 'text-text-secondary cursor-not-allowed'
                      : 'hover:bg-accent-color/10 text-text-primary'
                  }`}
                >
                  <FiChevronsLeft className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    currentPage === 1
                      ? 'text-text-secondary cursor-not-allowed'
                      : 'hover:bg-accent-color/10 text-text-primary'
                  }`}
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(3, totalPages))].map((_, index) => {
                    let pageNumber;
                    if (totalPages <= 3) {
                      pageNumber = index + 1;
                    } else if (currentPage <= 2) {
                      pageNumber = index + 1;
                    } else if (currentPage >= totalPages - 1) {
                      pageNumber = totalPages - 2 + index;
                    } else {
                      pageNumber = currentPage - 1 + index;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => paginate(pageNumber)}
                        className={`w-8 h-8 rounded-lg transition-all duration-300 ${
                          currentPage === pageNumber
                            ? 'bg-accent-color text-white'
                            : 'hover:bg-accent-color/10 text-text-primary'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    currentPage === totalPages
                      ? 'text-text-secondary cursor-not-allowed'
                      : 'hover:bg-accent-color/10 text-text-primary'
                  }`}
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg transition-all duration-300 ${
                    currentPage === totalPages
                      ? 'text-text-secondary cursor-not-allowed'
                      : 'hover:bg-accent-color/10 text-text-primary'
                  }`}
                >
                  <FiChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default TransactionList; 


