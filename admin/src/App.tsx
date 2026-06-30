import { Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/auth/RequireAuth'
import { Layout } from '@/components/Layout'
import DashboardPage from '@/pages/DashboardPage'
import LoginPage from '@/pages/LoginPage'

// Роуты админки под base/basename '/admin/'. Публичный /login + защищённый dashboard за guard'ом.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <DashboardPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
