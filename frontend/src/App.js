import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext';
import ErrorBoundary     from './components/ErrorBoundary';
import PrivateRoute      from './components/PrivateRoute';
import Login             from './components/Auth/Login';
import Register          from './components/Auth/Register';
import Dashboard         from './components/Dashboard/Dashboard';
import EditorPage        from './pages/EditorPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"           element={<Navigate to="/dashboard" replace />} />
            <Route path="/login"      element={<Login />} />
            <Route path="/register"   element={<Register />} />
            <Route path="/dashboard"  element={
              <PrivateRoute>
                <ErrorBoundary><Dashboard /></ErrorBoundary>
              </PrivateRoute>
            } />
            <Route path="/editor/:id" element={
              <PrivateRoute>
                <ErrorBoundary><EditorPage /></ErrorBoundary>
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}