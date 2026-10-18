import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import AreaCoordenador from './pages/AreaCoordenador'
import AreaProfessor from './pages/AreaProfessor'
import AreaAluno from './pages/AreaAluno'
import './App.css'

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const salvo = localStorage.getItem('escola_usuario')
    if (salvo) {
      try { setUsuario(JSON.parse(salvo)) } catch {}
    }
    setCarregando(false)
  }, [])

  function fazerLogin(user) {
    setUsuario(user)
    localStorage.setItem('escola_usuario', JSON.stringify(user))
  }

  function fazerLogout() {
    setUsuario(null)
    localStorage.removeItem('escola_usuario')
  }

  if (carregando) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          <div className="loading-spinner" />
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!usuario) return <Login onLogin={fazerLogin} />

  if (usuario.perfil === 'coordenador') return <AreaCoordenador usuario={usuario} onLogout={fazerLogout} />
  if (usuario.perfil === 'professor') return <AreaProfessor usuario={usuario} onLogout={fazerLogout} />
  if (usuario.perfil === 'aluno') return <AreaAluno usuario={usuario} onLogout={fazerLogout} />

  return <Login onLogin={fazerLogin} />
}
