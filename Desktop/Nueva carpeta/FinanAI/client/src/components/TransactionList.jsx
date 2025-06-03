import React, { useState, useEffect } from 'react';
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
  const [filters, setFilters] = useState({
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
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'Efectivo',
    status: 'Completed'
  });

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
    }
  }, [isAuthenticated]);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filters.type === 'all' || transaction.type === filters.type;
    
    const amount = parseFloat(transaction.amount);
    const matchesAmount = (!filters.minAmount || amount >= parseFloat(filters.minAmount)) &&
                         (!filters.maxAmount || amount <= parseFloat(filters.maxAmount));
    
    const date = new Date(transaction.date);
    const matchesDate = (!filters.startDate || date >= new Date(filters.startDate)) &&
                       (!filters.endDate || date <= new Date(filters.endDate));

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      if (editingTransaction) {
        await authenticatedFetch(`/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        await authenticatedFetch('/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }
      
      setShowForm(false);
      setEditingTransaction(null);
      setFormData({
        type: 'Expense',
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        payment_method: 'Efectivo',
        status: 'Completed'
      });
      await fetchTransactions();
    } catch (err) {
      setError('Error al guardar la transacción');
      console.error('Error:', err);
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
      date: transaction.date.split('T')[0],
      description: transaction.description,
      payment_method: transaction.payment_method,
      status: transaction.status
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
      {/* Resumen de Transacciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card-bg rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-success-color/10 flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-success-color" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">Ingresos Totales</p>
              <p className="text-success-color text-xl font-bold">{formatCurrency(transactionSummary.totalIncome)}</p>
            </div>
          </div>
          <p className="text-text-secondary text-sm mt-2">
            {transactionSummary.totalTransactions.income} transacciones
          </p>
        </div>

        <div className="bg-card-bg rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-danger-color/10 flex items-center justify-center">
              <FiTrendingDown className="w-6 h-6 text-danger-color" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">Gastos Totales</p>
              <p className="text-danger-color text-xl font-bold">{formatCurrency(transactionSummary.totalExpenses)}</p>
            </div>
          </div>
          <p className="text-text-secondary text-sm mt-2">
            {transactionSummary.totalTransactions.expenses} transacciones
          </p>
        </div>

        <div className="bg-card-bg rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent-color/10 flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-accent-color" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">Balance</p>
              <p className={`text-xl font-bold ${
                transactionSummary.totalIncome - transactionSummary.totalExpenses >= 0 
                ? 'text-success-color' 
                : 'text-danger-color'
              }`}>
                {formatCurrency(transactionSummary.totalIncome - transactionSummary.totalExpenses)}
              </p>
            </div>
          </div>
          <p className="text-text-secondary text-sm mt-2">
            {transactionSummary.totalTransactions.income + transactionSummary.totalTransactions.expenses} transacciones totales
          </p>
        </div>

        <div className="bg-card-bg rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <FiCalendar className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">Última Transacción</p>
              <p className="text-text-primary text-xl font-bold">
                {new Date(Math.max(...transactions.map(t => new Date(t.date)))).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar transacciones..."
                value={searchTermLocal}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 bg-secondary-bg rounded-xl border-none focus:ring-2 focus:ring-accent-color transition-all duration-300"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary-bg hover:bg-accent-color/10 text-text-primary rounded-xl transition-all duration-300"
            >
              <FiPlus />
              <span>{showForm ? 'Cancelar' : 'Nueva'}</span>
            </button>
            
            <Link
              to="/transactions"
              className="flex items-center gap-2 px-4 py-2 bg-accent-color hover:bg-accent-color-darker text-white rounded-xl transition-all duration-300 hover:scale-105"
            >
              <FiPlusCircle />
              <span>Nueva Transacción</span>
            </Link>
          </div>
        </div>

        {/* Panel de Filtros */}
        {showForm && (
          <div className="mt-4 p-4 bg-card-bg rounded-xl shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Tipo</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full p-2 bg-secondary-bg rounded-lg border-none focus:ring-2 focus:ring-accent-color"
                  required
                >
                  <option value="Income">Ingreso</option>
                  <option value="Expense">Gasto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Categoría</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-2 bg-secondary-bg rounded-lg border-none focus:ring-2 focus:ring-accent-color"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {CATEGORIES[formData.type].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Monto</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    name="minAmount"
                    value={filters.minAmount}
                    onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                    className="w-1/2 p-2 bg-secondary-bg rounded-lg border-none focus:ring-2 focus:ring-accent-color"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    name="maxAmount"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                    className="w-1/2 p-2 bg-secondary-bg rounded-lg border-none focus:ring-2 focus:ring-accent-color"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Fecha Inicio</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2 bg-secondary-bg rounded-lg border-none focus:ring-2 focus:ring-accent-color"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Fecha Fin</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2 bg-secondary-bg rounded-lg border-none focus:ring-2 focus:ring-accent-color"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Transacciones */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-card-bg rounded-xl overflow-hidden shadow-lg">
          <thead>
            <tr className="bg-secondary-bg">
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-bg">
            {currentItems.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-secondary-bg/50 transition-all duration-300">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                  {new Date(transaction.date).toLocaleDateString('es-ES')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{transaction.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{transaction.category}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                  transaction.type === 'income' ? 'text-success-color' : 'text-danger-color'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(Math.abs(transaction.amount))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    transaction.type === 'income' 
                      ? 'bg-success-color/10 text-success-color' 
                      : 'bg-danger-color/10 text-danger-color'
                  }`}>
                    {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                  <button
                    onClick={() => handleEdit(transaction)}
                    className="text-accent-color hover:text-accent-color-darker transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(transaction.id)}
                    className="text-danger-color hover:text-danger-color-darker transition-colors"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
    </div>
  );
};

export default TransactionList; 