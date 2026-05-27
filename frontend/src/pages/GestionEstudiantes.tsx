import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Users, Trash2, Key, Plus } from 'lucide-react'

export function GestionEstudiantes() {
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchEstudiantes = async () => {
    try {
      const data = await api.estudiantes.getEstudiantes()
      setEstudiantes(data)
    } catch (e: any) {
      setError(e.message || 'Error al cargar estudiantes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEstudiantes()
  }, [])

  const handleCrear = async () => {
    const nombre = prompt('Nombre completo del estudiante:')
    if (!nombre) return
    const usuario = prompt('Nombre de usuario (ej: juan123):')
    if (!usuario) return
    const password = prompt('Contraseña inicial:')
    if (!password) return
    
    try {
      await api.estudiantes.crearEstudiante({ nombre, usuario, password })
      fetchEstudiantes()
      alert('Estudiante creado con éxito.')
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleBorrar = async (id: number) => {
    if (!confirm('¿Estás seguro de borrar este estudiante? Sus respuestas quedarán huérfanas.')) return
    try {
      await api.estudiantes.borrarEstudiante(id)
      fetchEstudiantes()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleCambiarPassword = async (id: number) => {
    const new_password = prompt('Nueva contraseña:')
    if (!new_password) return
    try {
      await api.estudiantes.cambiarPassword(id, new_password)
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="text-blue-500" />
            Gestión de Estudiantes
          </h1>
          <p className="text-gray-500">Administra a los estudiantes de tus clases</p>
        </div>
        <button
          onClick={handleCrear}
          className="bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} /> Nuevo Estudiante
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white">
            <tr>
              <th className="px-6 py-4 font-medium">ID</th>
              <th className="px-6 py-4 font-medium">Nombre Completo</th>
              <th className="px-6 py-4 font-medium">Usuario</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {estudiantes.length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-gray-500">No tienes estudiantes registrados.</td></tr>
            )}
            {estudiantes.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">#{e.id}</td>
                <td className="px-6 py-4 font-medium">{e.nombre}</td>
                <td className="px-6 py-4">{e.usuario}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleCambiarPassword(e.id)} className="text-blue-500 hover:text-blue-700 p-2" title="Cambiar contraseña">
                    <Key size={16} />
                  </button>
                  <button onClick={() => handleBorrar(e.id)} className="text-red-500 hover:text-red-700 p-2" title="Borrar">
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
