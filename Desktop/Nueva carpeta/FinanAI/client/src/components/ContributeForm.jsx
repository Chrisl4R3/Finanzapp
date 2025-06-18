import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { IoClose } from 'react-icons/io5';

const ContributeForm = ({ goal, onSubmit, onClose }) => {
  const { formatCurrency } = useCurrency();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setIsSuccess(false);

    try {
      const numAmount = parseFloat(amount);
      
      if (!amount || numAmount <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      if (isNaN(numAmount)) {
        throw new Error('Por favor ingresa un monto válido');
      }

      if (numAmount > goal.target_amount) {
        throw new Error(`El monto no puede ser mayor al objetivo de la meta (${formatCurrency(goal.target_amount)})`);
      }

      await onSubmit(numAmount);
      setIsSuccess(true);
      
      // Esperar un momento antes de cerrar
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (err) {
      console.error('Error al abonar:', err);
      setError(err.message || 'Error al registrar el abono');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1A1A1A] rounded-2xl p-4 sm:p-6 w-full max-w-md relative my-8 mx-auto">
        <div className="flex items-start justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 max-w-[80%]">
            <span className="text-xl sm:text-2xl">💰</span>
            <h2 className="text-lg sm:text-xl text-white truncate">
              {goal.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0 mt-1"
            disabled={isSubmitting}
            aria-label="Cerrar"
          >
            <IoClose className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-500 px-3 sm:px-4 py-2 sm:py-3 rounded-xl mb-4 sm:mb-6 text-sm sm:text-base">
            {error}
          </div>
        )}

        {isSuccess && (
          <div className="bg-emerald-900/20 border border-emerald-500/50 text-emerald-500 px-3 sm:px-4 py-2 sm:py-3 rounded-xl mb-4 sm:mb-6 text-sm sm:text-base">
            ¡Abono registrado exitosamente!
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-[#252525] rounded-xl p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm mb-1">Objetivo</p>
            <p className="text-base sm:text-lg text-emerald-400 truncate">{formatCurrency(goal.target_amount)}</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-3 sm:p-4">
            <p className="text-gray-400 text-xs sm:text-sm mb-1">Restante</p>
            <p className="text-base sm:text-lg text-white truncate">{formatCurrency(goal.target_amount - goal.progress)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-2">
              Monto a abonar
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 sm:p-4 bg-[#252525] rounded-xl border-none focus:ring-2 focus:ring-accent-color text-white text-sm sm:text-base"
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={isSubmitting}
                inputMode="decimal"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="pt-2 sm:pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 sm:py-4 px-4 rounded-xl text-white font-medium transition-all duration-300 text-sm sm:text-base ${
                isSubmitting
                  ? 'bg-accent-color/50 cursor-not-allowed'
                  : 'bg-accent-color hover:bg-accent-color-darker active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </span>
              ) : 'Realizar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContributeForm; 