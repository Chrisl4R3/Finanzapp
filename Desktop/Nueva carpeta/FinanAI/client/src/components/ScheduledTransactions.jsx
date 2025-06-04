import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import * as scheduledTransactionService from '../services/scheduledTransactions';
import Swal from 'sweetalert2';
import { FiCalendar, FiClock, FiRepeat, FiEdit2, FiTrash2, FiPause, FiPlay, FiPlus } from 'react-icons/fi';

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
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

const TransactionForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'Income',
    category: '',
    payment_method: 'Efectivo',
    frequency: 'Monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'Active',
    ...initialData
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'type' ? { category: '' } : {})
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.category || 
        !formData.payment_method || !formData.frequency || !formData.start_date) {
      Toast.fire({
        icon: 'error',
        title: 'Por favor completa todos los campos requeridos'
      });
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card-bg rounded-xl p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Descripción
          </label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-input-bg border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
          />
        </div>

        {/* Monto */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Monto
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full px-4 py-2 rounded-lg bg-input-bg border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Tipo
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-input-bg border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
          >
            <option value="Income">Ingreso</option>
            <option value="Expense">Gasto</option>
          </select>
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Categoría
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-input-bg border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
          >
            <option value="">Selecciona una categoría</option>
            {CATEGORIES[formData.type].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Método de pago */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Método de pago
          </label>
          <select
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-input-bg border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
          >
            {PAYMENT_METHODS.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div>

        {/* Frecuencia */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Frecuencia
          </label>
          <select
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-input-bg border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
          >
            {FREQUENCIES.map(freq => (
              <option key={freq} value={freq}>
                {freq === 'Daily' ? 'Diaria' :
                 freq === 'Weekly' ? 'Semanal' :
                 freq === 'Monthly' ? 'Mensual' : 'Anual'}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha de inicio */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Fecha de inicio
          </label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg bg-input-bg border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
            required
          />
        </div>

        {/* Fecha de fin (opcional) */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Fecha de fin (opcional)
          </label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            min={formData.start_date}
            className="w-full px-4 py-2 rounded-lg bg-input-bg border border-border-color focus:border-accent-color focus:ring-1 focus:ring-accent-color"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 rounded-lg border border-border-color hover:bg-card-bg-darker transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 rounded-lg bg-accent-color text-white hover:bg-accent-color-darker transition-colors"
        >
          {initialData ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

const TransactionCard = ({ transaction, onEdit, onDelete, onStatusChange, formatCurrency }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-success-color/10 text-success-color';
      case 'Paused':
        return 'bg-warning-color/10 text-warning-color';
      case 'Completed':
        return 'bg-text-secondary/10 text-text-secondary';
      default:
        return 'bg-text-secondary/10 text-text-secondary';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatFrequency = (frequency) => {
    const translations = {
      Daily: 'Diaria',
      Weekly: 'Semanal',
      Monthly: 'Mensual',
      Yearly: 'Anual'
    };
    return translations[frequency] || frequency;
  };

  return (
    <div className="bg-card-bg rounded-xl p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {transaction.description}
          </h3>
          <p className={`text-xl font-bold ${
            transaction.type === 'Income' ? 'text-success-color' : 'text-error-color'
          }`}>
            {transaction.type === 'Income' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onStatusChange(transaction.id, transaction.status)}
            className="p-2 rounded-lg hover:bg-background-color transition-colors"
            title={transaction.status === 'Active' ? 'Pausar' : 'Activar'}
          >
            {transaction.status === 'Active' ? 
              <FiPause className="w-5 h-5 text-warning-color" /> :
              <FiPlay className="w-5 h-5 text-success-color" />
            }
          </button>
          <button
            onClick={() => onEdit(transaction)}
            className="p-2 rounded-lg hover:bg-background-color transition-colors"
            title="Editar"
          >
            <FiEdit2 className="w-5 h-5 text-accent-color" />
          </button>
          <button
            onClick={() => onDelete(transaction.id)}
            className="p-2 rounded-lg hover:bg-background-color transition-colors"
            title="Eliminar"
          >
            <FiTrash2 className="w-5 h-5 text-error-color" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 text-text-secondary">
          <FiRepeat className="w-4 h-4" />
          <span className="text-sm">{formatFrequency(transaction.frequency)}</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <FiCalendar className="w-4 h-4" />
          <span className="text-sm">
            Inicio: {formatDate(transaction.start_date)}
          </span>
        </div>
        {transaction.end_date && (
          <div className="flex items-center gap-2 text-text-secondary">
            <FiClock className="w-4 h-4" />
            <span className="text-sm">
              Fin: {formatDate(transaction.end_date)}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(transaction.status)}`}>
            {transaction.status === 'Active' ? 'Activa' : 
             transaction.status === 'Paused' ? 'Pausada' : 'Completada'}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="px-2 py-1 text-xs rounded-lg bg-background-color text-text-secondary">
          {transaction.category}
        </span>
        <span className="px-2 py-1 text-xs rounded-lg bg-background-color text-text-secondary">
          {transaction.payment_method}
        </span>
      </div>
    </div>
  );
};

const ScheduledTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await scheduledTransactionService.getAllScheduledTransactions();
      setTransactions(data);
    } catch (err) {
      setError(err.message);
      Toast.fire({
        icon: 'error',
        title: err.message || 'Error al cargar las transacciones programadas'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      setIsLoading(true);
      if (editingTransaction) {
        await scheduledTransactionService.updateScheduledTransaction(
          editingTransaction.id,
          formData
        );
        Toast.fire({
          icon: 'success',
          title: 'Transacción programada actualizada exitosamente'
        });
      } else {
        await scheduledTransactionService.createScheduledTransaction(formData);
        Toast.fire({
          icon: 'success',
          title: 'Transacción programada creada exitosamente'
        });
      }
      setShowForm(false);
      setEditingTransaction(null);
      await fetchTransactions();
    } catch (err) {
      Toast.fire({
        icon: 'error',
        title: err.message || 'Error al guardar la transacción programada'
      });
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
      cancelButtonText: 'Cancelar',
      background: '#1A1A1A',
      color: '#FFFFFF'
    });

    if (result.isConfirmed) {
      try {
        await scheduledTransactionService.deleteScheduledTransaction(id);
        Toast.fire({
          icon: 'success',
          title: 'Transacción programada eliminada exitosamente'
        });
        await fetchTransactions();
      } catch (err) {
        Toast.fire({
          icon: 'error',
          title: err.message || 'Error al eliminar la transacción programada'
        });
      }
    }
  };

  const handleStatusChange = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
    try {
      await scheduledTransactionService.updateScheduledTransactionStatus(id, newStatus);
      Toast.fire({
        icon: 'success',
        title: `Transacción ${newStatus === 'Active' ? 'activada' : 'pausada'} exitosamente`
      });
      await fetchTransactions();
    } catch (err) {
      Toast.fire({
        icon: 'error',
        title: err.message || 'Error al cambiar el estado de la transacción'
      });
    }
  };

  if (isLoading && !showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-text-secondary">Cargando transacciones programadas...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Encabezado */}
      <div className="bg-card-bg rounded-2xl p-6 mb-8 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-color/10 rounded-xl">
                <FiRepeat className="w-6 h-6 text-accent-color" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-color to-purple-500 bg-clip-text text-transparent">
                Transacciones Programadas
              </h1>
            </div>
            <p className="text-text-secondary">
              Gestiona tus transacciones recurrentes
            </p>
          </div>
          <button
            onClick={() => {
              setEditingTransaction(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-accent-color text-white px-6 py-3 rounded-xl hover:bg-accent-color-darker transition-all duration-300"
          >
            <FiPlus className="w-5 h-5" />
            <span>Nueva Transacción</span>
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="mb-8">
          <TransactionForm
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingTransaction(null);
            }}
            initialData={editingTransaction}
          />
        </div>
      )}

      {/* Lista de Transacciones */}
      <div className="grid grid-cols-1 gap-6">
        {transactions.length === 0 ? (
          <div className="bg-card-bg rounded-2xl p-12 text-center">
            <div className="text-6xl mb-6">🔄</div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              No hay transacciones programadas
            </h2>
            <p className="text-text-secondary mb-8">
              Comienza a programar tus transacciones recurrentes para automatizar tus finanzas.
            </p>
            <button
              onClick={() => {
                setEditingTransaction(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 bg-accent-color text-white px-6 py-3 rounded-xl hover:bg-accent-color-darker transition-all duration-300"
            >
              <FiPlus className="w-5 h-5" />
              <span>Crear primera transacción</span>
            </button>
          </div>
        ) : (
          transactions.map(transaction => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onEdit={(transaction) => {
                setEditingTransaction(transaction);
                setShowForm(true);
              }}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              formatCurrency={formatCurrency}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ScheduledTransactions; 