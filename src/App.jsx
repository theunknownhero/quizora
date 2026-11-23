import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GamePlaceholder from './pages/GamePlaceholder.jsx'
import HungaryOrNot from './games/hungary/HungaryOrNot.jsx'
import AuthModal from './components/auth/AuthModal.jsx'
import { ResetPasswordPage, VerifyEmailPage } from './pages/AccountPages.jsx'
import { CategoriesPage, CategoryPage } from './pages/CategoryPages.jsx'
import Onboarding from './components/auth/Onboarding.jsx'
import Toaster from './components/Toaster.jsx'
import AgeCheck from './components/auth/AgeCheck.jsx'
import Profile from './pages/Profile.jsx'
import Friends from './pages/Friends.jsx'
import PlayTogether from './pages/PlayTogether.jsx'
import Room from './pages/Room.jsx'
import PublicProfile from './pages/PublicProfile.jsx'
import QuizListPage from './pages/QuizListPage.jsx'

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
      <Route path="/profile" element={<Profile />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/play-together" element={<PlayTogether />} />
      <Route path="/room/:code" element={<Room />} />
      <Route path="/u/:username" element={<PublicProfile />} />
      <Route path="/quizlist/:code" element={<QuizListPage />} />
      <Route path="/playlist/:code" element={<QuizListPage />} />
      <Route path="/play/:slug" element={<GamePlaceholder />} />
      <Route path="*" element={<Home />} />
    </Routes>
    <AuthModal />
    <Onboarding />
    <AgeCheck />
    <Toaster />
    </>
  )
}
