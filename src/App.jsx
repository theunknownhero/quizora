import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import GamePage from './pages/GamePage.jsx'
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
import Leaderboards from './pages/Leaderboards.jsx'
import Tournaments from './pages/Tournaments.jsx'
import TournamentPage from './pages/TournamentPage.jsx'
import PublicProfile from './pages/PublicProfile.jsx'
import QuizListPage from './pages/QuizListPage.jsx'
import { AnnouncementBar, FeatureGate, MaintenanceScreen } from './components/SiteChrome.jsx'
import { useApp } from './state/AppState.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// The admin panel is only downloaded by staff who open it
const Admin = lazy(() => import('./admin/Admin.jsx'))

export default function App() {
  const { site, staff, authReady } = useApp()
  const { pathname } = useLocation()
  const maintenance = site.maintenance?.enabled && !staff && authReady && !pathname.startsWith('/admin')

  return (
    <>
      {maintenance ? (
        <MaintenanceScreen />
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play/hungary-or-not" element={<HungaryOrNot />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:id" element={<CategoryPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/friends" element={<FeatureGate name="friends" label="Friends"><Friends /></FeatureGate>} />
          <Route path="/play-together" element={<FeatureGate name="multiplayer" label="Multiplayer"><PlayTogether /></FeatureGate>} />
          <Route path="/room/:code" element={<FeatureGate name="multiplayer" label="Multiplayer"><Room /></FeatureGate>} />
          <Route path="/leaderboards" element={<FeatureGate name="leaderboards" label="Leaderboards"><Leaderboards /></FeatureGate>} />
          <Route path="/tournaments" element={<FeatureGate name="tournaments" label="Tournaments"><Tournaments /></FeatureGate>} />
          <Route path="/tournament/:code" element={<FeatureGate name="tournaments" label="Tournaments"><TournamentPage /></FeatureGate>} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/quizlist/:code" element={<QuizListPage />} />
          <Route path="/playlist/:code" element={<QuizListPage />} />
          <Route path="/play/:slug" element={<GamePage />} />
          <Route
            path="/admin/*"
            element={
              <ErrorBoundary label="The admin panel">
                <Suspense fallback={<div className="admin-loading">Loading admin…</div>}>
                  <Admin />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route path="*" element={<Home />} />
        </Routes>
      )}
      {!pathname.startsWith('/admin') && <AnnouncementBar />}
      <AuthModal />
      <Onboarding />
      <AgeCheck />
      <Toaster />
    </>
  )
}
