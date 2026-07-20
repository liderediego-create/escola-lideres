import { useState, useEffect } from 'react'
import { supabase, COR_MODULO, formatarData, calcularAulaAtual } from '../lib/supabase'

export default function AreaAluno({ usuario, onLogout }) {
  const [matricula, setMatricula] = useState(null)
  const [turma, setTurma] = useState(null)
  const [aulas, setAulas] = useState([])
  const [frequencias, setFrequencias] = useState([])
  const [atividades, setAtividades] = useState([])
  const [respostas, setRespostas] = useState([])
  const [aba, setAba] = useState('inicio')
  const [aulaSel, setAulaSel] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    const { data: mat } = await supabase
      .from('matriculas')
      .select('*, turma:turma_id(*)')
      .eq('aluno_id', usuario.id)
      .single()

    if (mat) {
      setMatricula(mat)
      setTurma(mat.turma)

      const [a, f, at, r] = await Promise.all([
        supabase.from('aulas').select('*').eq('turma_id', mat.turma_id).order('numero'),
        supabase.from('frequencias').select('*').eq('matricula_id', mat.id),
        supabase.from('atividades').select('*').order('ordem'),
        supabase.from('respostas').select('*').eq('matricula_id', mat.id),
      ])
      setAulas(a.data || [])
      setFrequencias(f.data || [])
      setAtividades(at.data || [])
      setRespostas(r.data || [])
    }
    setCarregando(false)
  }

  if (carregando) return <div className="loading-screen"><div className="loading-spinner" /></div>

  if (!matricula || !turma) return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h2 style={{ marginBottom: 8 }}>Sem matrícula ativa</h2>
        <p style={{ color: '#718096', marginBottom: 20 }}>Você ainda não está matriculado em nenhuma turma.</p>
        <button className="btn btn-secondary" onClick={onLogout}>Sair</button>
      </div>
    </div>
  )

  const cor = COR_MODULO[turma.modulo]
  const aulaAtual = calcularAulaAtual(turma.data_inicio)
  const faltas = frequencias.filter(f => f.status === 'falta').length
  const presencas = frequencias.filter(f => f.status === 'presente').length
  const reprovado = faltas >= 4

  const ABAS = [
    { id: 'inicio', label: 'Início', icon: '🏠' },
    { id: 'aulas', label: 'Minhas Aulas', icon: '📚' },
    { id: 'frequencia', label: 'Minha Frequência', icon: '📋' },
    { id: 'atividades', label: 'Atividades', icon: '✏️' },
  ]

  return (
    <div className="app-layout">
      <aside className="sidebar" style={{ background: `linear-gradient(160deg, ${cor.text}, ${cor.primary})` }}>
        <div className="sidebar-logo">
          <div style={{ fontSize: 40, marginBottom: 6 }}>🎓</div>
          <h2>ESCOLA DE LÍDERES</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Módulo {turma.modulo}</p>
        </div>

        <div style={{ padding: '10px 16px', margin: '8px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Bem-vindo,</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{usuario.nome.split(' ')[0]}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Mat: {usuario.matricula}</p>
        </div>

        <nav className="sidebar-nav">
          {ABAS.map(a => (
            <button key={a.id} className={`nav-item ${aba === a.id ? 'ativo' : ''}`}
              onClick={() => { setAba(a.id); setAulaSel(null) }}>
              <span className="nav-icon">{a.icon}</span> {a.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{usuario.matricula}</div>
          <button className="btn-logout" onClick={onLogout}>Sair</button>
        </div>
      </aside>

      <main className="main-content">
        {reprovado && (
          <div className="alerta-reprovado" style={{ marginBottom: 20 }}>
            ⚠️ Você atingiu {faltas} faltas não justificadas e foi reprovado neste módulo. Fale com a coordenação.
          </div>
        )}

        {aba === 'inicio' && (
          <InicioAluno usuario={usuario} turma={turma} aulaAtual={aulaAtual} faltas={faltas} presencas={presencas} aulas={aulas} cor={cor} onIrAulas={() => setAba('aulas')} />
        )}
        {aba === 'aulas' && !aulaSel && (
          <ListaAulas aulas={aulas} aulaAtual={aulaAtual} cor={cor} onSelAula={setAulaSel} frequencias={frequencias} matriculaId={matricula.id} />
        )}
        {aba === 'aulas' && aulaSel && (
          <DetalheAula
            aula={aulas.find(a => a.id === aulaSel)}
            atividades={atividades.filter(at => at.aula_id === aulaSel)}
            respostas={respostas}
            matriculaId={matricula.id}
            aulaAtual={aulaAtual}
            cor={cor}
            onVoltar={() => setAulaSel(null)}
            onAtualizar={carregar}
          />
        )}
        {aba === 'frequencia' && (
          <FrequenciaAluno aulas={aulas} frequencias={frequencias} faltas={faltas} presencas={presencas} cor={cor} />
        )}
        {aba === 'atividades' && (
          <AtividadesAluno
            aulas={aulas} atividades={atividades} respostas={respostas}
            matriculaId={matricula.id} aulaAtual={aulaAtual} cor={cor}
            onAtualizar={carregar}
          />
        )}
      </main>
    </div>
  )
}

// ── INÍCIO ────────────────────────────────────────────────
function InicioAluno({ usuario, turma, aulaAtual, faltas, presencas, aulas, cor, onIrAulas }) {
  const total = aulas.length
  const pct = total > 0 ? Math.round((presencas / total) * 100) : 0
  const aulaObj = aulas.find(a => a.numero === aulaAtual)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>Olá, {usuario.nome.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">{turma.nome}</p>
        </div>
      </div>

      {/* Banner módulo */}
      <div className="modulo-banner" style={{ background: cor.light, color: cor.text, marginBottom: 24 }}>
        <div className="modulo-banner-num" style={{ color: cor.primary }}>{turma.modulo}</div>
        <div className="modulo-banner-info">
          <h2 style={{ color: cor.primary }}>Módulo {turma.modulo}</h2>
          <p style={{ color: cor.text }}>{turma.nome}</p>
        </div>
      </div>

      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">📖</div>
          <div className="stat-valor" style={{ color: cor.primary }}>{aulaAtual}</div>
          <div className="stat-label">Aula atual</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-valor" style={{ color: '#2d6a4f' }}>{presencas}</div>
          <div className="stat-label">Presenças</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-valor" style={{ color: faltas >= 3 ? '#9b2226' : '#495057' }}>{faltas}</div>
          <div className="stat-label">Faltas ({4 - faltas} restante{4 - faltas !== 1 ? 's' : ''})</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-valor" style={{ color: '#1e40af' }}>{pct}%</div>
          <div className="stat-label">Frequência</div>
        </div>
      </div>

      {/* Barra de frequência */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ color: cor.primary }}>Sua Frequência</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#718096', marginBottom: 8 }}>
          <span>{presencas} presenças</span>
          <span>{pct}%</span>
        </div>
        <div style={{ background: '#e2e8f0', borderRadius: 6, height: 10 }}>
          <div style={{ background: faltas >= 4 ? '#9b2226' : cor.primary, width: `${pct}%`, height: '100%', borderRadius: 6, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 6, border: `2px solid ${i <= faltas ? '#9b2226' : '#e2e8f0'}`,
              background: i <= faltas ? '#fee2e2' : '#f8fafc',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
            }}>
              {i <= faltas ? '❌' : '○'}
            </div>
          ))}
          <span style={{ fontSize: 11, color: '#718096', alignSelf: 'center', marginLeft: 8 }}>
            {faltas >= 4 ? 'Reprovado' : `${4 - faltas} falta${4 - faltas !== 1 ? 's' : ''} para reprovar`}
          </span>
        </div>
      </div>

      {/* Aula desta semana */}
      {aulaObj && (
        <div className="card" style={{ borderLeft: `4px solid ${cor.primary}` }}>
          <div className="card-title" style={{ color: cor.primary }}>📖 Aula desta semana</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: 32, color: cor.primary }}>Aula {aulaObj.numero}</span>
              {aulaObj.titulo && <p style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{aulaObj.titulo}</p>}
              <p style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{formatarData(aulaObj.data)}</p>
            </div>
            <button className="btn btn-sm" style={{ background: cor.primary, color: '#fff' }} onClick={onIrAulas}>
              Acessar →
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── LISTA DE AULAS ────────────────────────────────────────
function ListaAulas({ aulas, aulaAtual, cor, onSelAula, frequencias, matriculaId }) {
  function getFreq(aulaId) {
    return frequencias.find(f => f.aula_id === aulaId)?.status
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>MINHAS AULAS</h1>
          <p className="page-subtitle">Clique na aula disponível para acessar o conteúdo</p>
        </div>
      </div>

      <div className="aulas-grid">
        {aulas.map(a => {
          const disponivel = a.numero <= aulaAtual
          const freq = getFreq(a.id)

          return (
            <div
              key={a.id}
              className={`aula-card ${disponivel ? 'disponivel' : 'bloqueada'}`}
              style={{ borderColor: disponivel ? cor.primary : '#e2e8f0', borderWidth: a.numero === aulaAtual ? 2 : 1 }}
              onClick={() => disponivel && onSelAula(a.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="aula-num" style={{ color: disponivel ? cor.primary : '#ccc' }}>
                  {String(a.numero).padStart(2, '0')}
                </span>
                {a.numero === aulaAtual && (
                  <span className="badge" style={{ background: cor.primary, color: '#fff', fontSize: 10 }}>Semana atual</span>
                )}
                {!disponivel && <span style={{ fontSize: 16 }}>🔒</span>}
              </div>

              <p className="aula-titulo">{a.titulo || `Aula ${a.numero}`}</p>
              <p className="aula-data">{formatarData(a.data)}</p>

              <div className="aula-badges">
                {a.url_pdf && disponivel && <span className="badge badge-verde">📄 PDF</span>}
                {a.url_video && disponivel && <span className="badge badge-azul">▶️ Vídeo</span>}
                {freq === 'presente' && <span className="badge badge-verde">✅ Presente</span>}
                {freq === 'falta' && <span className="badge badge-vermelho">❌ Falta</span>}
                {freq === 'falta_justificada' && <span className="badge badge-amarelo">📝 Justificada</span>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── DETALHE DA AULA ───────────────────────────────────────
function DetalheAula({ aula, atividades, respostas, matriculaId, aulaAtual, cor, onVoltar, onAtualizar }) {
  const [resps, setResps] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const inicial = {}
    respostas.forEach(r => { if (atividades.find(a => a.id === r.atividade_id)) inicial[r.atividade_id] = r.resposta })
    setResps(inicial)
  }, [respostas, atividades])

  if (!aula) return null
  const disponivel = aula.numero <= aulaAtual

  function getVideoEmbed(url) {
    if (!url) return null
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`
    const vim = url.match(/vimeo\.com\/(\d+)/)
    if (vim) return `https://player.vimeo.com/video/${vim[1]}`
    return null
  }

  async function enviarRespostas() {
    setEnviando(true)
    for (const [atId, resp] of Object.entries(resps)) {
      if (!resp.trim()) continue
      const existe = respostas.find(r => r.atividade_id === atId)
      if (existe) {
        await supabase.from('respostas').update({ resposta: resp }).eq('id', existe.id)
      } else {
        await supabase.from('respostas').insert({ matricula_id: matriculaId, atividade_id: atId, resposta: resp })
      }
    }
    setEnviando(false)
    onAtualizar()
    setMsg('Respostas enviadas! ✅')
    setTimeout(() => setMsg(''), 3000)
  }

  const embedUrl = getVideoEmbed(aula.url_video)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>Aula {aula.numero}</h1>
          <p className="page-subtitle">{aula.titulo} · {formatarData(aula.data)}</p>
        </div>
        <button className="btn btn-secondary" onClick={onVoltar}>← Voltar</button>
      </div>

      {/* PDF */}
      {aula.url_pdf && (
        <div className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${cor.primary}` }}>
          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>📄 Material da Aula</div>
              <p style={{ fontSize: 12, color: '#718096' }}>Clique para abrir o PDF desta aula</p>
            </div>
            <a href={aula.url_pdf} target="_blank" rel="noreferrer"
              className="btn btn-sm" style={{ background: cor.primary, color: '#fff', whiteSpace: 'nowrap' }}>
              Abrir PDF →
            </a>
          </div>
        </div>
      )}

      {/* VÍDEO */}
      {embedUrl && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ color: cor.primary }}>▶️ Vídeo da Aula</div>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden' }}>
            <iframe
              src={embedUrl}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
              title={`Aula ${aula.numero}`}
            />
          </div>
        </div>
      )}

      {/* ATIVIDADES */}
      {atividades.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ color: cor.primary }}>✏️ Atividades desta Aula</div>

          {atividades.map((at, i) => (
            <div key={at.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < atividades.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
              <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
                <span style={{ color: cor.primary, marginRight: 6 }}>{i + 1}.</span>{at.pergunta}
              </p>

              {at.tipo === 'multipla_escolha' && at.opcoes ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {at.opcoes.map((op, oi) => (
                    <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 6, background: resps[at.id] === op ? cor.light : '#f8fafc', border: `1.5px solid ${resps[at.id] === op ? cor.primary : '#e2e8f0'}` }}>
                      <input type="radio" name={`at-${at.id}`} checked={resps[at.id] === op} onChange={() => setResps(prev => ({ ...prev, [at.id]: op }))} />
                      <span style={{ fontSize: 14 }}>{op}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={4}
                  value={resps[at.id] || ''}
                  onChange={e => setResps(prev => ({ ...prev, [at.id]: e.target.value }))}
                  placeholder="Digite sua resposta aqui..."
                  style={{ width: '100%', padding: '10px 12px', border: `1.5px solid #e2e8f0`, borderRadius: 8, fontFamily: 'Inter', fontSize: 14, resize: 'vertical', outline: 'none' }}
                />
              )}
            </div>
          ))}

          {msg && <div className="msg-ok">{msg}</div>}

          <button
            className="btn btn-primary"
            style={{ background: cor.primary, marginTop: 12 }}
            onClick={enviarRespostas}
            disabled={enviando}
          >
            {enviando ? 'Enviando...' : '✅ Enviar Respostas'}
          </button>
        </div>
      )}

      {!aula.url_pdf && !aula.url_video && atividades.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>Conteúdo em breve</h3>
          <p>O professor ainda não adicionou conteúdo para esta aula.</p>
        </div>
      )}
    </>
  )
}

// ── FREQUÊNCIA DO ALUNO ───────────────────────────────────
function FrequenciaAluno({ aulas, frequencias, faltas, presencas, cor }) {
  const total = aulas.length
  const pct = total > 0 ? Math.round((presencas / total) * 100) : 0

  function getStatus(aulaId) {
    return frequencias.find(f => f.aula_id === aulaId)?.status
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>MINHA FREQUÊNCIA</h1>
          <p className="page-subtitle">Acompanhe suas presenças e faltas</p>
        </div>
      </div>

      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-valor" style={{ color: '#2d6a4f' }}>{presencas}</div><div className="stat-label">Presenças</div></div>
        <div className="stat-card"><div className="stat-icon">❌</div><div className="stat-valor" style={{ color: faltas >= 3 ? '#9b2226' : '#495057' }}>{faltas}</div><div className="stat-label">Faltas</div></div>
        <div className="stat-card"><div className="stat-icon">📊</div><div className="stat-valor" style={{ color: '#1e40af' }}>{pct}%</div><div className="stat-label">Frequência</div></div>
        <div className="stat-card"><div className="stat-icon">⚠️</div><div className="stat-valor" style={{ color: '#d97706' }}>{Math.max(0, 4 - faltas)}</div><div className="stat-label">Faltas restantes</div></div>
      </div>

      <div className="card">
        <div className="card-title" style={{ color: cor.primary }}>Registro por Aula</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {aulas.map(a => {
            const st = getStatus(a.id)
            return (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: st === 'presente' ? '#f0fdf4' : st === 'falta' ? '#fef2f2' : st === 'falta_justificada' ? '#fffbeb' : '#f8fafc',
                borderRadius: 8, border: `1px solid ${st === 'presente' ? '#bbf7d0' : st === 'falta' ? '#fecaca' : st === 'falta_justificada' ? '#fde68a' : '#e2e8f0'}`
              }}>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: cor.primary, minWidth: 48 }}>A{a.numero}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{a.titulo || `Aula ${a.numero}`}</p>
                  <p style={{ fontSize: 11, color: '#718096' }}>{formatarData(a.data)}</p>
                </div>
                <div style={{ fontSize: 20 }}>
                  {st === 'presente' && '✅'}
                  {st === 'falta' && '❌'}
                  {st === 'falta_justificada' && '📝'}
                  {!st && <span style={{ color: '#ccc', fontSize: 14 }}>—</span>}
                </div>
                <span style={{ fontSize: 12, color: '#718096', minWidth: 80, textAlign: 'right' }}>
                  {st === 'presente' ? 'Presente' : st === 'falta' ? 'Falta' : st === 'falta_justificada' ? 'Justificada' : 'Sem registro'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── ATIVIDADES ────────────────────────────────────────────
function AtividadesAluno({ aulas, atividades, respostas, matriculaId, aulaAtual, cor, onAtualizar }) {
  const [aulaSel, setAulaSel] = useState(null)

  const aulasDisponiveis = aulas.filter(a => a.numero <= aulaAtual)

  function getAtividades(aulaId) {
    return atividades.filter(at => at.aula_id === aulaId)
  }
  function getRespondidas(aulaId) {
    const ats = getAtividades(aulaId)
    return ats.filter(at => respostas.find(r => r.atividade_id === at.id)).length
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>ATIVIDADES</h1>
          <p className="page-subtitle">Responda as atividades de cada aula</p>
        </div>
        {aulaSel && <button className="btn btn-secondary" onClick={() => setAulaSel(null)}>← Voltar</button>}
      </div>

      {!aulaSel ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {aulasDisponiveis.map(a => {
            const total = getAtividades(a.id).length
            const respondidas = getRespondidas(a.id)
            const completo = total > 0 && respondidas === total

            return (
              <div key={a.id} className="card" style={{ cursor: total > 0 ? 'pointer' : 'default', borderTop: `3px solid ${completo ? '#2d6a4f' : cor.primary}` }}
                onClick={() => total > 0 && setAulaSel(a.id)}>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: cor.primary }}>Aula {a.numero}</span>
                {a.titulo && <p style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 8px' }}>{a.titulo}</p>}
                {total === 0 ? (
                  <span className="badge badge-cinza">Sem atividades</span>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#718096', marginBottom: 4 }}>
                      <span>{respondidas}/{total} respondidas</span>
                      <span>{completo ? '✅ Completo' : '⏳ Pendente'}</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6 }}>
                      <div style={{ background: completo ? '#2d6a4f' : cor.primary, width: `${total > 0 ? (respondidas / total) * 100 : 0}%`, height: '100%', borderRadius: 4 }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <DetalheAula
          aula={aulas.find(a => a.id === aulaSel)}
          atividades={getAtividades(aulaSel)}
          respostas={respostas}
          matriculaId={matriculaId}
          aulaAtual={aulaAtual}
          cor={cor}
          onVoltar={() => setAulaSel(null)}
          onAtualizar={onAtualizar}
        />
      )}
    </>
  )
}
