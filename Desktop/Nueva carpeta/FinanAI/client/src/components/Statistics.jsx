import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useCurrency } from '../context/CurrencyContext';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const Statistics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 1);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  });

  // Estado inicial optimizado
  const [stats, setStats] = useState({
    summary: {
      totalIncome: '0.00',
      totalExpenses: '0.00',
      balance: '0.00',
      averageIncome: '0.00',
      averageExpense: '0.00',
      transactionCount: 0
    },
    trends: [],
    categoryDistribution: [],
    mostActiveDays: []
  });
  
  const [currency, setCurrency] = useState('DOP');

  // Usar useCallback para memoizar la función de fetch
  const fetchStatistics = useCallback(async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      console.log('Fechas no válidas para la consulta');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Timeout alcanzado en la petición de estadísticas');
      controller.abort();
    }, 15000); // Aumentado a 15 segundos

    try {
      console.log('Iniciando carga de estadísticas...');
      setIsLoading(true);
      setError(null);

      const url = `https://backend-production-cf437.up.railway.app/api/transactions/statistics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      console.log('URL de la petición:', url);
      
      const token = localStorage.getItem('authToken');
      console.log('Token de autenticación:', token ? 'Presente' : 'No encontrado');

      const response = await fetch(url, { 
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Respuesta HTTP recibida:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const responseData = await response.text();
      console.log('Contenido de la respuesta:', responseData);
      
      let data;
      try {
        data = JSON.parse(responseData);
      } catch (e) {
        console.error('Error al parsear la respuesta JSON:', e);
        throw new Error('La respuesta del servidor no es un JSON válido');
      }
      
      if (!response.ok) {
        console.error('Error en la respuesta del servidor:', data);
        throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      console.log('Datos de estadísticas procesados correctamente');
      
      // Procesamiento más eficiente de los datos
      const processedData = {
        summary: {
          totalIncome: (data.summary?.total_income || 0).toFixed(2),
          totalExpenses: (data.summary?.total_expenses || 0).toFixed(2),
          balance: (data.summary?.net_balance || 0).toFixed(2),
          averageIncome: (data.summary?.average_income || 0).toFixed(2),
          averageExpense: (data.summary?.average_expense || 0).toFixed(2),
          transactionCount: data.summary?.total_transactions || 0
        },
        trends: Array.isArray(data.monthlyTrends) 
          ? data.monthlyTrends.map(t => ({
              ...t,
              income: Number(t.income || 0).toFixed(2),
              expenses: Number(t.expenses || 0).toFixed(2),
              net_balance: Number(t.net_balance || 0).toFixed(2)
            })) 
          : [],
        categoryDistribution: Array.isArray(data.categoryAnalysis) 
          ? data.categoryAnalysis
              .map(c => ({
                category: c.category || 'Sin categoría',
                amount: Number(c.total_amount || 0).toFixed(2),
                count: parseInt(c.transaction_count || 0, 10),
                average: Number(c.average_amount || 0).toFixed(2)
              }))
              .filter(c => !isNaN(c.amount))
          : [],
        mostActiveDays: Array.isArray(data.topDays)
          ? data.topDays
              .map(d => ({
                day_of_week: d.day_of_week,
                transaction_count: parseInt(d.transaction_count || 0, 10),
                total_amount: Number(d.total_amount || 0).toFixed(2)
              }))
              .filter(d => !isNaN(d.transaction_count) && !isNaN(d.total_amount))
          : []
      };

      console.log('Datos procesados:', processedData);
      setStats(processedData);
    } catch (err) {
      console.error('Error en fetchStatistics:', err);
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error al cargar las estadísticas. Por favor, intente de nuevo.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [dateRange]);

  // Cargar estadísticas al montar el componente y cuando cambien las fechas
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Colores para gráficos
  const chartColors = {
    income: 'rgba(110, 231, 183, 1)', // Verde menta
    incomeLight: 'rgba(110, 231, 183, 0.2)',
    expense: 'rgba(248, 113, 113, 1)', // Rojo coral
    expenseLight: 'rgba(248, 113, 113, 0.2)',
    categories: [
      'rgba(110, 231, 183, 1)',
      'rgba(248, 113, 113, 1)',
      'rgba(251, 191, 36, 1)',
      'rgba(129, 140, 248, 1)',
      'rgba(236, 72, 153, 1)',
      'rgba(52, 211, 153, 1)',
      'rgba(239, 68, 68, 1)',
      'rgba(167, 139, 250, 1)',
      'rgba(245, 158, 11, 1)',
      'rgba(59, 130, 246, 1)'
    ]
  };

  // Opciones optimizadas para los gráficos
  const commonOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300, // Reducir la duración de las animaciones
      animateScale: true,
      animateRotate: true
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          },
          padding: 20
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        padding: 10,
        boxPadding: 6,
        usePointStyle: true,
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 12
        },
        titleFont: {
          family: "'Inter', sans-serif",
          size: 12,
          weight: '600'
        },
        callbacks: {
          label: function(context) {
            return ` ${context.dataset.label}: ${formatCurrency(parseFloat(context.raw))}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
            family: "'Inter', sans-serif"
          },
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
            family: "'Inter', sans-serif"
          },
          callback: (value) => formatCurrency(value)
        }
      }
    }
  }), [formatCurrency]);


  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para procesar los datos de tendencias
  const processTrendData = (trendsData) => {
    if (!Array.isArray(trendsData) || trendsData.length === 0) return [];

    return trendsData.map(item => {
      let date;
      // Manejar diferentes formatos de fecha
      if (item.date) {
        date = new Date(item.date);
      } else if (item.month) {
        const [year, month] = item.month.split('-');
        date = new Date(year, parseInt(month) - 1);
      } else {
        return null;
      }

      return {
        date,
        income: parseFloat(item.income || 0),
        expenses: parseFloat(item.expenses || 0)
      };
    }).filter(Boolean) // Eliminar elementos nulos
    .sort((a, b) => a.date - b.date); // Ordenar por fecha
  };

  // Configuración del gráfico de tendencias
  const trendData = {
    labels: processTrendData(stats.trends).map(item => 
      item.date.toLocaleDateString('es-ES', { 
        day: 'numeric',
        month: 'short'
      })
    ),
    datasets: [
      {
        label: 'Ingresos',
        data: processTrendData(stats.trends).map(item => item.income),
        borderColor: chartColors.income,
        backgroundColor: chartColors.incomeLight,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Gastos',
        data: processTrendData(stats.trends).map(item => item.expenses),
        borderColor: chartColors.expense,
        backgroundColor: chartColors.expenseLight,
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Opciones específicas para el gráfico de tendencias
  const trendOptions = {
    ...commonOptions,
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
          },
          maxRotation: 45,
          minRotation: 45
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
          callback: (value) => formatCurrency(value)
        }
      }
    },
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        callbacks: {
          title: function(context) {
            const date = processTrendData(stats.trends)[context[0].dataIndex].date;
            return date.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          },
          label: function(context) {
            const value = context.raw;
            return `${context.dataset.label}: ${formatCurrency(value)}`;
          }
        }
      }
    }
  };

  // Configuración del gráfico de distribución por categorías
  const categoryData = {
    labels: stats.categoryDistribution.map(item => item.category || 'Sin categoría'),
    datasets: [{
      data: stats.categoryDistribution.map(item => Math.abs(parseFloat(item.amount || 0))),
      backgroundColor: chartColors.categories.slice(0, stats.categoryDistribution.length),
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  // Opciones específicas para el gráfico de categorías
  const categoryOptions = {
    ...commonOptions,
    cutout: '60%',
    plugins: {
      ...commonOptions.plugins,
      legend: {
        ...commonOptions.plugins.legend,
        position: 'right',
        labels: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          },
          padding: 20,
          boxWidth: 20,
          generateLabels: () => {
            return stats.categoryDistribution.map((item, i) => ({
              text: `${item.category} (${item.count})`,
              fillStyle: chartColors.categories[i],
              strokeStyle: chartColors.categories[i],
              hidden: false,
              index: i,
              textColor: 'rgba(255, 255, 255, 0.9)',
              fontColor: 'rgba(255, 255, 255, 0.9)'
            }));
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        callbacks: {
          label: function(context) {
            const item = stats.categoryDistribution[context.dataIndex];
            return [
              `Total: ${formatCurrency(item.amount)}`,
              `Promedio: ${formatCurrency(item.average)}`,
              `Transacciones: ${item.count}`
            ];
          }
        }
      }
    }
  };

  if (isLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-xl text-text-secondary">Cargando estadísticas...</div>
        <div className="text-xl text-text-secondary">Cargando estadísticas...</div>
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Encabezado y Filtros */}
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
                Estadísticas Financieras
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-text-primary">Análisis detallado de tus finanzas</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <p className="text-text-secondary">
              {new Date().toLocaleDateString('es-ES', { 
                year: 'numeric',
                month: 'long'
              })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                  className="w-full p-2 rounded-xl bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300 shadow-inner text-text-primary"
                />
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                  className="w-full p-2 rounded-xl bg-secondary-bg border-none focus:ring-2 focus:ring-accent-color transition-all duration-300 shadow-inner text-text-primary"
                />
              </div>
            </div>
            <div className="h-8 w-[1px] bg-border-color/10"></div>
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
          </div>
        </div>
      </div>

      {/* Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-text-secondary mb-2">Balance Total</h3>
          <p className={`text-2xl font-bold ${stats.summary.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>
            {formatCurrency(stats.summary.balance)}
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Ingresos</span>
              <span className="amount-positive">
                +{formatCurrency(stats.summary.totalIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Gastos</span>
              <span className="amount-negative">
                -{formatCurrency(stats.summary.totalExpenses)}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-medium text-text-secondary mb-2">Promedios</h3>
          <div className="space-y-4">
            <div>
              <p className="text-text-secondary mb-1">Ingreso Promedio</p>
              <p className="text-xl font-bold amount-positive">
                {formatCurrency(stats.summary.averageIncome)}
              </p>
            </div>
            <div>
              <p className="text-text-secondary mb-1">Gasto Promedio</p>
              <p className="text-xl font-bold amount-negative">
                {formatCurrency(stats.summary.averageExpense)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-medium text-text-secondary mb-2">Actividad</h3>
          <p className="text-2xl font-bold text-text-primary mb-2">
            {stats.summary.transactionCount}
          </p>
          <p className="text-text-secondary">Transacciones totales</p>
          <div className="mt-4">
            <div className="w-full bg-secondary-bg rounded-full h-2">
              <div
                className="bg-accent-color h-2 rounded-full"
                style={{
                  width: `${(stats.summary.transactionCount / 100) * 100}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tendencias */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Tendencias de Ingresos y Gastos</h3>
          <div className="h-[300px]">
            {stats.trends && stats.trends.length > 0 ? (
              <Line data={trendData} options={trendOptions} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-text-secondary">No hay datos de tendencias disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Distribución por Categorías */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Distribución por Categorías</h3>
          <div className="h-[300px]">
            {stats.categoryDistribution && stats.categoryDistribution.length > 0 ? (
              <Doughnut
                data={categoryData}
                options={categoryOptions}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-text-secondary">No hay datos de categorías disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pronóstico Financiero */}
      <div className="grid grid-cols-1 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Pronóstico Financiero</h3>
          <div className="space-y-4">
            {/* Ingresos Proyectados */}
            <div className="bg-secondary-bg rounded-lg p-4 hover:bg-opacity-80 transition-all duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-text-primary font-medium">Ingresos Proyectados</p>
                  <p className="text-text-secondary text-sm mt-1">Proyección para el próximo mes</p>
                </div>
                <span className="amount-positive text-lg font-semibold">
                  {formatCurrency(stats.forecast?.projected_income || 0)}
                </span>
              </div>
              <div className="mt-3 w-full bg-card-bg rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-success-color transition-all duration-300"
                  style={{
                    width: `${(stats.forecast?.projected_income / (stats.forecast?.avg_monthly_income || 1)) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Ahorro Proyectado */}
            <div className="bg-secondary-bg rounded-lg p-4 hover:bg-opacity-80 transition-all duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-text-primary font-medium">Ahorro Proyectado</p>
                  <p className="text-text-secondary text-sm mt-1">Diferencia entre ingresos y gastos</p>
                </div>
                <span className={`${stats.forecast?.projected_savings >= 0 ? 'amount-positive' : 'amount-negative'} text-lg font-semibold`}>
                  {formatCurrency(stats.forecast?.projected_savings || 0)}
                </span>
              </div>
              <div className="mt-3 w-full bg-card-bg rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stats.forecast?.projected_savings >= 0 ? 'bg-success-color' : 'bg-danger-color'
                  }`}
                  style={{
                    width: `${(Math.abs(stats.forecast?.projected_savings) / (stats.forecast?.avg_monthly_income || 1)) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Promedios Mensuales */}
            <div className="bg-secondary-bg rounded-lg p-4 hover:bg-opacity-80 transition-all duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-text-primary font-medium">Promedio Mensual de Ingresos</p>
                  <p className="text-text-secondary text-sm mt-1">Promedio basado en datos históricos</p>
                </div>
                <span className="amount-positive text-lg font-semibold">
                  {formatCurrency(stats.forecast?.avg_monthly_income || 0)}
                </span>
              </div>
            </div>

            <div className="bg-secondary-bg rounded-lg p-4 hover:bg-opacity-80 transition-all duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-text-primary font-medium">Promedio Mensual de Gastos</p>
                  <p className="text-text-secondary text-sm mt-1">Promedio basado en datos históricos</p>
                </div>
                <span className="amount-negative text-lg font-semibold">
                  {formatCurrency(stats.forecast?.avg_monthly_expense || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
