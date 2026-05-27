import { useState, useEffect } from 'react'
import { Moon, Sun, UserCircle, LogOut } from 'lucide-react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { StudentEntry } from './pages/StudentEntry'
import { TeacherDashboard } from './pages/TeacherDashboard'
import { LoginDocente } from './pages/LoginDocente'
import { ReporteView } from './pages/ReporteView'
import { PanelAdmin } from './pages/PanelAdmin'
import { GestionEstudiantes } from './pages/GestionEstudiantes'

function Layout({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isTeacherView = location.pathname.startsWith('/teacher')
  const isLoginView = location.pathname === '/login'
  const nombreDocente = localStorage.getItem('aula_nombre')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleSalir = () => {
    localStorage.removeItem('aula_token')
    localStorage.removeItem('aula_docente_id')
    localStorage.removeItem('aula_nombre')
    localStorage.removeItem('aula_es_admin')
    localStorage.removeItem('aula_email')
    navigate('/')
  }

  const esAdmin = localStorage.getItem('aula_es_admin') === 'true' || localStorage.getItem('aula_email') === 'miltonmoralesdiaz@gmail.com'

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Orbs de fondo decorativos */}
      <div aria-hidden className="pointer-events-none select-none">
        <div className="bg-orb w-[500px] h-[500px] -top-32 -left-20 bg-teal-300/20 dark:bg-teal-500/10" style={{position:'absolute',zIndex:0}} />
        <div className="bg-orb w-[400px] h-[400px] bottom-0 -right-20 bg-blue-300/20 dark:bg-blue-600/10" style={{position:'absolute',zIndex:0}} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 w-full px-6 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="AulaMaster Vision"
            className="w-10 h-10 object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-200"
          />
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white hidden sm:block">
            AulaMaster Vision
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-gray-400"
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {isTeacherView ? (
            <div className="flex items-center gap-3">
              {esAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="text-sm font-semibold text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
                >
                  Panel Admin
                </button>
              )}
              <button
                onClick={() => navigate('/teacher/estudiantes')}
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                Estudiantes
              </button>
              {nombreDocente && (
                <span className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300">
                  👋 {nombreDocente}
                </span>
              )}
              <button
                onClick={handleSalir}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          ) : !isLoginView ? (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 transition-colors px-4 py-2 rounded-xl shadow-lg shadow-teal-500/20"
            >
              <UserCircle size={18} />
              <span className="hidden sm:inline">Acceso Docente</span>
            </button>
          ) : null}
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<StudentEntry />} />
          <Route path="/login" element={<LoginDocente />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/reporte/:id" element={<ReporteView />} />
          <Route path="/teacher/estudiantes" element={<GestionEstudiantes />} />
          <Route path="/admin" element={<PanelAdmin />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
