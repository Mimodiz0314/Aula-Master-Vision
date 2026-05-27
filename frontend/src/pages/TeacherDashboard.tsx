import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Plus, Users, BrainCircuit, FileText, X, Trash2, Sparkles,
  ToggleLeft, ToggleRight, Copy, Check, Download,
  Eye, PlayCircle, StopCircle, Loader2
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api, getDocenteId } from '../services/api'

type TipoPregunta = 'abierta' | 'opcion_multiple' | 'escala'
interface Pregunta {
  id: number
  texto: string
  tipo: TipoPregunta
  opciones?: string[]
}
interface Evaluacion {
  id: number
  titulo: string
  codigo_acceso: string
  activa: boolean
  es_anonima: boolean
}
interface Stats {
  total_evaluaciones: number
  activas: number
  completadas: number
  total_respuestas: number
}

// ── Hook WebSocket tiempo real ──────────────────────────────────
function useConectados(evaluacionId: number | null): number {
  const [count, setCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  useEffect(() => {
    if (!evaluacionId) return
    const ws = new WebSocket(`ws://localhost:8000/api/ws/sesion/${evaluacionId}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try { setCount(JSON.parse(e.data).conectados || 0) } catch {}
    }
    return () => { ws.close(); wsRef.current = null }
  }, [evaluacionId])
  return count
}

// ── Modal: Selector de Plantillas ──────────────────────────────
function ModalPlantillas({ onSelect, onClose }: { onSelect: (preguntas: Pregunta[]) => void; onClose: () => void }) {
  const [plantillas, setPlantillas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.getPlantillas()
      .then(setPlantillas)
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const seleccionar = async (id: string) => {
    try {
      const p = await api.getPlantilla(id)
      onSelect(p.preguntas || [])
      onClose()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Usar Plantilla</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {cargando ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-teal-500" size={28} /></div>
          ) : plantillas.map(p => (
            <button key={p.id} onClick={() => seleccionar(p.id)}
              className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-teal-300 hover:bg-teal-50 transition-all group">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.icono}</span>
                <div>
                  <p className="font-semibold text-gray-800 group-hover:text-teal-700">{p.nombre}</p>
                  <p className="text-xs text-gray-500">{p.descripcion} · {p.total_preguntas} preguntas</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Modal: Nueva / Editar Evaluación ───────────────────────────
function ModalEvaluacion({
  evaluacionEditar, onClose, onGuardada, docenteId
}: {
  evaluacionEditar?: Evaluacion | null
  onClose: () => void
  onGuardada: () => void
  docenteId: number
}) {
  const [titulo, setTitulo] = useState(evaluacionEditar?.titulo || '')
  const [descripcion, setDescripcion] = useState('')
  const [esAnonima, setEsAnonima] = useState(evaluacionEditar?.es_anonima ?? true)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([{ id: 1, texto: '', tipo: 'abierta' }])
  const [tema, setTema] = useState('')
  const [cantidadIA, setCantidadIA] = useState(5)
  const [cargandoIA, setCargandoIA] = useState(false)
  const [textoBatch, setTextoBatch] = useState('')
  const [batchAbierto, setBatchAbierto] = useState(false)
  const [batchResultado, setBatchResultado] = useState<string | null>(null)
  const [codigoGenerado, setCodigoGenerado] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [paso, setPaso] = useState<'form' | 'exito'>('form')
  const [mostrarPlantillas, setMostrarPlantillas] = useState(false)
  const esEdicion = !!evaluacionEditar

  const agregarPregunta = () => setPreguntas(prev => [...prev, { id: Date.now(), texto: '', tipo: 'abierta' }])
  const eliminarPregunta = (id: number) => setPreguntas(prev => prev.filter(p => p.id !== id))
  const cambiarTipo = (id: number, tipo: TipoPregunta) =>
    setPreguntas(prev => prev.map(p => p.id === id ? { ...p, tipo, opciones: tipo === 'opcion_multiple' ? ['', ''] : undefined } : p))
  const cambiarTexto = (id: number, texto: string) =>
    setPreguntas(prev => prev.map(p => p.id === id ? { ...p, texto } : p))
  const cambiarOpcion = (pregId: number, opIdx: number, valor: string) =>
    setPreguntas(prev => prev.map(p => {
      if (p.id !== pregId) return p
      const opciones = [...(p.opciones || [])]
      opciones[opIdx] = valor
      return { ...p, opciones }
    }))
  const agregarOpcion = (pregId: number) =>
    setPreguntas(prev => prev.map(p => p.id === pregId ? { ...p, opciones: [...(p.opciones || []), ''] } : p))

  const sugerirConIA = async () => {
    if (!tema.trim()) return
    setCargandoIA(true)
    try {
      const data = await api.sugerirPreguntas(tema, 'bachillerato', cantidadIA)
      const sugerencias: Pregunta[] = data.preguntas_sugeridas.map((texto, i) => ({
        id: Date.now() + i, texto, tipo: 'abierta' as TipoPregunta
      }))
      setPreguntas(prev => [...prev.filter(p => p.texto.trim() !== ''), ...sugerencias])
    } catch { alert('No se pudo conectar con el servidor de IA.') }
    finally { setCargandoIA(false) }
  }

  const importarLotes = () => {
    if (!textoBatch.trim()) return
    // Limpia cada línea y elimina prefijos de numeración o viñetas:
    // Soporta: "1. Pregunta", "1) Pregunta", "- Pregunta", "• Pregunta", línea simple
    const lineas = textoBatch
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => l.replace(/^(\d+[\.\)\-]|\-|\•|\*)\s*/, '').trim())
      .filter(l => l.length > 0)

    if (lineas.length === 0) return

    const nuevas: Pregunta[] = lineas.map((texto, i) => ({
      id: Date.now() + i,
      texto,
      tipo: 'abierta' as TipoPregunta,
    }))

    // Conserva las preguntas que ya tienen texto escrito y agrega las nuevas
    setPreguntas(prev => {
      const existentes = prev.filter(p => p.texto.trim() !== '')
      return [...existentes, ...nuevas]
    })

    setBatchResultado(`✅ ${lineas.length} preguntas agregadas correctamente.`)
    setTextoBatch('')
    setTimeout(() => setBatchResultado(null), 3000)
  }

  const guardar = async () => {
    if (!titulo.trim()) { alert('El título es obligatorio.'); return }
    if (!preguntas.length || preguntas.every(p => !p.texto.trim())) { alert('Agrega al menos una pregunta.'); return }
    setGuardando(true)
    try {
      const body = {
        titulo, descripcion, es_anonima: esAnonima,
        preguntas: preguntas.filter(p => p.texto.trim()),
        docente_id: docenteId
      }
      if (esEdicion && evaluacionEditar) {
        await api.editarEvaluacion(evaluacionEditar.id, body)
        onGuardada()
        onClose()
      } else {
        const data = await api.crearEvaluacion(body)
        setCodigoGenerado(data.codigo_acceso)
        setPaso('exito')
        onGuardada()
      }
    } catch (e: any) {
      alert(`Error: ${e.message || 'Fallo en el servidor'}`)
    } finally { setGuardando(false) }
  }

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoGenerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50">
                <FileText className="text-teal-500" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {paso === 'form' ? (esEdicion ? 'Editar Evaluación' : 'Nueva Evaluación') : '¡Evaluación Creada! 🎉'}
                </h2>
                <p className="text-sm text-gray-500">
                  {paso === 'form' ? 'Completa los datos y agrega tus preguntas' : 'Comparte el código con tus estudiantes'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-6">
            {paso === 'form' && (
              <>
                {!esEdicion && (
                  <button onClick={() => setMostrarPlantillas(true)}
                    className="w-full py-2.5 border-2 border-dashed border-teal-300 rounded-xl text-sm font-medium text-teal-600 hover:bg-teal-50 transition-all flex items-center justify-center gap-2">
                    <FileText size={16} /> Usar plantilla prediseñada
                  </button>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Título *</label>
                  <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
                    placeholder="Ej: Evaluación Unidad 3 – Matemáticas"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-gray-900" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Descripción (opcional)</label>
                  <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                    placeholder="Describe el propósito..." rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none resize-none text-gray-900" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-800">Evaluación anónima</p>
                    <p className="text-sm text-gray-500">{esAnonima ? 'Sin nombre ni grado.' : 'Con identificación del estudiante.'}</p>
                  </div>
                  <button onClick={() => setEsAnonima(!esAnonima)} className="transition-transform hover:scale-110">
                    {esAnonima ? <ToggleRight size={40} className="text-teal-500" /> : <ToggleLeft size={40} className="text-gray-400" />}
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-teal-300 bg-teal-50 space-y-3">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
                    <Sparkles size={16} /> Sugerir preguntas con IA (Groq)
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tema} onChange={e => setTema(e.target.value)}
                      placeholder="Ej: Fotosíntesis, Revolución Francesa..."
                      className="flex-1 px-3 py-2.5 rounded-lg border border-teal-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm text-gray-900" />
                    <input
                      type="number"
                      min={1}
                      value={cantidadIA}
                      onChange={e => setCantidadIA(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-2.5 rounded-lg border border-teal-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none text-sm text-center font-bold text-teal-700"
                      title="Cantidad de preguntas"
                    />
                    <button onClick={sugerirConIA} disabled={cargandoIA || !tema.trim()}
                      className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                      {cargandoIA
                        ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
                        : <><Sparkles size={14} /> Generar</>}
                    </button>
                  </div>
                </div>

                {/* ── Importar por lotes ── */}
                <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50 overflow-hidden">
                  <button
                    onClick={() => { setBatchAbierto(!batchAbierto); setBatchResultado(null) }}
                    className="w-full flex items-center justify-between px-4 py-3 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>
                      Pegar preguntas en lote
                    </div>
                    <span className="text-blue-400 text-xs">{batchAbierto ? '▲ Cerrar' : '▼ Abrir'}</span>
                  </button>

                  {batchAbierto && (
                    <div className="px-4 pb-4 space-y-3">
                      <p className="text-xs text-blue-600 leading-relaxed">
                        Pega tus preguntas — <strong>una por línea</strong>. Acepta numeradas (<code className="bg-blue-100 px-1 rounded">1.</code> <code className="bg-blue-100 px-1 rounded">1)</code>), con guión (<code className="bg-blue-100 px-1 rounded">-</code>) o sin prefijo.
                      </p>
                      <textarea
                        value={textoBatch}
                        onChange={e => setTextoBatch(e.target.value)}
                        placeholder={`1. ¿Cuál es el principal concepto de esta unidad?\n2. ¿Qué dificultades encontraste?\n3. ¿Cómo aplicarías esto en tu vida?\n...`}
                        rows={7}
                        className="w-full px-3 py-2.5 rounded-lg border border-blue-200 bg-white focus:ring-2 focus:ring-blue-400 outline-none text-sm text-gray-800 resize-y font-mono leading-relaxed"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={importarLotes}
                          disabled={!textoBatch.trim()}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Agregar todas al cuestionario
                        </button>
                        {textoBatch.trim() && (
                          <span className="text-xs text-blue-500 whitespace-nowrap">
                            {textoBatch.split('\n').filter(l => l.trim()).length} preguntas detectadas
                          </span>
                        )}
                      </div>
                      {batchResultado && (
                        <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          {batchResultado}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">Preguntas ({preguntas.length})</h3>
                    <button onClick={agregarPregunta} className="text-sm flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium">
                      <Plus size={16} /> Agregar
                    </button>
                  </div>
                  {preguntas.map((p, idx) => (
                    <div key={p.id} className="p-4 rounded-xl border border-gray-100 bg-white space-y-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="mt-2.5 text-xs font-bold text-gray-400 min-w-[20px]">{idx + 1}.</span>
                        <input type="text" value={p.texto} onChange={e => cambiarTexto(p.id, e.target.value)}
                          placeholder="Escribe tu pregunta..."
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm text-gray-900" />
                        <button onClick={() => eliminarPregunta(p.id)} className="mt-1.5 text-gray-400 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex gap-2 pl-7">
                        {(['abierta', 'opcion_multiple', 'escala'] as TipoPregunta[]).map(tipo => (
                          <button key={tipo} onClick={() => cambiarTipo(p.id, tipo)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${p.tipo === tipo ? 'bg-teal-500 text-white border-teal-500' : 'border-gray-200 text-gray-500 hover:border-teal-300'}`}>
                            {tipo === 'abierta' ? '✍️ Abierta' : tipo === 'opcion_multiple' ? '☑️ Múltiple' : '⭐ Escala'}
                          </button>
                        ))}
                      </div>
                      {p.tipo === 'opcion_multiple' && (
                        <div className="pl-7 space-y-2">
                          {(p.opciones || []).map((op, opIdx) => (
                            <input key={opIdx} type="text" value={op}
                              onChange={e => cambiarOpcion(p.id, opIdx, e.target.value)}
                              placeholder={`Opción ${opIdx + 1}`}
                              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-1 focus:ring-teal-400 outline-none text-sm text-gray-700" />
                          ))}
                          <button onClick={() => agregarOpcion(p.id)} className="text-xs text-teal-600 hover:underline">+ Agregar opción</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={guardar} disabled={guardando}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60">
                  {guardando ? <><Loader2 size={18} className="animate-spin" /> Guardando...</> : <><FileText size={18} /> {esEdicion ? 'Guardar cambios' : 'Crear Evaluación'}</>}
                </button>
              </>
            )}

            {paso === 'exito' && (
              <div className="flex flex-col items-center text-center space-y-6 py-4">
                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center">
                  <Check size={40} className="text-teal-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Evaluación creada!</h3>
                  <p className="text-gray-500">Comparte el código con tus estudiantes.</p>
                </div>
                <div className="w-full p-5 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-teal-600">Código de acceso</p>
                  <p className="text-4xl font-black tracking-[0.3em] text-teal-700">{codigoGenerado}</p>
                  <button onClick={copiarCodigo}
                    className="flex items-center gap-2 mx-auto px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium">
                    {copiado ? <><Check size={14} /> ¡Copiado!</> : <><Copy size={14} /> Copiar</>}
                  </button>
                </div>
                <button onClick={onClose}
                  className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium">
                  Volver al panel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mostrarPlantillas && (
        <ModalPlantillas onSelect={(preg) => setPreguntas(preg)} onClose={() => setMostrarPlantillas(false)} />
      )}
    </>
  )
}

