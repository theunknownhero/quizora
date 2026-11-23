import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GamePlaceholder from './pages/GamePlaceholder.jsx'
import HungaryOrNot from './games/hungary/HungaryOrNot.jsx'
import AuthModal from './components/auth/AuthModal.jsx'
import { ResetPasswordPage, VerifyEmailPage } from './pages/AccountPages.jsx'
import { CategoriesPage, CategoryPage } from './pages/CategoryPages.jsx'
import Onboarding from './components/auth/Onboarding.jsx'

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play/hungary-or-not" element={<HungaryOrNot />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/category/:id" element={<CategoryPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/play/:slug" element={<GamePlaceholder />} />
      <Route path="*" element={<Home />} />
    </Routes>
    <AuthModal />
    <Onboarding />
    </>
  )
}
