import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import { api } from '../services/api'

type Modo = 'login' | 'registro'

export function LoginDocente() {
  const navigate = useNavigate()
  const [modo, setModo] = useState<Modo>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError('Completa todos los campos.'); return }
    if (modo === 'registro' && !nombre.trim()) { setError('Ingresa tu nombre.'); return }
    setCargando(true)
    setError('')
    try {
      const data = modo === 'login'
        ? await api.login(email.trim(), password)
        : await api.registro(nombre.trim(), email.trim(), password)
      localStorage.setItem('aula_token', data.token)
      localStorage.setItem('aula_docente_id', String(data.docente_id))
      localStorage.setItem('aula_nombre', data.nombre)
      localStorage.setItem('aula_es_admin', String(data.es_admin || false))
      localStorage.setItem('aula_email', email.trim())
      navigate('/teacher')
    } catch (e: any) {
      setError(e.message || 'Error al iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <main className="w-full min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center">
            <BookOpen size={32} className="text-teal-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {modo === 'login' ? 'Acceso Docente' : 'Crear Cuenta'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {modo === 'login' ? 'Gestiona tus evaluaciones y encuestas.' : 'Únete a AulaMaster Vision.'}
          </p>
        </div>

        <div className="glass glass-card p-8 space-y-5" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
          {modo === 'registro' && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <User size={14} /> Nombre completo
              </label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre" autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-gray-900" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Mail size={14} /> Email
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" autoFocus={modo === 'login'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-gray-900" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Lock size={14} /> Contraseña
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-gray-900" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={cargando}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60">
            {cargando
              ? <><Loader2 size={18} className="animate-spin" /> Procesando...</>
              : <>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} <ArrowRight size={18} /></>
            }
          </button>

          <p className="text-center text-sm text-gray-500">
            {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError('') }}
              className="text-teal-600 font-semibold hover:underline">
              {modo === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
