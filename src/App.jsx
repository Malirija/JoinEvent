import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import EventsPage from './pages/EventsPage.jsx'
import StatisticsPage from './pages/StatisticsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import { useAuth } from './context/useAuth.js'
import './App.css'

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="events" element={<EventsPage />} />
        <Route path="statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="login" element={(!loading && user) ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="register" element={(!loading && user) ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
