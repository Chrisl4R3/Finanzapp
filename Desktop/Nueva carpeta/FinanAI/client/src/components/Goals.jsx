import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import GoalForm from './GoalForm';
import ContributeForm from './ContributeForm';
import * as goalService from '../services/goals';
import { FaTrash, FaPlus } from 'react-icons/fa';
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
    // Find the goal to get its name for the Swal title
    const goalToDelete = goals.find(goal => goal.id === goalId);
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
      const reason = result.value || 'No se proporcionó razón'; // Get the value from the textarea
      try {
        await goalService.deleteGoal(goalId, reason);
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

  const handleContribute = async (amount, isDirectContribution) => {
    try {
      await goalService.contributeToGoal(selectedGoal.id, amount, isDirectContribution);
      await fetchGoals();
      setShowContributeForm(false);
      setSelectedGoal(null);
      
      const percentage = (selectedGoal.progress + amount) / selectedGoal.target_amount * 100;
      
      if (percentage >= 100) {
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
          title: '¡Abono registrado exitosamente!'
        });
      }
    } catch (err) {
      console.error('Error al abonar:', err);
      Toast.fire({
        icon: 'error',
        title: err.message || 'Error al registrar el abono'
      });
      throw err;
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
          <button
            onClick={() => handleDeleteGoal(goal.id)}
            className="text-danger-color/70 hover:text-danger-color p-2 rounded-lg hover:bg-danger-color/10 transition-all duration-300"
          >
            <FaTrash />
          </button>
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
    </div>
  );
};

export default Goals;
