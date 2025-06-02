import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import * as scheduledTransactionService from '../services/scheduledTransactions';
import Swal from 'sweetalert2';
import { FiCalendar, FiClock, FiRepeat, FiEdit2, FiTrash2, FiPause, FiPlay } from 'react-icons/fi';

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

const ScheduledTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const { formatCurrency } = useCurrency();

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'Expense',
    category: '',
    payment_method: 'Efectivo',
    frequency: 'Monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'Active'
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
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
      setFormData({
        description: '',
        amount: '',
        type: 'Expense',
        category: '',
        payment_method: 'Efectivo',
        frequency: 'Monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'Active'
      });
      await fetchTransactions();
    } catch (err) {
      Toast.fire({
        icon: 'error',
        title: err.message || 'Error al guardar la transacción programada'
      });
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

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      payment_method: transaction.payment_method,
      frequency: transaction.frequency,
      start_date: transaction.start_date.split('T')[0],
      end_date: transaction.end_date ? transaction.end_date.split('T')[0] : '',
      status: transaction.status
    });
    setShowForm(true);
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

  if (isLoading) {
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
              setFormData({
                description: '',
                amount: '',
                type: 'Expense',
                category: '',
                payment_method: 'Efectivo',
                frequency: 'Monthly',
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                status: 'Active'
              });
              setShowForm(true);
            }}
            className="bg-accent-color text-white px-6 py-3 rounded-xl hover:bg-accent-color-darker transition-all duration-300"
          >
            Nueva Transacción Programada
          </button>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card-bg rounded-xl p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-text-primary mb-6">
              {editingTransaction ? 'Editar' : 'Nueva'} Transacción Programada
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Descripción
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Monto
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Tipo
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })}
                    className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
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
                    name="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
                    required
                  >
                    <option value="">Selecciona una categoría</option>
                    {CATEGORIES[formData.type].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Método de Pago
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
                    required
                  >
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
                    name="frequency"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
                    required
                  >
                    {FREQUENCIES.map(freq => (
                      <option key={freq} value={freq}>{formatFrequency(freq)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Fecha de Fin (Opcional)
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-3 rounded-lg bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTransaction(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-secondary-bg text-text-primary hover:bg-opacity-80 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-accent-color text-white hover:bg-accent-color-darker transition-all duration-300"
                >
                  {editingTransaction ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
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
          </div>
        ) : (
          transactions.map(transaction => (
            <div
              key={transaction.id}
              className="bg-card-bg rounded-xl p-6 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    transaction.type === 'Income' 
                      ? 'bg-success-color/10 text-success-color' 
                      : 'bg-danger-color/10 text-danger-color'
                  }`}>
                    <FiRepeat className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {transaction.description}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-sm text-text-secondary">
                        {transaction.category}
                      </span>
                      <span className="text-text-secondary">•</span>
                      <span className="text-sm text-text-secondary">
                        {formatFrequency(transaction.frequency)}
                      </span>
                      <span className="text-text-secondary">•</span>
                      <span className="text-sm text-text-secondary">
                        {transaction.payment_method}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-lg font-semibold ${
                    transaction.type === 'Income' ? 'text-success-color' : 'text-danger-color'
                  }`}>
                    {transaction.type === 'Income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(transaction.id, transaction.status)}
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        transaction.status === 'Active'
                          ? 'text-success-color hover:bg-success-color/10'
                          : 'text-text-secondary hover:bg-secondary-bg'
                      }`}
                      title={transaction.status === 'Active' ? 'Pausar' : 'Activar'}
                    >
                      {transaction.status === 'Active' ? <FiPause /> : <FiPlay />}
                    </button>
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="p-2 text-text-secondary hover:text-accent-color hover:bg-accent-color/10 rounded-lg transition-all duration-300"
                      title="Editar"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="p-2 text-text-secondary hover:text-danger-color hover:bg-danger-color/10 rounded-lg transition-all duration-300"
                      title="Eliminar"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-text-secondary">
                  <FiCalendar className="w-4 h-4" />
                  <span className="text-sm">
                    Inicio: {new Date(transaction.start_date).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {transaction.end_date && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <FiClock className="w-4 h-4" />
                    <span className="text-sm">
                      Fin: {new Date(transaction.end_date).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    transaction.status === 'Active'
                      ? 'bg-success-color/10 text-success-color'
                      : 'bg-text-secondary/10 text-text-secondary'
                  }`}>
                    {transaction.status === 'Active' ? 'Activa' : 'Pausada'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ScheduledTransactions; 