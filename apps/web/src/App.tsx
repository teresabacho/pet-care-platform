import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import ProfileEditPage from './pages/ProfileEditPage'
import PetsPage from './pages/PetsPage'
import AddPetPage from './pages/AddPetPage'
import PetDetailPage from './pages/PetDetailPage'
import SearchPage from './pages/SearchPage'
import BookingsPage from './pages/BookingsPage'
import CaretakerPage from './pages/CaretakerPage'
import CaretakerOnboardingPage from './pages/CaretakerOnboardingPage'
import CaretakerProfileDashboard from './pages/CaretakerProfileDashboard'
import CaretakerProfileEditPage from './pages/CaretakerProfileEditPage'
import ComingSoonPage from './pages/ComingSoonPage'
import MessagesPage from './pages/MessagesPage'
import BookingCreatePage from './pages/BookingCreatePage'
import BookingTrackingPage from './pages/BookingTrackingPage'
import StubCheckoutPage from './pages/StubCheckoutPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Wizard має власний WizardHeader — поза Layout, щоб не було двох хедерів */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/settings/caretaker-profile/onboarding"
            element={<CaretakerOnboardingPage />}
          />
        </Route>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/caretaker/:id" element={<CaretakerPage />} />
          <Route path="/favorites" element={<ComingSoonPage title="Уподобані виконавці" />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<MessagesPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<ProfileEditPage />} />
            <Route path="/pets" element={<PetsPage />} />
            <Route path="/pets/new" element={<AddPetPage />} />
            <Route path="/pets/:id" element={<PetDetailPage />} />
            <Route path="/pets/:id/edit" element={<AddPetPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/bookings/new" element={<BookingCreatePage />} />
            <Route path="/bookings/:id/tracking" element={<BookingTrackingPage />} />
            <Route path="/payments/stub-checkout" element={<StubCheckoutPage />} />
            <Route
              path="/settings/caretaker-profile"
              element={<CaretakerProfileDashboard />}
            />
            <Route
              path="/settings/caretaker-profile/edit"
              element={<CaretakerProfileEditPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
