import React, { useState, useEffect, useMemo } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { 
  FiDollarSign, 
  FiPlusCircle, 
  FiAlertCircle, 
  FiLoader, 
  FiSearch,
  FiFilter,
  FiArrowUp,
  FiArrowDown,
  FiCalendar,
  FiTrendingUp,
  FiTrendingDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiPlus
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { authenticatedFetch } from '../auth/auth';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import TransactionForm from './TransactionForm';
