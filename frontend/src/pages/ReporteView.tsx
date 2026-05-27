import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BrainCircuit, Users, BarChart3, Download, Loader2,
  User, Star, TrendingUp, MessageSquare, Award, AlertCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import { api } from '../services/api'

const SENTIMENT_COLOR: Record<string, string> = {
  positivo: 'bg-green-100 text-green-700 border-green-200',
  neutro:   'bg-amber-100 text-amber-700 border-amber-200',
  negativo: 'bg-red-100 text-red-700 border-red-200',
}
const SENTIMENT_EMOJI: Record<string, string> = { positivo: '😊', neutro: '😐', negativo: '😟' }
const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444']

export function ReporteView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evalId = id ? parseInt(id) : 0

  const [reporte, setReporte]       = useState('')
  const [respuestas, setRespuestas] = useState<any[]>([])
  const [promedios, setPromedios]   = useState<any[]>([])
  const [evaluacion, setEvaluacion] = useState<any>(null)
  const [cargandoReporte, setCargandoReporte] = useState(false)
  const [cargandoDatos, setCargandoDatos]     = useState(true)
  const [errorReporte, setErrorReporte]       = useState('')
  const [tabActiva, setTabActiva]   = useState<'graficas' | 'respuestas' | 'reporte'>('graficas')

  // Cargar datos base (respuestas + promedios)
  useEffect(() => {
    if (!evalId) return
    Promise.all([
      api.getRespuestas(evalId),
      api.getPromedios(evalId),
      fetch(`http://localhost:8000/api/sesion/${id ? 'X' : ''}`)
        .catch(() => null),
    ])
    .then(async ([resp, prom]) => {
      setRespuestas(resp)
      setPromedios(prom)
    })
    .catch(console.error)
    .finally(() => setCargandoDatos(false))
  }, [evalId])

  // Generar reporte IA (bajo demanda, puede tardar)
  const generarReporteIA = async () => {
    setCargandoReporte(true)
    setErrorReporte('')
    try {
      const data = await api.getReporte(evalId)
      setReporte(data.reporte_markdown)
      setTabActiva('reporte')
    } catch (e: any) {
      setErrorReporte('No se pudo generar el reporte. Verifica que DeepSeek esté configurado.')
    } finally {
      setCargandoReporte(false)
    }
  }

  // ── Métricas calculadas ────────────────────────────────────────
  const totalResp = respuestas.length
  const promedioGeneral = promedios.length > 0
    ? (promedios.reduce((s, p) => s + p.promedio, 0) / promedios.length).toFixed(1)
    : null

  // Distribución de sentimientos
  const sentimientos = respuestas.reduce(
    (acc, r) => {
      const s = r.analisis_ia?.[0]?.sentimiento || 'neutro'
      acc[s] = (acc[s] || 0) + 1
      return acc
    },
    { positivo: 0, neutro: 0, negativo: 0 } as Record<string, number>
  )
  const pieData = [
    { name: 'Positivo 😊', value: sentimientos.positivo, color: '#22c55e' },
    { name: 'Neutro 😐',   value: sentimientos.neutro,   color: '#f59e0b' },
    { name: 'Negativo 😟', value: sentimientos.negativo, color: '#ef4444' },
  ].filter(d => d.value > 0)

  // Promedio de comprensión
  const comprensionPromedio = respuestas.length > 0
    ? (respuestas
        .map(r => r.analisis_ia?.[0]?.puntaje_comprension)
        .filter(v => v != null)
        .reduce((s, v, _, arr) => s + v / arr.length, 0)
      ).toFixed(1)
    : null

  // Datos radar (promedios por pregunta normalizados a 0-10)
  const radarData = promedios.map(p => ({
    pregunta: `P${p.pregunta_id}`,
    promedio: p.promedio,
    texto: p.texto,
  }))

  const getBarColor = (v: number) =>
    v >= 8 ? '#14b8a6' : v >= 6 ? '#3b82f6' : v >= 4 ? '#f59e0b' : '#ef4444'

  if (cargandoDatos) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3">
      <Loader2 className="animate-spin text-teal-500" size={40} />
      <p className="text-gray-400 text-sm">Cargando resultados…</p>
    </div>
  )

  return (
    <main className="w-full min-h-screen p-4 md:p-8 bg-slate-50 dark:bg-slate-900">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/teacher')}
          className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-colors text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            📊 Resultados y Análisis IA
          </h1>
          <p className="text-sm text-gray-500">{totalResp} respuesta{totalResp !== 1 ? 's' : ''} recolectada{totalResp !== 1 ? 's' : ''}</p>
        </div>
        <a href={api.exportExcel(evalId)} download
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold text-white transition-all shadow-sm">
          <Download size={15} /> Descargar Excel
        </a>
      </div>

      {/* ── Tarjetas de resumen ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Respuestas',
            value: totalResp,
            icon: <Users size={20} className="text-blue-500" />,
            color: '#3b82f6',
            sub: 'Total recibidas',
          },
          {
            label: 'Promedio General',
            value: promedioGeneral ? `${promedioGeneral}/10` : '—',
            icon: <TrendingUp size={20} className="text-teal-500" />,
            color: '#14b8a6',
            sub: 'Preguntas de escala',
          },
          {
            label: 'Comprensión IA',
            value: comprensionPromedio ? `${comprensionPromedio}/10` : '—',
            icon: <BrainCircuit size={20} className="text-purple-500" />,
            color: '#a855f7',
            sub: 'Análisis semántico Groq',
          },
          {
            label: 'Sentimiento +',
            value: totalResp > 0 ? `${Math.round((sentimientos.positivo / totalResp) * 100)}%` : '—',
            icon: <Award size={20} className="text-green-500" />,
            color: '#22c55e',
            sub: `${sentimientos.positivo} positivos`,
          },
        ].map(c => (
          <div key={c.label}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700"
            style={{ borderTop: `3px solid ${c.color}` }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-gray-500 font-medium">{c.label}</span>
              <div className="p-1.5 bg-gray-50 dark:bg-slate-700 rounded-lg">{c.icon}</div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl p-1.5 shadow-sm border border-gray-100 dark:border-slate-700 mb-6 w-fit">
        {[
          { key: 'graficas',   label: '📊 Gráficas' },
          { key: 'respuestas', label: '👥 Respuestas' },
          { key: 'reporte',    label: '🧠 Reporte IA' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setTabActiva(tab.key as any)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tabActiva === tab.key
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Gráficas ── */}
      {tabActiva === 'graficas' && (
        <div className="space-y-6">
          {promedios.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <BarChart3 size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">No hay preguntas de escala para graficar.</p>
              <p className="text-sm text-gray-300 mt-1">Agrega preguntas tipo ⭐ Escala en tu evaluación.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Barras: promedio por pregunta */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-teal-500" /> Promedio por pregunta
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={promedios} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="pregunta_id" tickFormatter={v => `P${v}`} tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="bg-white border border-gray-100 rounded-xl shadow-xl p-3 max-w-[200px]">
                            <p className="font-semibold text-gray-700 text-xs mb-1 line-clamp-2">{d.texto}</p>
                            <p className="text-teal-600 font-bold">Promedio: {d.promedio}/10</p>
                            <p className="text-gray-400 text-xs">{d.total_respuestas} resp.</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="promedio" radius={[6, 6, 0, 0]}>
                      {promedios.map((e, i) => <Cell key={i} fill={getBarColor(e.promedio)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-3 mt-3 flex-wrap">
                  {[['≥8 Excelente','#14b8a6'],['≥6 Bueno','#3b82f6'],['≥4 Regular','#f59e0b'],['<4 Bajo','#ef4444']].map(([l,c]) => (
                    <div key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <div className="w-3 h-3 rounded-sm" style={{ background: c }} />{l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Radar: perfil de la evaluación */}
              {radarData.length >= 3 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Star size={18} className="text-amber-500" /> Perfil de la evaluación
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="pregunta" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Radar name="Promedio" dataKey="promedio" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Pie: distribución de sentimientos */}
              {pieData.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare size={18} className="text-blue-500" /> Sentimiento general
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                        dataKey="value" paddingAngle={3} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Distribución detallada por pregunta */}
              {promedios.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 lg:col-span-2">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
                    📋 Distribución de respuestas por pregunta
                  </h3>
                  <div className="space-y-4">
                    {promedios.map(p => {
                      const max = Math.max(...Object.values(p.distribucion || {}).map(Number), 1)
                      return (
                        <div key={p.pregunta_id}>
                          <div className="flex justify-between items-start mb-1.5">
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium flex-1 pr-4 line-clamp-1">
                              <span className="text-teal-500 font-bold mr-1">P{p.pregunta_id}.</span>{p.texto}
                            </p>
                            <span className="text-sm font-bold text-teal-600 whitespace-nowrap">{p.promedio}/10</span>
                          </div>
                          <div className="flex gap-1 items-end h-8">
                            {[1,2,3,4,5,6,7,8,9,10].map(n => {
                              const cnt = p.distribucion?.[String(n)] || 0
                              const h = cnt > 0 ? Math.max(4, Math.round((cnt / max) * 32)) : 2
                              const color = n <= 3 ? '#ef4444' : n <= 6 ? '#f59e0b' : n <= 8 ? '#3b82f6' : '#14b8a6'
                              return (
                                <div key={n} className="flex-1 flex flex-col items-center gap-0.5" title={`${n}: ${cnt} resp.`}>
                                  <div className="rounded-t-sm w-full transition-all" style={{ height: h, background: cnt > 0 ? color : '#f3f4f6' }} />
                                  <span className="text-[9px] text-gray-400">{n}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Respuestas ── */}
      {tabActiva === 'respuestas' && (
        <div className="space-y-4">
          {respuestas.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <Users size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">Sin respuestas aún.</p>
            </div>
          ) : (
            respuestas.map((r, i) => (
              <div key={r.id || i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                {/* Encabezado del estudiante */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center font-bold text-teal-600 text-sm">
                      {(r.nombre === 'Anónimo' ? '?' : r.nombre.charAt(0)).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white text-sm">{r.nombre}</p>
                      <p className="text-xs text-gray-400">{r.grado !== '—' ? r.grado : 'Sin grado'} · {r.created_at?.split('T')[0] || ''}</p>
                    </div>
                  </div>
                  {r.analisis_ia?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${SENTIMENT_COLOR[r.analisis_ia[0]?.sentimiento] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {SENTIMENT_EMOJI[r.analisis_ia[0]?.sentimiento] || '😐'} {r.analisis_ia[0]?.sentimiento || 'neutro'}
                      </span>
                      <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                        ⭐ {r.analisis_ia[0]?.puntaje_comprension}/10
                      </span>
                    </div>
                  )}
                </div>

                {/* Respuestas a cada pregunta */}
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(r.datos || {}).map(([pregId, valor]: [string, any]) => {
                    const numVal = Number(valor)
                    const esEscala = !isNaN(numVal) && numVal >= 1 && numVal <= 10 && String(valor).match(/^\d+$/)
                    return (
                      <div key={pregId} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-gray-400 mb-1 font-medium">Pregunta {pregId}</p>
                        {esEscala ? (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                <div key={n} className="w-4 h-4 rounded-sm text-[8px] flex items-center justify-center font-bold"
                                  style={{ background: n <= numVal ? getBarColor(numVal) : '#e5e7eb', color: n <= numVal ? 'white' : '#d1d5db' }}>
                                  {n === numVal ? n : ''}
                                </div>
                              ))}
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">{valor}/10</span>
                          </div>
                        ) : (
                          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{String(valor)}</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Resumen IA */}
                {r.analisis_ia?.length > 0 && r.analisis_ia[0]?.resumen && (
                  <div className="mx-5 mb-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-semibold text-xs mb-1">
                      <BrainCircuit size={12} /> Resumen Groq IA
                    </div>
                    <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">{r.analisis_ia[0]?.resumen}</p>
                    {r.analisis_ia[0]?.palabras_clave?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {r.analisis_ia[0].palabras_clave.map((p: string, i: number) => (
                          <span key={i} className="text-[10px] bg-teal-100 dark:bg-teal-800 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: Reporte IA ── */}
      {tabActiva === 'reporte' && (
        <div className="space-y-4">
          {!reporte && !cargandoReporte && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <BrainCircuit size={32} className="text-teal-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">Reporte Pedagógico con DeepSeek</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                  Genera un análisis profundo con fortalezas, áreas de mejora y un plan de acción pedagógico basado en todas las respuestas.
                </p>
              </div>
              {errorReporte && (
                <div className="flex items-center gap-2 text-red-600 text-sm p-3 rounded-xl bg-red-50 border border-red-100 max-w-md mx-auto">
                  <AlertCircle size={16} /> {errorReporte}
                </div>
              )}
              <button onClick={generarReporteIA} disabled={totalResp === 0}
                className="mx-auto flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg transition-all hover:-translate-y-0.5">
                <BrainCircuit size={18} /> Generar reporte IA ahora
              </button>
              {totalResp === 0 && <p className="text-xs text-gray-400">Se necesita al menos 1 respuesta para generar el reporte.</p>}
            </div>
          )}

          {cargandoReporte && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 space-y-3">
              <Loader2 className="animate-spin text-teal-500 mx-auto" size={36} />
              <p className="text-gray-500 font-medium">DeepSeek está analizando las respuestas…</p>
              <p className="text-xs text-gray-400">Esto puede tomar entre 5 y 15 segundos.</p>
            </div>
          )}

          {reporte && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-teal-50 dark:bg-teal-900/20">
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-semibold">
                  <BrainCircuit size={18} /> Análisis Pedagógico — DeepSeek IA
                </div>
                <button onClick={generarReporteIA} disabled={cargandoReporte}
                  className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                  {cargandoReporte ? <Loader2 size={12} className="animate-spin" /> : '↺'} Regenerar
                </button>
              </div>
              <div className="px-6 py-5 space-y-2 text-gray-700 dark:text-gray-300">
                {reporte.split('\n').map((line, i) => {
                  if (line.startsWith('## '))  return <h2 key={i} className="text-lg font-bold text-gray-900 dark:text-white mt-5 mb-1">{line.replace(/^##\s*/, '')}</h2>
                  if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-0.5">{line.replace(/^###\s*/, '')}</h3>
                  if (line.startsWith('# '))   return <h1 key={i} className="text-xl font-bold text-gray-900 dark:text-white mt-5 mb-1">{line.replace(/^#\s*/, '')}</h1>
                  if (line.startsWith('- '))   return <li key={i} className="ml-5 text-sm text-gray-600 dark:text-gray-400 list-disc">{line.replace(/^-\s*/, '')}</li>
                  if (line.trim() === '')       return <div key={i} className="h-2" />
                  return <p key={i} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
