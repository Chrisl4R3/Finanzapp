import React, { useState, useEffect } from 'react';
import { getDashboardData, getRecentTransactions, getActiveGoals, getNotifications } from '../auth/auth';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    financialSummary: { income: 0, expenses: 0, balance: 0 },
    expensesByCategory: [],
    monthlyTrends: [],
    recentTransactions: [],
    activeGoals: [],
    notifications: []
  });
  const { currency, setCurrency, formatCurrency } = useCurrency();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!isAuthenticated) {
          setError('No has iniciado sesión. Por favor, inicia sesión para ver el dashboard.');
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        console.log('Fetching dashboard data...');
        
        try {
          const dashboardResponse = await getDashboardData();
          console.log('Dashboard response:', dashboardResponse);
          
          const [transactions, goals, notifications] = await Promise.all([
            getRecentTransactions(),
            getActiveGoals(),
            getNotifications()
          ]);
          
          console.log('Additional data:', { transactions, goals, notifications });

          setDashboardData({
            financialSummary: {
              income: dashboardResponse.summary.total_income || 0,
              expenses: dashboardResponse.summary.total_expenses || 0,
              balance: dashboardResponse.summary.balance || 0
            },
            expensesByCategory: dashboardResponse.expensesByCategory || [],
            monthlyTrends: dashboardResponse.monthlyTrends || [],
            recentTransactions: transactions || [],
            activeGoals: goals || [],
            notifications: notifications || []
          });
        } catch (err) {
          console.error('Error en la petición:', err);
          if (err.message.includes('401')) {
            setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          } else {
            setError('Error al cargar los datos del dashboard. Por favor, intenta de nuevo.');
          }
        }
      } catch (err) {
        console.error('Error general:', err);
        setError('Error inesperado. Por favor, intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated]);

  // Configuración del gráfico de gastos por categoría
  const expensesByCategoryData = {
    labels: dashboardData.expensesByCategory.map(item => item.category),
    datasets: [
      {
        data: dashboardData.expensesByCategory.map(item => item.total),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#36A2EB',
          '#FFCE56'
        ],
        hoverBackgroundColor: [
          '#FF4F71',
          '#2F8FD8',
          '#FFBB33',
          '#38ADAD',
          '#8653FF',
          '#FF8C2D',
          '#FF4F71',
          '#2F8FD8',
          '#FFBB33',
          '#38ADAD',
          '#8653FF',
          '#FF8C2D',
          '#FF4F71',
          '#2F8FD8',
          '#FFBB33'
        ]
      }
    ]
  };

  const expensesByCategoryOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          },
          padding: 20,
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        bodyFont: {
          family: "'Inter', sans-serif"
        },
        padding: 12,
        boxPadding: 6
      }
    }
  };

  // Configuración del gráfico de tendencias mensuales
  const monthlyTrendsData = {
    labels: dashboardData.monthlyTrends.map(item => {
      const [year, month] = item.month.split('-');
      const date = new Date(year, month - 1);
      return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Ingresos',
        data: dashboardData.monthlyTrends.map(item => item.income),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1
      },
      {
        label: 'Gastos',
        data: dashboardData.monthlyTrends.map(item => item.expenses),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1
      }
    ]
  };

  const monthlyTrendsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          }
        }
      },
      title: {
        display: true,
        text: 'Tendencias Mensuales',
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          size: 16,
          family: "'Inter', sans-serif",
          weight: '600'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        bodyFont: {
          family: "'Inter', sans-serif"
        },
        padding: 12,
        boxPadding: 6,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 11,
            family: "'Inter', sans-serif"
          },
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  // Función para obtener el icono según la categoría
  const getCategoryIcon = (category) => {
    const icons = {
      'Alimentación': '🛒',
      'Servicios': '💡',
      'Salud': '💊',
      'Vivienda': '🏠',
      'Educación': '📚',
      'Transporte': '🚗',
      'Ropa': '👕',
      'Seguros': '🔒',
      'Mantenimiento': '🔧',
      'Entretenimiento': '🎮',
      'Pasatiempos': '⚽',
      'Restaurantes': '🍽️',
      'Compras': '🛍️',
      'Viajes': '✈️',
      'Salario': '💰',
      'Regalo': '🎁',
      'Otros-Ingreso': '💵',
      'Otros-Gasto': '📝'
    };
    return icons[category] || '💰';
  };

  // Función para formatear la fecha
  const formatDate = (date) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const d = new Date(date);
    return `${days[d.getDay()]}, ${d.getDate()} De ${months[d.getMonth()]}`;
  };

  // Función para agrupar transacciones por fecha
  const groupTransactionsByDate = (transactions) => {
    const groups = {};
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const dateKey = date.toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: date,
          transactions: [],
          total: 0
        };
      }
      groups[dateKey].transactions.push(transaction);
      groups[dateKey].total += transaction.type === 'Income' ? 
        parseFloat(transaction.amount) : 
        -parseFloat(transaction.amount);
    });
    return Object.values(groups).sort((a, b) => b.date - a.date);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-text-secondary">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-danger-color">{error}</div>
      </div>
    );
  }

  const { financialSummary, recentTransactions, activeGoals, notifications } = dashboardData;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-card-bg rounded-2xl p-6 mb-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] transition-all duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-color/10 rounded-xl">
                <svg className="w-6 h-6 text-accent-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-color to-purple-500 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-text-primary">¡Bienvenido, {user?.name || 'Usuario'}!</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <p className="text-text-secondary">
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-secondary-bg rounded-xl p-2 shadow-inner">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-text-primary font-medium cursor-pointer hover:text-accent-color transition-colors"
              >
                <option value="DOP" className="bg-card-bg">DOP</option>
                <option value="USD" className="bg-card-bg">USD</option>
                <option value="EUR" className="bg-card-bg">EUR</option>
              </select>
            </div>
            <div className="h-8 w-[1px] bg-border-color/10"></div>
            <div className="flex items-center gap-2 bg-secondary-bg rounded-xl p-2 shadow-inner">
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-text-secondary text-sm">
                {new Date().toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card-bg rounded-2xl p-6 hover:transform hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl shadow-inner">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-secondary">Balance Total</h3>
          </div>
          <p className={`text-2xl font-bold ${financialSummary.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(financialSummary.balance)}
          </p>
        </div>

        <div className="bg-card-bg rounded-2xl p-6 hover:transform hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-accent-color/10 rounded-xl shadow-inner">
              <svg className="w-6 h-6 text-accent-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-secondary">Ingresos del Mes</h3>
          </div>
          <p className="text-2xl font-bold text-accent-color">
            {formatCurrency(financialSummary.income)}
          </p>
        </div>

        <div className="bg-card-bg rounded-2xl p-6 hover:transform hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl shadow-inner">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-secondary">Gastos del Mes</h3>
          </div>
          <p className="text-2xl font-bold text-red-500">
            {formatCurrency(financialSummary.expenses)}
          </p>
        </div>

        <div className="bg-card-bg rounded-2xl p-6 hover:transform hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl shadow-inner">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-text-secondary">Presupuesto Restante</h3>
          </div>
          <p className={`text-2xl font-bold ${financialSummary.balance >= 0 ? 'text-purple-500' : 'text-red-500'}`}>
            {formatCurrency(financialSummary.balance)}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Gastos por Categoría */}
        <div className="bg-card-bg rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary">Gastos por Categoría</h2>
            <div className="p-2 bg-secondary-bg rounded-xl shadow-inner">
              <svg className="w-5 h-5 text-accent-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
          </div>
          <div className="h-[300px]">
            <Doughnut 
              data={expensesByCategoryData}
              options={expensesByCategoryOptions}
            />
          </div>
        </div>

        {/* Gráfico de Tendencias Mensuales */}
        <div className="bg-card-bg rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary">Tendencias Mensuales</h2>
            <div className="p-2 bg-secondary-bg rounded-xl shadow-inner">
              <svg className="w-5 h-5 text-accent-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="h-[300px]">
            <Bar 
              data={monthlyTrendsData} 
              options={monthlyTrendsOptions}
            />
          </div>
        </div>
      </div>

      {/* Transacciones Recientes */}
      <div className="bg-card-bg rounded-2xl mb-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] transition-all duration-300">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary-bg rounded-xl shadow-inner">
                <svg className="w-5 h-5 text-accent-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Transacciones Recientes</h2>
            </div>
            <a href="/transactions" className="text-accent-color hover:text-accent-color-darker transition-colors flex items-center gap-2 group">
              Ver todas
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div className="space-y-6">
            {groupTransactionsByDate(recentTransactions).map(group => (
              <div key={group.date.toISOString()} className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-medium text-text-secondary">
                    {formatDate(group.date)}
                  </h3>
                  <span className={`text-sm font-medium px-3 py-1 rounded-lg shadow-inner ${
                    group.total >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {group.total >= 0 ? '+' : ''}{formatCurrency(group.total)}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.transactions.map(transaction => (
                    <div
                      key={transaction.id}
                      className="bg-secondary-bg rounded-xl p-4 hover:transform hover:-translate-y-1 transition-all duration-300 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-xl shadow-inner ${
                            transaction.type === 'Income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                          }`}>
                            <span className="text-xl">
                              {getCategoryIcon(transaction.category)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-text-primary">
                              {transaction.description}
                            </h4>
                            <p className="text-sm text-text-secondary">
                              {transaction.category}
                            </p>
                          </div>
                        </div>
                        <span className={`font-medium ${
                          transaction.type === 'Income' ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {transaction.type === 'Income' ? '+' : '-'}
                          {formatCurrency(Math.abs(parseFloat(transaction.amount)))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="text-center py-8">
                <div className="bg-secondary-bg rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-inner">
                  <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-text-secondary">No hay transacciones recientes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metas Financieras */}
      <div className="bg-card-bg rounded-2xl mb-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] transition-all duration-300">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary-bg rounded-xl shadow-inner">
                <svg className="w-5 h-5 text-accent-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Progreso de Metas</h2>
            </div>
            <a href="/goals" className="text-accent-color hover:text-accent-color-darker transition-colors flex items-center gap-2 group">
              Ver todas
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="space-y-4">
            {activeGoals.map(goal => (
              <div key={goal.id} className="bg-secondary-bg rounded-xl p-4 hover:transform hover:-translate-y-1 transition-all duration-300 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-text-primary">{goal.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-text-secondary">
                        Progreso: {formatCurrency(goal.progress || 0)}
                      </p>
                      <span className="text-text-secondary">•</span>
                      <p className="text-sm text-text-secondary">
                        Meta: {formatCurrency(goal.target_amount)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-lg shadow-inner ${
                    ((goal.progress || 0) / goal.target_amount) >= 1 
                      ? 'bg-emerald-500/20 text-emerald-500' 
                      : ((goal.progress || 0) / goal.target_amount) >= 0.75
                        ? 'bg-accent-color/20 text-accent-color'
                        : 'bg-purple-500/20 text-purple-500'
                  }`}>
                    {((goal.progress || 0) / goal.target_amount * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full h-4 bg-background-color rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                  <div 
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                      ((goal.progress || 0) / goal.target_amount) >= 1
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        : ((goal.progress || 0) / goal.target_amount) >= 0.75
                          ? 'bg-gradient-to-r from-accent-color-darker to-accent-color'
                          : 'bg-gradient-to-r from-purple-600 to-purple-400'
                    }`}
                    style={{ 
                      width: `${Math.min(((goal.progress || 0) / goal.target_amount) * 100, 100)}%`,
                      boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {((goal.progress || 0) / goal.target_amount) > 0.1 && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {((goal.progress || 0) / goal.target_amount * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] rounded-full"></div>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-text-secondary">
                  <span>0%</span>
                  <div className="flex gap-1">
                    <span className="w-1 h-4 bg-background-color rounded-full"></span>
                    <span className="w-1 h-4 bg-background-color rounded-full"></span>
                    <span className="w-1 h-4 bg-background-color rounded-full"></span>
                  </div>
                  <span>100%</span>
                </div>
              </div>
            ))}
            {activeGoals.length === 0 && (
              <div className="text-center py-8">
                <div className="bg-secondary-bg rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-inner">
                  <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-text-secondary">No hay metas activas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="bg-card-bg rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] transition-all duration-300">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-secondary-bg rounded-xl shadow-inner">
              <svg className="w-5 h-5 text-accent-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary">Notificaciones</h2>
          </div>
          <div className="space-y-4">
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`p-4 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] ${
                  notification.type === 'Warning' 
                    ? 'bg-warning-color/10 text-warning-color'
                    : 'bg-accent-color/10 text-accent-color'
                }`}
              >
                {notification.message}
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-center py-8">
                <div className="bg-secondary-bg rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-inner">
                  <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-text-secondary">No hay notificaciones nuevas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
