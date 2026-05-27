import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Shield, Trash2, Edit2, Key, Plus } from 'lucide-react'

export function PanelAdmin() {
  const [docentes, setDocentes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDocentes = async () => {
    try {
      const data = await api.admin.getDocentes()
      setDocentes(data)
    } catch (e: any) {
      setError(e.message || 'Error al cargar docentes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocentes()
  }, [])

  const handleCrear = async () => {
    const nombre = prompt('Nombre completo:')
    if (!nombre) return
    const email = prompt('Correo electrónico:')
    if (!email) return
    const password = prompt('Contraseña provisional:')
    if (!password) return
    
    try {
      await api.admin.crearDocente({ nombre, email, password, es_admin: false })
      fetchDocentes()
      alert('Docente creado con éxito.')
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleBorrar = async (id: number) => {
    if (!confirm('¿Estás seguro de borrar este docente? Se perderán todas sus evaluaciones.')) return
    try {
      await api.admin.borrarDocente(id)
      fetchDocentes()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleCambiarPassword = async (id: number) => {
    const new_password = prompt('Nueva contraseña:')
    if (!new_password) return
    try {
      await api.admin.cambiarPassword(id, new_password)
      alert('Contraseña actualizada')
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (loading) return <div className="p-8 text-center">Cargando...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <button onClick={() => window.history.back()} className="text-teal-500 hover:underline mb-2 inline-block font-medium">
            ← Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-teal-500" />
            Panel de Administración
          </h1>
          <p className="text-gray-500">Gestiona los docentes de la plataforma</p>
        </div>
        <button
          onClick={handleCrear}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-teal-600 transition-colors"
        >
          <Plus size={18} /> Nuevo Docente
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white">
            <tr>
              <th className="px-6 py-4 font-medium">ID</th>
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Admin</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {docentes.map(d => (
              <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">#{d.id}</td>
                <td className="px-6 py-4 font-medium">{d.nombre}</td>
                <td className="px-6 py-4">{d.email}</td>
                <td className="px-6 py-4">{d.es_admin ? '✅ Sí' : '❌ No'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleCambiarPassword(d.id)} className="text-blue-500 hover:text-blue-700 p-2" title="Cambiar contraseña">
                    <Key size={16} />
                  </button>
                  <button onClick={() => handleBorrar(d.id)} className="text-red-500 hover:text-red-700 p-2" title="Borrar">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
