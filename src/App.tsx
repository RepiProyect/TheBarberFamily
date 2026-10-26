import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import Home from './pages/Home'
import Reservar from './pages/Reservar'
import Login from './pages/panel/Login'
import PanelLayout from './pages/panel/PanelLayout'
import Agenda from './pages/panel/Agenda'
import Clientes from './pages/panel/Clientes'
import Ajustes from './pages/panel/Ajustes'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/panel/login" element={<Login />} />
          <Route
            path="/panel"
            element={
              <ProtectedRoute>
                <PanelLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Agenda />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
