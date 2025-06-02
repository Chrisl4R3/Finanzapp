import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { IoClose } from 'react-icons/io5';

const ContributeForm = ({ goal, onSubmit, onClose }) => {
  const { formatCurrency } = useCurrency();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDirectContribution, setIsDirectContribution] = useState(false);

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

      const remainingAmount = goal.target_amount - goal.progress;
      if (numAmount > remainingAmount) {
        throw new Error(`El monto no puede ser mayor a ${formatCurrency(remainingAmount)}`);
      }

      await onSubmit(numAmount, isDirectContribution);
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
    <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl p-6 w-full max-w-md relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <h2 className="text-xl text-white">
              {goal.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <IoClose size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {isSuccess && (
          <div className="bg-emerald-900/20 border border-emerald-500/50 text-emerald-500 px-4 py-3 rounded-xl mb-6">
            ¡Abono registrado exitosamente!
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#252525] rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Objetivo</p>
            <p className="text-lg text-emerald-400">{formatCurrency(goal.target_amount)}</p>
          </div>
          <div className="bg-[#252525] rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">Restante</p>
            <p className="text-lg text-white">{formatCurrency(goal.target_amount - goal.progress)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Monto a abonar
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-4 bg-[#252525] rounded-xl border-none focus:ring-2 focus:ring-accent-color text-white"
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#252525] rounded-xl">
            <input
              type="checkbox"
              id="directContribution"
              checked={isDirectContribution}
              onChange={(e) => setIsDirectContribution(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 text-accent-color focus:ring-accent-color bg-[#1A1A1A]"
            />
            <label htmlFor="directContribution" className="text-sm text-gray-300">
              Contribución directa (no afecta el presupuesto general)
            </label>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl text-white font-medium transition-all duration-300 ${
                isSubmitting
                  ? 'bg-accent-color/50 cursor-not-allowed'
                  : 'bg-accent-color hover:bg-accent-color-darker'
              }`}
            >
              {isSubmitting ? 'Procesando...' : 'Realizar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContributeForm; 