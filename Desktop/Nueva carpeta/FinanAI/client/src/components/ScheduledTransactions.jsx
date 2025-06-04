import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import * as scheduledTransactionService from '../services/scheduledTransactions';
import { FiCalendar, FiClock, FiRepeat, FiEdit2, FiTrash2, FiPause, FiPlay, FiPlus } from 'react-icons/fi';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#1A1A1A',
  color: '#FFFFFF'
});

const CATEGORIES = {
  Income: ['Salario', 'Regalo', 'Inversiones', 'Otros-Ingreso'],
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

const PAYMENT_METHODS = [
  'Efectivo',
  'Tarjeta de Débito',
  'Tarjeta de Crédito',
  'Transferencia Bancaria'
];

const FREQUENCIES = [
  { value: 'Daily', label: 'Diaria' },
  { value: 'Weekly', label: 'Semanal' },
  { value: 'Monthly', label: 'Mensual' },
  { value: 'Yearly', label: 'Anual' }
];

const TransactionForm = ({ onSubmit, onCancel, initialData = null }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'Expense',
    category: '',
    payment_method: '',
    frequency: 'Monthly',
    start_date: '',
    end_date: '',
    ...initialData
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card-bg rounded-2xl p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Descripción
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 rounded-xl bg-input-bg text-text-primary border border-border-color focus:border-accent-color focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Monto
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full px-4 py-2 rounded-xl bg-input-bg text-text-primary border border-border-color focus:border-accent-color focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Tipo
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })}
            className="w-full px-4 py-2 rounded-xl bg-input-bg text-text-primary border border-border-color focus:border-accent-color focus:outline-none"
            required
          >
            <option value="Income">Ingreso</option>
            <option value="Expense">Gasto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Categoría
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 rounded-xl bg-input-bg text-text-primary border border-border-color focus:border-accent-color focus:outline-none"
            required
          >
            <option value="">Seleccionar categoría</option>
            {CATEGORIES[formData.type].map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Método de pago
          </label>
          <select
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            className="w-full px-4 py-2 rounded-xl bg-input-bg text-text-primary border border-border-color focus:border-accent-color focus:outline-none"
            required
          >
            <option value="">Seleccionar método</option>
            {PAYMENT_METHODS.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Frecuencia
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            className="w-full px-4 py-2 rounded-xl bg-input-bg text-text-primary border border-border-color focus:border-accent-color focus:outline-none"
            required
          >
            {FREQUENCIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Fecha de inicio
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="w-full px-4 py-2 rounded-xl bg-input-bg text-text-primary border border-border-color focus:border-accent-color focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Fecha de fin (opcional)
          </label>
          <input
            type="date"
            value={formData.end_date || ''}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
            className="w-full px-4 py-2 rounded-xl bg-input-bg text-text-primary border border-border-color focus:border-accent-color focus:outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 rounded-xl border border-border-color text-text-secondary hover:bg-background-color transition-all duration-300"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-2 rounded-xl bg-accent-color text-white hover:bg-accent-color-darker transition-all duration-300"
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
        return 'bg-green-500/20 text-green-500';
      case 'Paused':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'Completed':
        return 'bg-gray-500/20 text-gray-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
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
    const frequencyMap = {
      Daily: 'Diaria',
      Weekly: 'Semanal',
      Monthly: 'Mensual',
      Yearly: 'Anual'
    };
    return frequencyMap[frequency] || frequency;
  };

  return (
    <div className="bg-card-bg rounded-2xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            {transaction.description}
          </h3>
          <p className={`text-2xl font-bold ${transaction.type === 'Income' ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(transaction.amount)}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onStatusChange(transaction.id, transaction.status)}
            className="p-2 rounded-lg hover:bg-background-color transition-all duration-300"
            title={transaction.status === 'Active' ? 'Pausar' : 'Activar'}
          >
            {transaction.status === 'Active' ? (
              <FiPause className="w-5 h-5 text-yellow-500" />
            ) : (
              <FiPlay className="w-5 h-5 text-green-500" />
            )}
          </button>
          <button
            onClick={() => onEdit(transaction)}
            className="p-2 rounded-lg hover:bg-background-color transition-all duration-300"
            title="Editar"
          >
            <FiEdit2 className="w-5 h-5 text-blue-500" />
          </button>
          <button
            onClick={() => onDelete(transaction.id)}
            className="p-2 rounded-lg hover:bg-background-color transition-all duration-300"
            title="Eliminar"
          >
            <FiTrash2 className="w-5 h-5 text-red-500" />
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text-primary">
          Transacciones Programadas
        </h1>
        {!showForm && (
          <button
            onClick={() => {
              setEditingTransaction(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 bg-accent-color text-white px-6 py-3 rounded-xl hover:bg-accent-color-darker transition-all duration-300"
          >
            <FiPlus className="w-5 h-5" />
            <span>Nueva Transacción</span>
          </button>
        )}
      </div>

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

      {isLoading && !showForm ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl text-text-secondary">Cargando transacciones programadas...</div>
        </div>
      ) : error ? (
        <div className="bg-red-500/20 text-red-500 p-4 rounded-xl">
          {error}
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default ScheduledTransactions; 