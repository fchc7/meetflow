import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/routes'
import { LoginPage } from '@/pages/login'
import { RegisterPage } from '@/pages/register'
import { MeetingListPage } from '@/pages/meeting-list'
import { MeetingDetailPage } from '@/pages/meeting-detail'
import { CreateMeetingPage } from '@/pages/create-meeting'
import { RoomListPage } from '@/pages/room-list'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MeetingListPage />} />
              <Route path="/meetings/new" element={<CreateMeetingPage />} />
              <Route path="/meetings/:id" element={<MeetingDetailPage />} />
              <Route path="/rooms" element={<RoomListPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
