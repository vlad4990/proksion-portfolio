import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { RequireAuth } from '@/auth/RequireAuth'
import { Layout } from '@/components/Layout'
import { WorkRegistryProvider } from '@/content/work-registry'
import LoginPage from '@/pages/LoginPage'
import CategoriesPage from '@/pages/CategoriesPage'
import SubcategoriesPage from '@/pages/SubcategoriesPage'
import WorksPage from '@/pages/WorksPage'
import WorkDetailPage from '@/pages/WorkDetailPage'

/**
 * Защищённый layout-роут: один экземпляр RequireAuth + WorkRegistryProvider + Layout, под которым
 * рендерятся все контент-экраны (через <Outlet/>). Провайдер остаётся смонтированным при переходах
 * между экранами — реестр известных работ сохраняется в рамках сессии.
 */
function ProtectedLayout() {
  return (
    <RequireAuth>
      <WorkRegistryProvider>
        <Layout>
          <Outlet />
        </Layout>
      </WorkRegistryProvider>
    </RequireAuth>
  )
}

// Роуты админки под basename '/admin'. Публичный /login + дерево контента за guard'ом.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<CategoriesPage />} />
        <Route path="/categories/:catSlug" element={<SubcategoriesPage />} />
        <Route path="/categories/:catSlug/:subSlug" element={<WorksPage />} />
        <Route path="/categories/:catSlug/:subSlug/:workSlug" element={<WorkDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
