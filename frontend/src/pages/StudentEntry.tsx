import { useState } from 'react'
import { ArrowRight, Lock, User, GraduationCap, ChevronRight, CheckCircle2, Loader2, AlertCircle, BrainCircuit } from 'lucide-react'
import { BASE } from '../services/api'

// ── Tipos ──────────────────────────────────────────────────────
type TipoPregunta = 'abierta' | 'opcion_multiple' | 'escala'
interface Pregunta {
  id: number
  texto: string
  tipo: TipoPregunta
  opciones?: string[]
}
interface EvaluacionData {
  evaluacion_id: number
  titulo: string
  es_anonima: boolean
  preguntas: Pregunta[]
}

// ── Barra de progreso ─────────────────────────────────────────
function BarraProgreso({ respondidas, total }: { respondidas: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((respondidas / total) * 100)
  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between items-center text-xs font-medium">
        <span className="text-gray-500">{respondidas} de {total} preguntas respondidas</span>
        <span className={`font-bold ${pct === 100 ? 'text-teal-600' : 'text-gray-400'}`}>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Escala gamificada ─────────────────────────────────────────
function EscalaGamificada({ pregId, valor, onChange }: { pregId: number; valor: string; onChange: (v: string) => void }) {
  const [emojiVisible, setEmojiVisible] = useState('')

  const getEmoji = (n: number) => {
    if (n <= 3) return '😟'
    if (n <= 6) return '😐'
    if (n <= 8) return '😊'
    return '🌟'
  }

  const getColor = (n: number, selected: boolean) => {
    if (!selected) return 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-opacity-80 border border-gray-200 dark:border-slate-700'
    if (n <= 3) return 'bg-red-500 text-white shadow-lg shadow-red-500/30'
    if (n <= 6) return 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
    if (n <= 8) return 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
    return 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
  }

  const handleSelect = (n: number) => {
    onChange(String(n))
    const emoji = getEmoji(n)
    setEmojiVisible(emoji)
    setTimeout(() => setEmojiVisible(''), 1500)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n}
            onClick={() => handleSelect(n)}
            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all duration-200 ${getColor(n, valor === String(n))}`}>
            {n}
          </button>
        ))}
      </div>
      {emojiVisible && (
        <div className="text-center animate-bounce text-3xl py-1">
          {emojiVisible}
        </div>
      )}
      <div className="flex justify-between text-xs text-gray-400 px-1">
        <span>😟 Deficiente</span>
        <span>🌟 Excelente</span>
      </div>
    </div>
  )
}

// ── Vista principal del Estudiante ────────────────────────────
export function StudentEntry() {
  const [paso, setPaso] = useState<'codigo' | 'registro' | 'evaluacion' | 'gracias'>('codigo')
  const [accessCode, setAccessCode] = useState('')
  const [evaluacion, setEvaluacion] = useState<EvaluacionData | null>(null)
  const [nombre, setNombre] = useState('')
  const [grado, setGrado] = useState('')
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  // Calculado fuera del JSX para usarlo en múltiples lugares
  const respondidas = Object.values(respuestas).filter(v => v.trim() !== '').length

  // ── Paso 1: Verificar código con el backend ──────────────────
  const verificarCodigo = async () => {
    if (!accessCode.trim()) { setError('Ingresa un código de acceso.'); return }
    setCargando(true)
    setError('')
    try {
      const res = await fetch(`${BASE}/sesion/${accessCode.trim()}`)
      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || 'Código inválido o la sesión no está activa.')
        return
      }
      const data: EvaluacionData = await res.json()
      setEvaluacion(data)
      // Si es anónima saltamos el registro, vamos directo a la evaluación
      setPaso(data.es_anonima ? 'evaluacion' : 'registro')
    } catch {
      setError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  // ── Paso 2 (nominal): Continuar con nombre y grado ───────────
  const continuarConRegistro = () => {
    if (!nombre.trim()) { setError('Por favor ingresa tu nombre.'); return }
    if (!grado.trim()) { setError('Por favor ingresa tu grado.'); return }
    setError('')
    setPaso('evaluacion')
  }

  // ── Paso 3: Enviar respuestas al backend (Groq analiza) ──────
  const enviarRespuestas = async () => {
    if (!evaluacion) return
    const totalPreguntas = evaluacion.preguntas.length
    if (respondidas < totalPreguntas) {
      setError(`Por favor responde todas las preguntas (${respondidas}/${totalPreguntas} completadas).`)
      return
    }
    setCargando(true)
    setError('')
    try {
      const res = await fetch(`${BASE}/sesion/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_acceso: accessCode,
          datos_respuestas: respuestas,
          nombre_estudiante: evaluacion.es_anonima ? null : nombre,
          grado: evaluacion.es_anonima ? null : grado,
        })
      })
      if (!res.ok) { setError('Error al enviar respuestas. Intenta de nuevo.'); return }
      setPaso('gracias')
    } catch {
      setError('Error de conexión al enviar respuestas.')
    } finally {
      setCargando(false)
    }
  }

  const cambiarRespuesta = (pregId: number, valor: string) => {
    setRespuestas(prev => ({ ...prev, [String(pregId)]: valor }))
  }

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <main className="w-full min-h-[85vh] flex flex-col items-center justify-center p-4 md:p-6 relative z-10">

      {/* ── Paso 1: Ingresar código ── */}
      {paso === 'codigo' && (
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium"
              style={{ background: '#f0fdfa', borderColor: '#99f6e4', color: '#0d9488' }}>
              <Lock size={14} /> Sesión segura y privada
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              Tu voz{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-500">
                importa.
              </span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-light">
              Ingresa el código que tu docente compartió contigo.
            </p>
          </div>

          <div className="glass glass-card p-8 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Código de acceso
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={e => { setAccessCode(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={e => e.key === 'Enter' && verificarCodigo()}
                placeholder="Ej. AULA-ABC123"
                className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all text-xl font-bold tracking-[0.2em] text-center bg-white dark:bg-slate-900 dark:text-white"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm p-3 rounded-lg bg-red-50 border border-red-100">
                <AlertCircle size={16} className="shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={verificarCodigo}
              disabled={cargando}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0"
            >
              {cargando ? <><Loader2 size={18} className="animate-spin" /> Verificando...</> : <>Ingresar <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 2: Registro (solo nominal) ── */}
      {paso === 'registro' && evaluacion && (
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <User size={32} className="text-teal-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{evaluacion.titulo}</h2>
            <p className="text-gray-500 text-sm">Esta evaluación es nominal. Por favor identifícate.</p>
          </div>

          <div className="glass glass-card p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <User size={14} /> Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => { setNombre(e.target.value); setError('') }}
                placeholder="Tu nombre y apellido"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all bg-white dark:bg-slate-900 dark:text-white text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <GraduationCap size={14} /> Grado / Curso
              </label>
              <input
                type="text"
                value={grado}
                onChange={e => { setGrado(e.target.value); setError('') }}
                placeholder="Ej: 10°A, Grado 11, Semestre 2..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all bg-white dark:bg-slate-900 dark:text-white text-gray-900"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm p-3 rounded-lg bg-red-50 border border-red-100">
                <AlertCircle size={16} className="shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={continuarConRegistro}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            >
              Continuar a la evaluación <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 3: Evaluación ── */}
      {paso === 'evaluacion' && evaluacion && (
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{evaluacion.titulo}</h2>
            <p className="text-sm text-gray-500">
              {evaluacion.es_anonima ? '🔒 Evaluación anónima' : `👤 ${nombre} · ${grado}`}
              {' · '}{evaluacion.preguntas.length} preguntas
            </p>
          </div>

          {/* Barra de progreso */}
          <BarraProgreso respondidas={respondidas} total={evaluacion.preguntas.length} />

          <div className="space-y-4">
            {evaluacion.preguntas.map((p, idx) => (
              <div
                key={p.id}
                className="glass glass-card p-5 space-y-3 animate-fade-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <p className="font-semibold text-gray-800 dark:text-gray-100">
                  <span className="text-teal-500 mr-2">{idx + 1}.</span>{p.texto}
                </p>

                {/* Respuesta abierta */}
                {p.tipo === 'abierta' && (
                  <textarea
                    value={respuestas[String(p.id)] || ''}
                    onChange={e => cambiarRespuesta(p.id, e.target.value)}
                    placeholder="Escribe tu respuesta aquí..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none resize-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-sm"
                  />
                )}

                {/* Opción múltiple */}
                {p.tipo === 'opcion_multiple' && (
                  <div className="space-y-2">
                    {(p.opciones || []).map((op, i) => (
                      <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        respuestas[String(p.id)] === op
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-gray-200 dark:border-slate-700 hover:border-teal-300'
                      }`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                          respuestas[String(p.id)] === op ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                        }`} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{op}</span>
                        <input type="radio" className="sr-only" name={`q-${p.id}`} value={op}
                          onChange={() => cambiarRespuesta(p.id, op)} />
                      </label>
                    ))}
                  </div>
                )}

                {/* Escala 1-10 con gamificación */}
                {p.tipo === 'escala' && (
                  <EscalaGamificada
                    pregId={p.id}
                    valor={respuestas[String(p.id)] || ''}
                    onChange={(val) => cambiarRespuesta(p.id, val)}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {/* Botón sticky en móvil */}
          <div className="sticky bottom-4 pt-4">
            <button
              onClick={enviarRespuestas}
              disabled={cargando}
              className="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl font-semibold shadow-xl shadow-teal-500/30 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0">
              {cargando
                ? <><Loader2 size={18} className="animate-spin" /> Enviando y analizando con IA...</>
                : respondidas < (evaluacion?.preguntas.length || 0)
                  ? <><AlertCircle size={18} /> Faltan {(evaluacion?.preguntas.length || 0) - respondidas} preguntas</>
                  : <>Enviar mis respuestas <CheckCircle2 size={18} /></>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 4: Gracias con celebración ── */}
      {paso === 'gracias' && (
        <div className="w-full max-w-md text-center space-y-6">
          {/* Círculo animado con pulso */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute w-32 h-32 rounded-full bg-teal-200 dark:bg-teal-800 animate-ping opacity-30" />
            <div className="w-24 h-24 rounded-3xl bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center relative z-10 shadow-xl shadow-teal-500/20">
              <CheckCircle2 size={52} className="text-teal-500" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">¡Gracias! 🎉</h2>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Tus respuestas fueron recibidas exitosamente.<br />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                La IA ya está analizando tu participación.
              </span>
            </p>
          </div>

          {/* Tarjeta de confirmación */}
          <div className="p-5 rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 space-y-3">
            <div className="flex items-center gap-2 justify-center text-teal-700 dark:text-teal-400 font-semibold">
              <BrainCircuit size={18} />
              Groq IA procesó tu análisis semántico
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <p className="text-2xl">🎯</p>
                <p className="text-xs text-gray-500 mt-1">Análisis</p>
                <p className="text-xs font-bold text-teal-600">Completo</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <p className="text-2xl">🔒</p>
                <p className="text-xs text-gray-500 mt-1">Privacidad</p>
                <p className="text-xs font-bold text-teal-600">Garantizada</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <p className="text-2xl">⚡</p>
                <p className="text-xs text-gray-500 mt-1">Velocidad</p>
                <p className="text-xs font-bold text-teal-600">Instantáneo</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setPaso('codigo'); setAccessCode(''); setRespuestas({}); setNombre(''); setGrado('') }}
            className="text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline text-sm font-medium transition-colors">
            Participar en otra evaluación →
          </button>
        </div>
      )}
    </main>
  )
}
