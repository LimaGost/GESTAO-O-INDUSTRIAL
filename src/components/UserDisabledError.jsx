import React from 'react';
import { useAuth } from '@/lib/AuthContext';

const UserDisabledError = ({ reason }) => {
  const { logout } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-100">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Conta Desativada</h1>
          <p className="text-slate-600 mb-2">
            Sua conta foi desativada pelo administrador e você não tem mais acesso ao sistema.
          </p>
          {reason && (
            <p className="text-sm text-slate-500 italic mb-6">"{reason}"</p>
          )}
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600 mb-6">
            Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
          </div>
          <button
            onClick={() => logout(true)}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDisabledError;