// ── Fila de Evaluación con acciones ────────────────────────────
function EvalRow({
  ev, onRefresh, docenteId, navigate
}: {
  ev: Evaluacion
  onRefresh: () => void
  docenteId: number
  navigate: (path: string) => void
}) {
  const [accionando, setAccionando] = useState(false)
  const conectados = useConectados(ev.activa ? ev.id : null)

  const toggle = async () => {
    setAccionando(true)
    try {
      if (ev.activa) await api.desactivarEvaluacion(ev.id)
      else await api.activarEvaluacion(ev.id)
      onRefresh()
    } catch (e: any) { alert(e.message) }
    finally { setAccionando(false) }
  }

  const clonar = async () => {
    if (!confirm(`¿Clonar "${ev.titulo}"?`)) return
    setAccionando(true)
    try { await api.clonarEvaluacion(ev.id, docenteId); onRefresh() }
    catch (e: any) { alert(e.message) }
    finally { setAccionando(false) }
  }

  const eliminar = async () => {
    if (!confirm(`¿Eliminar "${ev.titulo}"? Esta acción no se puede deshacer.`)) return
    setAccionando(true)
    try { await api.eliminarEvaluacion(ev.id); onRefresh() }
    catch (e: any) { alert(e.message) }
    finally { setAccionando(false) }
  }

  return (
    <div className="flex flex-col gap-2 py-1">
      {/* Título y meta */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{ev.titulo}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {ev.es_anonima ? '🔒 Anónima' : '👤 Nominal'} · {ev.codigo_acceso}
            {ev.activa && conectados > 0 && (
              <span className="ml-2 text-teal-600 font-medium animate-pulse">· {conectados} conectados</span>
            )}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${ev.activa ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'bg-gray-100 text-gray-500'}`}>
          {ev.activa ? '🟢 Activa' : '⚪ Inactiva'}
        </span>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Botón principal: Ver resultados */}
        <button onClick={() => navigate(`/teacher/reporte/${ev.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-semibold transition-all shadow-sm">
          <BarChart3 size={13} /> Ver resultados y análisis IA
        </button>

        {/* Activar / Desactivar */}
        <button onClick={toggle} disabled={accionando}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${ev.activa ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-teal-200 text-teal-600 hover:bg-teal-50'}`}>
          {ev.activa ? <><StopCircle size={13} /> Cerrar sesión</> : <><PlayCircle size={13} /> Activar</>}
        </button>

        {/* Acciones secundarias */}
        <div className="flex items-center gap-1 ml-auto">
          <a href={api.exportExcel(ev.id)} download title="Exportar CSV"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors inline-flex">
            <Download size={14} />
          </a>
          <button onClick={clonar} disabled={accionando} title="Clonar"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 transition-colors">
            <Copy size={14} />
          </button>
          <button onClick={eliminar} disabled={accionando} title="Eliminar"
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Principal ────────────────────────────────────────
export function TeacherDashboard() {
  const navigate = useNavigate()
  const docenteId = getDocenteId()
  const nombre = localStorage.getItem('aula_nombre') || 'Docente'

  const [modalAbierto, setModalAbierto] = useState(false)
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [stats, setStats] = useState<Stats>({ total_evaluaciones: 0, activas: 0, completadas: 0, total_respuestas: 0 })
  const [chartData, setChartData] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    try {
      const [evals, st] = await Promise.all([
        api.getEvaluaciones(docenteId),
        api.getStats(docenteId),
      ])
      const evReversed = [...evals].reverse()
      setEvaluaciones(evReversed)
      setStats(st)
      setChartData(evReversed.slice(0, 6).map((e: Evaluacion) => ({
        name: e.titulo.length > 18 ? e.titulo.slice(0, 18) + '…' : e.titulo,
        id: e.id,
        activa: e.activa ? 1 : 0,
      })))
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }, [docenteId])

  useEffect(() => { cargar() }, [cargar])

  const statCards = [
    { title: 'Total Evaluaciones', value: stats.total_evaluaciones, color: '#3b82f6', icon: <FileText className="text-blue-500" size={20} />, trend: 'Creadas' },
    { title: 'Activas Ahora',      value: stats.activas,            color: '#14b8a6', icon: <PlayCircle className="text-teal-500" size={20} />, trend: 'En sesión' },
    { title: 'Completadas',        value: stats.completadas,        color: '#22c55e', icon: <Check className="text-green-500" size={20} />, trend: 'Cerradas' },
    { title: 'Total Respuestas',   value: stats.total_respuestas,   color: '#a855f7', icon: <Users className="text-purple-500" size={20} />, trend: 'Acumuladas' },
  ]

  return (
    <main className="w-full min-h-screen p-6 md:p-10 relative z-10">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Panel de Control</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Bienvenido, <span className="font-semibold text-teal-600">{nombre}</span> — Gestión inteligente de evaluaciones.
          </p>
        </div>
        <button onClick={() => setModalAbierto(true)}
          className="py-2.5 px-5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold shadow-lg flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0">
          <Plus size={20} /> Nueva Evaluación
        </button>
      </header>

      {/* Stats reales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {statCards.map(s => (
          <div key={s.title} className="glass glass-card p-5 flex flex-col justify-between h-32 hover:-translate-y-1 transition-all duration-200"
            style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">{s.title}</span>
              <div className="p-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg">{s.icon}</div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{cargando ? '—' : s.value}</h3>
              <span className="text-xs text-gray-400">{s.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de evaluaciones */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Evaluaciones</h2>
          <div className="glass glass-card p-4 sm:p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.6)' }}>
            {cargando ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-teal-500" size={28} /></div>
            ) : evaluaciones.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <FileText size={36} className="mx-auto text-gray-200" />
                <p className="text-gray-400 text-sm">Aún no tienes evaluaciones.</p>
                <button onClick={() => setModalAbierto(true)} className="text-teal-600 text-sm font-medium hover:underline">
                  Crear la primera →
                </button>
              </div>
            ) : (
              evaluaciones.map((ev, idx) => (
                <div key={ev.id}>
                  {idx > 0 && <div className="border-t border-gray-100 dark:border-slate-800 my-3" />}
                  <EvalRow ev={ev} onRefresh={cargar} docenteId={docenteId} navigate={navigate} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Gráfica */}
          {chartData.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                <BarChart3 className="inline mr-2 text-teal-500" size={20} />
                Evaluaciones
              </h2>
              <div className="glass glass-card p-4" style={{ background: 'rgba(255,255,255,0.6)' }}>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, 'ID']} />
                    <Bar dataKey="id" fill="#14b8a6" radius={[4, 4, 0, 0]} name="ID" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-center text-gray-400 mt-1">Últimas evaluaciones (ID)</p>
              </div>
            </div>
          )}

          {/* Insights IA */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Análisis IA</h2>
            <div className="glass glass-card p-5 space-y-3" style={{ borderLeft: '4px solid #14b8a6', background: 'rgba(255,255,255,0.7)' }}>
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <BrainCircuit size={20} />
                <h3 className="font-semibold text-sm">Reportes disponibles</h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Haz clic en <strong>👁️</strong> en cualquier evaluación para generar el análisis profundo con DeepSeek.
              </p>
              <div className="text-xs text-gray-500 space-y-1.5">
                <div className="flex items-center gap-2">📊 <span>Gráficas de promedios por pregunta</span></div>
                <div className="flex items-center gap-2">🧠 <span>Análisis semántico con Groq</span></div>
                <div className="flex items-center gap-2">📋 <span>Plan de acción pedagógico (DeepSeek)</span></div>
                <div className="flex items-center gap-2">📥 <span>Exportación CSV incluida</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <ModalEvaluacion
          onClose={() => setModalAbierto(false)}
          onGuardada={cargar}
          docenteId={docenteId}
        />
      )}
    </main>
  )
}
