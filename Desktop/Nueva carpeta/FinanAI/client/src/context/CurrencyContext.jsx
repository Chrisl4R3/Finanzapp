import React, { createContext, useState, useContext } from 'react';

export const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('DOP');

  // Tasas de cambio (podrías obtenerlas de una API en producción)
  const exchangeRates = {
    DOP: 1,
    USD: 0.0175, // 1 DOP = 0.0175 USD
    EUR: 0.016 // 1 DOP = 0.016 EUR
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '';
    
    const numericAmount = parseFloat(amount);
    const convertedAmount = numericAmount / exchangeRates[currency];
    
    return convertedAmount.toLocaleString('es-DO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Hook personalizado para usar la moneda
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency debe ser usado dentro de un CurrencyProvider');
  }
  return context;
}; 