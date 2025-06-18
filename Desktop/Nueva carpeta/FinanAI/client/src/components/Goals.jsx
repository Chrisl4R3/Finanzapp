import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import GoalForm from './GoalForm';
import ContributeForm from './ContributeForm';
import * as goalService from '../services/goals';
import { authenticatedFetch } from '../auth/auth';
import { FaTrash, FaPlus, FaHistory } from 'react-icons/fa';
import { IoMdTrendingUp } from 'react-icons/io';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
});

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showContributeForm, setShowContributeForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [historyGoal, setHistoryGoal] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState(null);
  const { formatCurrency } = useCurrency();

  const fetchGoals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await goalService.getAllGoals();
      setGoals(data);
    } catch (err) {
      console.error('Error en fetchGoals:', err);
      Toast.fire({
        icon: 'error',
        title: err.message || 'Error al cargar las metas'
      });
      setError(err.message || 'Ocurrió un error al cargar las metas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitGoal = async (formData) => {
    try {
      await goalService.createGoal(formData);
      await fetchGoals();
      setShowForm(false);
      Toast.fire({
        icon: 'success',
        title: '¡Meta creada exitosamente!'
      });
    } catch (err) {
      console.error('Error al guardar meta:', err);
      Toast.fire({
        icon: 'error',
        title: err.message || 'Error al crear la meta'
      });
      throw err;
    }
  };

  const handleDeleteGoal = async (goalId) => {
    // Limpiar el ID en caso de que venga como '22:1' u otro formato incorrecto
    const cleanGoalId = typeof goalId === 'string' ? goalId.split(':')[0] : goalId;
    // Find the goal to get its name for the Swal title
    const goalToDelete = goals.find(goal => String(goal.id) === String(cleanGoalId));
    const goalName = goalToDelete ? goalToDelete.name : 'la meta';

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      html: `<p>¿Estás seguro de que deseas eliminar la meta: <strong>${goalName}</strong>?</p><p class="text-text-secondary text-sm mt-2">Esta acción no se puede deshacer. El progreso actual se devolverá a tu presupuesto principal.</p>`,
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: false, // Ensure only confirm/cancel
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#1A1A1A',
      color: '#FFFFFF',
      input: 'textarea',
      inputLabel: '¿Por qué quieres terminar esta meta?',
      inputPlaceholder: 'Escribe tu razón aquí (opcional)...',
      inputAttributes: {
        'aria-label': 'Escribe tu razón aquí',
      },
      inputValue: '', // Initial value
      customClass: {
        popup: 'rounded-2xl border border-border-color/10',
        confirmButton: 'rounded-xl',
        cancelButton: 'rounded-xl',
        input: 'swal2-input !bg-secondary-bg !text-text-primary !border-border-color/20' // Custom styling for textarea
      }
    });

    if (result.isConfirmed) { // User clicked 'Sí, eliminar'
      try {
        await goalService.deleteGoal(cleanGoalId);
        await fetchGoals();
        Toast.fire({
          icon: 'success',
          title: 'Meta eliminada exitosamente'
        });
      } catch (err) {
        console.error('Error al eliminar meta:', err);
        Toast.fire({
          icon: 'error',
          title: err.message || 'Error al eliminar la meta'
        });
        setError(err.message || 'Error al eliminar la meta');
      }
    }
    // No action needed if result.dismiss is true (user clicked 'Cancelar' or outside)

  };

  // Función para obtener el saldo actual del usuario
  const getCurrentBalance = async () => {
    try {
      const response = await authenticatedFetch('/transactions/dashboard');
      const data = await response.json();
      return data.summary?.balance || 0;
    } catch (error) {
      console.error('Error al obtener el saldo:', error);
      return 0; // En caso de error, asumimos saldo 0 para ser conservadores
    }
  };

  const handleContribute = async (amount, isDirectContribution) => {
    try {
      // Verificar el saldo solo si no es una contribución directa
      if (!isDirectContribution) {
        const currentBalance = await getCurrentBalance();
        if (parseFloat(amount) > currentBalance) {
          throw new Error('Saldo insuficiente en tu presupuesto para realizar esta contribución');
        }
      }

      // Update the UI optimistically
      const updatedGoals = goals.map(goal => {
        if (goal.id === selectedGoal.id) {
          const newProgress = parseFloat(goal.progress || 0) + parseFloat(amount);
          return {
            ...goal,
            progress: newProgress,
            status: newProgress >= goal.target_amount ? 'Completed' : goal.status
          };
        }
        return goal;
      });
      setGoals(updatedGoals);
      
      // Close the form immediately for better UX
      setShowContributeForm(false);
      
      // Show success message immediately
      const percentage = ((parseFloat(selectedGoal.progress) + parseFloat(amount)) / selectedGoal.target_amount) * 100;
      const isGoalCompleted = percentage >= 100;
      
      if (isGoalCompleted) {
        await Swal.fire({
          title: '¡Felicitaciones! 🎉',
          text: '¡Has alcanzado tu meta financiera!',
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: '¡Gracias!',
          background: '#1A1A1A',
          color: '#FFFFFF',
          customClass: {
            popup: 'rounded-2xl border border-border-color/10',
            confirmButton: 'rounded-xl'
          }
        });
      } else {
        Toast.fire({
          icon: 'success',
          title: '¡Contribución exitosa!'
        });
      }
      
      // Clear the selected goal after showing the success message
      setSelectedGoal(null);
      
      // Then make the actual API call
      try {
        await goalService.contributeToGoal(selectedGoal.id, amount, isDirectContribution);
        
        // If this is a direct contribution, refresh the history if the history modal is open
        if (historyGoal && historyGoal.id === selectedGoal.id) {
          await fetchGoalHistory(selectedGoal.id);
        }
        
        // Refresh the goals list to ensure consistency
        await fetchGoals();
      } catch (apiError) {
        console.error('Error en la API al abonar:', apiError);
        // Mostrar error específico si es de saldo insuficiente
        if (apiError.message && apiError.message.includes('insuficiente')) {
          Toast.fire({
            icon: 'error',
            title: 'Saldo insuficiente para completar la transacción'
          });
        }
        // Recargar metas para revertir cambios visuales
        fetchGoals().catch(console.error);
      }
    } catch (err) {
      console.error('Error al abonar:', err);
      // Revert the optimistic update on error
      fetchGoals().catch(console.error);
      
      Toast.fire({
        icon: 'error',
        title: err.message || 'Error al registrar el abono'
      });
      throw err;
    }
  };

  // Función para obtener el historial de aportes a una meta
  const fetchGoalHistory = async (goalId) => {
    setLoadingHistory(true);
    setErrorHistory(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`https://backend-production-cf437.up.railway.app/api/transactions?goal_id=${goalId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Error al obtener el historial de la meta');
      const data = await response.json();
      setHistory(data.filter(tx => tx.goal_id === goalId));
    } catch (err) {
      setErrorHistory(err.message || 'Error al obtener el historial');
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-color"></div>
          <p className="text-text-secondary">Cargando tus metas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-danger-color/10 border border-danger-color/20 rounded-2xl p-8 text-center">
          <p className="text-xl text-danger-color mb-4">Error: {error}</p>
          <button 
            onClick={fetchGoals}
            className="bg-danger-color text-white px-6 py-3 rounded-xl hover:bg-danger-color/90 transition-all duration-300 transform hover:scale-105"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const getGoalIcon = (type) => {
    switch (type) {
      case 'Saving':
        return '🎯';
      case 'Spending Reduction':
        return '💰';
      default:
        return '🎯';
    }
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 100) return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    if (percentage >= 75) return 'bg-gradient-to-r from-accent-color to-accent-color-darker';
    if (percentage >= 50) return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
    if (percentage >= 25) return 'bg-gradient-to-r from-orange-500 to-orange-400';
    return 'bg-gradient-to-r from-red-500 to-red-400';
  };

  const renderGoal = (goal) => {
    const percentage = goal.target_amount > 0 ? (goal.progress / goal.target_amount) * 100 : 0;
    const daysLeft = Math.ceil((new Date(goal.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    const statusColor = getStatusColor(percentage);
    
    return (
      <div 
        key={goal.id} 
        className="bg-card-bg rounded-2xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-border-color/10"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="text-3xl bg-secondary-bg rounded-xl p-2">
              {getGoalIcon(goal.type)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary mb-1">{goal.name}</h2>
              <p className="text-text-secondary text-sm">
                {goal.type === 'Saving' ? 'Meta de Ahorro' : 'Reducción de Gastos'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setHistoryGoal(goal);
                fetchGoalHistory(goal.id);
              }}
              className="text-accent-color/80 hover:text-accent-color p-2 rounded-lg hover:bg-accent-color/10 transition-all duration-300"
              title="Ver historial de aportes"
            >
              <FaHistory />
            </button>
            <button
              onClick={() => handleDeleteGoal(goal.id)}
              className="text-danger-color/70 hover:text-danger-color p-2 rounded-lg hover:bg-danger-color/10 transition-all duration-300"
            >
              <FaTrash />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-secondary-bg rounded-xl p-4">
              <p className="text-text-secondary text-sm mb-1">Objetivo</p>
              <p className="text-xl font-semibold text-accent-color">
                {formatCurrency(goal.target_amount)}
              </p>
            </div>
            <div className="bg-secondary-bg rounded-xl p-4">
              <p className="text-text-secondary text-sm mb-1">Progreso</p>
              <p className="text-xl font-semibold text-emerald-400">
                {formatCurrency(goal.progress)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">Progreso</span>
              <span className={`font-medium ${
                percentage >= 100 
                  ? 'text-emerald-400' 
                  : percentage >= 75 
                    ? 'text-accent-color'
                    : 'text-text-secondary'
              }`}>
                {percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-4 bg-secondary-bg rounded-full overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${statusColor} relative`}
                style={{ 
                  width: `${Math.min(percentage, 100)}%`,
                  boxShadow: '0 0 8px rgba(0, 0, 0, 0.3)'
                }}
              >
                {percentage >= 15 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {percentage.toFixed(0)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-text-secondary text-sm mb-1">Fecha límite</p>
              <p className="text-text-primary">
                {new Date(goal.end_date).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-text-secondary text-sm mb-1">Días restantes</p>
              <p className={`font-medium ${daysLeft <= 7 ? 'text-danger-color' : 'text-text-primary'}`}>
                {daysLeft} días
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedGoal(goal);
              setShowContributeForm(true);
            }}
            className="w-full bg-accent-color text-white py-3 px-4 rounded-xl hover:bg-accent-color-darker transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 font-medium"
          >
            <IoMdTrendingUp className="text-xl" />
            Hacer un abono
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="bg-card-bg rounded-2xl p-6 mb-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] transition-all duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-color/10 rounded-xl">
                <svg className="w-6 h-6 text-accent-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-color to-purple-500 bg-clip-text text-transparent">
                Objetivos Financieros
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-text-primary">Gestiona y da seguimiento a tus metas</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <p className="text-text-secondary">
              {goals.length} {goals.length === 1 ? 'meta activa' : 'metas activas'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-secondary-bg rounded-xl p-2 shadow-inner">
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-text-secondary text-sm">
                {new Date().toLocaleDateString('es-ES', { 
                  year: 'numeric',
                  month: 'long'
                })}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-border-color/10"></div>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-accent-color hover:bg-accent-color-darker text-white px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 font-medium"
            >
              <FaPlus className="text-sm" /> Nueva Meta
            </button>
          </div>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="bg-card-bg rounded-2xl p-12 text-center border border-border-color/10">
          <div className="text-6xl mb-6">🎯</div>
          <h2 className="text-2xl font-semibold text-text-primary mb-4">
            ¡Comienza a establecer tus metas!
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Define objetivos financieros claros y realiza un seguimiento de tu progreso para alcanzar tus sueños.
          </p>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-accent-color text-white px-8 py-4 rounded-xl hover:bg-accent-color-darker transition-all duration-300 transform hover:scale-105 flex items-center gap-2 mx-auto"
          >
            <FaPlus /> Crear mi primera meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(renderGoal)}
        </div>
      )}

      {showForm && (
        <GoalForm
          onSubmit={handleSubmitGoal}
          onClose={() => setShowForm(false)}
        />
      )}

      {showContributeForm && selectedGoal && (
        <ContributeForm
          goal={selectedGoal}
          onSubmit={handleContribute}
          onClose={() => {
            setShowContributeForm(false);
            setSelectedGoal(null);
          }}
        />
      )}

      {historyGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card-bg rounded-xl p-8 max-w-lg w-full mx-4 relative">
            <button
              onClick={() => setHistoryGoal(null)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <FaHistory /> Historial de aportes
            </h2>
            <p className="mb-2 text-text-secondary">Meta: <span className="font-semibold text-text-primary">{historyGoal.name}</span></p>
            {loadingHistory ? (
              <div className="text-center py-8 text-text-secondary">Cargando historial...</div>
            ) : errorHistory ? (
              <div className="text-center py-8 text-danger-color">{errorHistory}</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">No hay aportes registrados para esta meta.</div>
            ) : (
              <ul className="divide-y divide-border-color/20">
                {history.map(tx => (
                  <li key={tx.id} className="py-3 flex justify-between items-center">
                    <span className="text-text-primary">{tx.date ? new Date(tx.date).toLocaleDateString('es-ES') : ''}</span>
                    <span className="text-accent-color font-semibold">+{formatCurrency(tx.amount)}</span>
                    <span className="text-text-secondary text-sm">{tx.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
