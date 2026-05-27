// src/services/api.ts
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const BASE = IS_LOCAL
  ? 'http://localhost:8000/api'
  : 'https://aulamaster-backend.onrender.com/api'

function getToken(): string | null {
  return localStorage.getItem('aula_token')
}

function getDocenteId(): number {
  return parseInt(localStorage.getItem('aula_docente_id') || '1')
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error desconocido' }))
    throw new Error(err.detail || 'Error en la solicitud')
  }
  return res.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; docente_id: number; nombre: string }>(`${BASE}/auth/login`, {
      method: 'POST', body: JSON.stringify({ email, password })
    }),
  registro: (nombre: string, email: string, password: string) =>
    request<{ token: string; docente_id: number; nombre: string }>(`${BASE}/auth/registro`, {
      method: 'POST', body: JSON.stringify({ nombre, email, password })
    }),

  // Evaluaciones
  getEvaluaciones: (docenteId: number) =>
    request<any[]>(`${BASE}/evaluaciones/docente/${docenteId}`),
  getStats: (docenteId: number) =>
    request<{ total_evaluaciones: number; activas: number; completadas: number; total_respuestas: number }>(`${BASE}/docente/${docenteId}/stats`),
  crearEvaluacion: (body: object) =>
    request<{ id: number; titulo: string; codigo_acceso: string; es_anonima: boolean; activa: boolean; mensaje: string }>(`${BASE}/evaluaciones/crear`, {
      method: 'POST', body: JSON.stringify(body)
    }),
  editarEvaluacion: (id: number, body: object) =>
    request<any>(`${BASE}/evaluaciones/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  clonarEvaluacion: (id: number, docenteId: number) =>
    request<any>(`${BASE}/evaluaciones/${id}/clonar`, {
      method: 'POST', body: JSON.stringify({ docente_id: docenteId })
    }),
  eliminarEvaluacion: (id: number) =>
    request<any>(`${BASE}/evaluaciones/${id}`, { method: 'DELETE' }),
  activarEvaluacion: (id: number) =>
    request<any>(`${BASE}/evaluaciones/${id}/activar`, { method: 'PUT' }),
  desactivarEvaluacion: (id: number) =>
    request<any>(`${BASE}/evaluaciones/${id}/desactivar`, { method: 'PUT' }),
  getRespuestas: (id: number) => request<any[]>(`${BASE}/evaluaciones/${id}/respuestas`),
  getPromedios: (id: number) => request<any[]>(`${BASE}/evaluaciones/${id}/promedios`),
  getReporte: (id: number) => request<{ reporte_markdown: string }>(`${BASE}/evaluaciones/${id}/reporte`),
  getParticipacion: (id: number) => request<any>(`${BASE}/evaluaciones/${id}/participacion`),
  getPlantillas: () => request<any[]>(`${BASE}/plantillas`),
  getPlantilla: (id: string) => request<any>(`${BASE}/plantillas/${id}`),
  sugerirPreguntas: (tema: string, nivel: string, cantidad: number) =>
    request<{ preguntas_sugeridas: string[] }>(`${BASE}/ia/sugerir-preguntas`, {
      method: 'POST', body: JSON.stringify({ tema, nivel, cantidad })
    }),
  exportExcel: (id: number) => `${BASE}/evaluaciones/${id}/export/excel`,
}

export { getDocenteId }
