import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Loading from './components/common/Loading.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import { useAuth } from './context/useAuth.js'
import './App.css'

const AppLayout = lazy(() => import('./components/layout/AppLayout.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const EventsPage = lazy(() => import('./pages/EventsPage.jsx'))
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage.jsx'))
const CreateEventPage = lazy(() => import('./pages/CreateEventPage.jsx'))
const EditEventPage = lazy(() => import('./pages/EditEventPage.jsx'))
const StatisticsPage = lazy(() => import('./pages/StatisticsPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'))

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Suspense fallback={<Loading label="Loading JoinEvent..." />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/new" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
          <Route path="events/:id/edit" element={<ProtectedRoute><EditEventPage /></ProtectedRoute>} />
          <Route path="events/:id" element={<EventDetailsPage />} />
          <Route path="statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="my-events" element={<ProtectedRoute><ProfilePage view="events" /></ProtectedRoute>} />
          <Route path="my-registrations" element={<ProtectedRoute><ProfilePage view="registrations" /></ProtectedRoute>} />
          <Route path="login" element={(!loading && user) ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="register" element={(!loading && user) ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
