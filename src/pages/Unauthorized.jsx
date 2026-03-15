import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export default function Unauthorized() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.role);

  const handleGoBack = () => {
    // Route them back to their correct dashboard based on their role
    if (role === 'ADMIN') navigate('/admin/dashboard');
    else if (role === 'CLERK') navigate('/clerk/dashboard');
    else navigate('/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 text-center bg-white rounded-lg shadow-md max-w-md w-full border-t-4 border-yellow-500">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You do not have the necessary permissions to view this page.
        </p>
        <button 
          onClick={handleGoBack}
          className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
        >
          Return to My Dashboard
        </button>
      </div>
    </div>
  );
}