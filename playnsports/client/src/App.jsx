import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import TourOverlay from './components/tour/TourOverlay';
import TourWelcomeModal from './components/tour/TourWelcomeModal';
import { useAuth } from './context/AuthContext';
import { prefetchApp } from './utils/prefetch';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import OTPLogin from './pages/OTPLogin';
import ForgotPassword from './pages/ForgotPassword';
import SetupPassword from './pages/SetupPassword';
import MapSearch from './pages/MapSearch';
import GroundDetail from './pages/GroundDetail';
import PlayerDashboard from './pages/PlayerDashboard';
import GroundOwnerDashboard from './pages/GroundOwnerDashboard';
import ProfilePage from './pages/ProfilePage';
import GroupPage from './pages/GroupPage';
import ChatPage from './pages/ChatPage';
import ProtectedRoute from './routes/ProtectedRoute';
import GoogleSuccess from './pages/GoogleSuccess';
import CoachDashboard from './pages/CoachDashboard';
import GymOwnerDashboard from './pages/GymOwnerDashboard';
import PoolOwnerDashboard from './pages/PoolOwnerDashboard';
import VenuesPage from './pages/VenuesPage';
import VenueDetailPage from './pages/VenueDetailPage';
import CoachesPage from './pages/CoachesPage';
import CoachProfile from './pages/CoachProfile';
import AdminPanel from './pages/AdminPanel';
import AdminPoolManage from './pages/AdminPoolManage';
import EventsPage from './pages/EventsPage';
import EsportsPage from './pages/EsportsPage';
import EventDetailPage from './pages/EventDetailPage';
import SubEventDetailPage from './pages/SubEventDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import UserProfilePage from './pages/UserProfile/index';
import InfoPage from './pages/InfoPage';
import WhatsAppCTA from './components/WhatsAppCTA';
import {
  CareersPage,
  CollaboratePage,
  FAQPage,
  LpuVerificationPage,
} from './pages/GrowthPages';

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) prefetchApp(user);
  }, [loading, user]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
      <TourOverlay />
      <TourWelcomeModal />
      <WhatsAppCTA />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/otp-login" element={<OTPLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/setup-password" element={<ProtectedRoute><SetupPassword /></ProtectedRoute>} />
        <Route path="/auth/google/success" element={<GoogleSuccess />} />
        <Route path="/coaches" element={<ProtectedRoute><CoachesPage /></ProtectedRoute>} />
        <Route path="/coaches/:id" element={<CoachProfile />} />
        <Route path="/map" element={<ProtectedRoute><MapSearch /></ProtectedRoute>} />
        <Route path="/grounds/:id" element={<ProtectedRoute><GroundDetail /></ProtectedRoute>} />
        <Route path="/venues" element={<ProtectedRoute><VenuesPage /></ProtectedRoute>} />
        <Route path="/venues/:id" element={<ProtectedRoute><VenueDetailPage /></ProtectedRoute>} />
        <Route path="/player/dashboard" element={<ProtectedRoute role="player"><PlayerDashboard /></ProtectedRoute>} />
        <Route path="/owner/dashboard" element={<ProtectedRoute role="ground_owner"><GroundOwnerDashboard /></ProtectedRoute>} />
        <Route path="/coach/dashboard" element={<ProtectedRoute role="coach"><CoachDashboard /></ProtectedRoute>} />
        <Route path="/gym/dashboard" element={<ProtectedRoute role="gym_owner"><GymOwnerDashboard /></ProtectedRoute>} />
        <Route path="/pool/dashboard" element={<ProtectedRoute role="pool_owner"><PoolOwnerDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>} />
        <Route path="/admin/pools/:id" element={<ProtectedRoute role="admin"><AdminPoolManage /></ProtectedRoute>} />
        <Route path="/pool/manage/:id" element={<ProtectedRoute role={['pool_owner', 'admin']}><AdminPoolManage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/chat/:conversationId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
        <Route path="/esports/events" element={<ProtectedRoute><EsportsPage /></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
        <Route path="/events/:id/subevents/:subId" element={<ProtectedRoute><SubEventDetailPage /></ProtectedRoute>} />
        <Route path="/lpu-verification" element={<ProtectedRoute><LpuVerificationPage /></ProtectedRoute>} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/collaborate" element={<CollaboratePage />} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        {/* Public user profiles */}
        <Route path="/users/:id/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
        {/* Public info / legal page */}
        <Route path="/info" element={<InfoPage />} />
      </Routes>
    </>
  );
}

export default App;
