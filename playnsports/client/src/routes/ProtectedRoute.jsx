import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  // role can be a single role string or an array of allowed roles
  if (role && (Array.isArray(role) ? !role.includes(user.role) : user.role !== role)) return <Navigate to="/" />;

  return children;
};

export default ProtectedRoute;