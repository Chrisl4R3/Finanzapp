import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import ScheduledTransactions from './components/ScheduledTransactions';
import Goals from './components/Goals';
import Statistics from './components/Statistics';
import Profile from './components/Profile';
import Layout from './components/Layout';
import './App.css';
import { CurrencyProvider } from './context/CurrencyContext';
import AuthProvider from './contexts/AuthProvider';
import useAuth from './hooks/useAuth';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CurrencyProvider>
          <div className="min-h-screen bg-background-color text-text-primary">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <RequireAuth>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RequireAuth>
              } />
              <Route path="/dashboard" element={
                <RequireAuth>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RequireAuth>
              } />
              <Route path="/transactions" element={
                <RequireAuth>
                  <Layout>
                    <Transactions />
                  </Layout>
                </RequireAuth>
              } />
              <Route path="/scheduled-transactions" element={
                <RequireAuth>
                  <Layout>
                    <ScheduledTransactions />
                  </Layout>
                </RequireAuth>
              } />
              <Route path="/goals" element={
                <RequireAuth>
                  <Layout>
                    <Goals />
                  </Layout>
                </RequireAuth>
              } />
              <Route path="/statistics" element={
                <RequireAuth>
                  <Layout>
                    <Statistics />
                  </Layout>
                </RequireAuth>
              } />
              <Route path="/profile" element={
                <RequireAuth>
                  <Layout>
                    <Profile />
                  </Layout>
                </RequireAuth>
              } />
            </Routes>
          </div>
        </CurrencyProvider>
      </AuthProvider>
    </Router>
  );
}

// Componente de protección de rutas
function RequireAuth({ children }) {
  const { isAuthenticated, initialCheckComplete } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!initialCheckComplete) {
        console.warn('La verificación de autenticación está tardando demasiado. Forzando estado.');
        setTimedOut(true);
      }
    }, 10000); // 10 segundos de timeout

    return () => clearTimeout(timer);
  }, [initialCheckComplete]);

  // Mostrar un indicador de carga mientras se verifica la autenticación
  if (!initialCheckComplete && !timedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-color">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-text-secondary">Verificando autenticación...</p>
      </div>
    );
  }

  // Redirigir al login si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default App;
