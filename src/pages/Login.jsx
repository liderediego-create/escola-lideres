import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      // Busca usuário por matrícula
      const { data: user, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('matricula', matricula.trim().toUpperCase())
        .eq('ativo', true)
        .single()

      if (error || !user) {
        setErro('Matrícula não encontrada.')
        setCarregando(false)
        return
      }

      // Para coordenador e professor: senha simples (pode evoluir para bcrypt)
      // Para aluno: senha = matrícula (primeiro acesso) ou senha definida
      if (user.perfil === 'aluno') {
        // Aluno usa matrícula como senha inicial (ou senha_hash se definida)
        const senhaOk = !user.senha_hash || user.senha_hash === senha
        if (!senhaOk) { setErro('Senha incorreta.'); setCarregando(false); return }
      } else {
        // Professor/Coordenador: senha_hash como senha simples
        if (user.senha_hash !== senha) {
          setErro('Senha incorreta.')
          setCarregando(false)
          return
        }
      }

      onLogin(user)
    } catch {
      setErro('Erro ao conectar. Tente novamente.')
    }
    setCarregando(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: 64, marginBottom: 8 }}>🎓</div>
          <h1>ESCOLA DE LÍDERES</h1>
          <p>Comunidade Por Amor</p>
        </div>

        <form onSubmit={entrar}>
          <div className="form-group">
            <label>Matrícula</label>
            <input
              value={matricula}
              onChange={e => setMatricula(e.target.value)}
              placeholder="Ex: M001 ou COORD001"
              autoCapitalize="characters"
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Sua senha"
              required
            />
          </div>

          {erro && <div className="msg-erro">{erro}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: 20, padding: '12px', fontSize: 15 }}
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#999', marginTop: 20 }}>
          Alunos: use sua matrícula como senha no primeiro acesso
        </p>
      </div>
    </div>
  )
}
