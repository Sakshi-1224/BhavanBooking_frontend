// src/components/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Caught by Global Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong.</h2>
            <p className="text-gray-500 mb-6 text-sm">
              We're sorry, but an unexpected error occurred while loading this page.
            </p>

            
            {import.meta.env.DEV && (
              <div className="bg-red-50 text-red-800 text-left p-3 rounded-lg mb-6 overflow-auto text-xs font-mono max-h-32 border border-red-200">
                {this.state.error?.toString()}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold transition shadow-sm"
              >
                <RefreshCcw size={18} /> Refresh Page
              </button>
              
              <button 
                onClick={() => window.location.href = '/'} 
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-semibold transition"
              >
                <Home size={18} /> Return Home
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;