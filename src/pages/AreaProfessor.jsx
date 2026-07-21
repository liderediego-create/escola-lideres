import { useState, useEffect } from 'react'
import { supabase, COR_MODULO, formatarData, calcularAulaAtual } from '../lib/supabase'
import ImprimirDiario from '../components/ImprimirDiario'

export default function AreaProfessor({ usuario, onLogout }) {
  const [turma, setTurma] = useState(null)
  const [matriculas, setMatriculas] = useState([])
  const [aulas, setAulas] = useState([])
  const [frequencias, setFrequencias] = useState([])
  const [aba, setAba] = useState('chamada')
  const [msg, setMsg] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    const { data: t } = await supabase
      .from('turmas').select('*').eq('professor_id', usuario.id).eq('ativa', true).single()

    if (t) {
      setTurma(t)
      const [m, a, f] = await Promise.all([
        supabase.from('matriculas').select('*, aluno:aluno_id(id, nome, matricula, equipe)').eq('turma_id', t.id),
        supabase.from('aulas').select('*').eq('turma_id', t.id).order('numero'),
        supabase.from('frequencias').select('*'),
      ])
      setMatriculas((m.data || []).sort((a, b) => (a.aluno?.nome || '').localeCompare(b.aluno?.nome || '', 'pt-BR')))
      setAulas(a.data || [])
      setFrequencias(f.data || [])
    }
    setCarregando(false)
  }

  if (carregando) return <div className="loading-screen"><div className="loading-spinner" /></div>

  if (!turma) return (
    <div className="loading-screen">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏫</div>
        <h2 style={{ marginBottom: 8 }}>Nenhuma turma atribuída</h2>
        <p style={{ color: '#718096' }}>Fale com a coordenação para ser vinculado a uma turma.</p>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onLogout}>Sair</button>
      </div>
    </div>
  )

  const cor = COR_MODULO[turma.modulo]
  const aulaAtual = calcularAulaAtual(turma.data_inicio)

  const ABAS = [
    { id: 'chamada', label: 'Fazer Chamada', icon: '✅' },
    { id: 'diario', label: 'Diário Completo', icon: '📋' },
    { id: 'situacao', label: 'Situação dos Alunos', icon: '📊' },
  ]

  return (
    <div className="app-layout">
      <aside className="sidebar" style={{ background: `linear-gradient(160deg, ${cor.text}, ${cor.primary})` }}>
        <div className="sidebar-logo">
          <div style={{ fontSize: 40, marginBottom: 6 }}>🎓</div>
          <h2>ESCOLA DE LÍDERES</h2>
          <p>Área do Professor</p>
        </div>

        <div style={{ padding: '12px 16px', margin: '8px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Sua turma</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{turma.nome}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Aula atual: {aulaAtual}/{turma.total_aulas}</p>
        </div>

        <nav className="sidebar-nav">
          {ABAS.map(a => (
            <button key={a.id} className={`nav-item ${aba === a.id ? 'ativo' : ''}`} onClick={() => setAba(a.id)}>
              <span className="nav-icon">{a.icon}</span> {a.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{usuario.nome}</div>
          <button className="btn-logout" onClick={onLogout}>Sair</button>
        </div>
      </aside>

      <main className="main-content">
        {aba === 'chamada' && (
          <FazerChamada
            turma={turma} matriculas={matriculas} aulas={aulas}
            frequencias={frequencias} usuario={usuario}
            aulaAtual={aulaAtual} cor={cor}
            onAtualizar={carregar} setMsg={setMsg}
          />
        )}
        {aba === 'diario' && (
          <DiarioCompleto turma={turma} matriculas={matriculas} aulas={aulas} frequencias={frequencias} cor={cor} />
        )}
        {aba === 'situacao' && (
          <SituacaoAlunos matriculas={matriculas} frequencias={frequencias} aulas={aulas} cor={cor} />
        )}
        {msg && <div className="msg-ok" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 999 }}>{msg}</div>}
      </main>
    </div>
  )
}

// ── FAZER CHAMADA ────────────────────────────────────────
function FazerChamada({ turma, matriculas, aulas, frequencias, usuario, aulaAtual, cor, onAtualizar, setMsg }) {
  const [aulaSel, setAulaSel] = useState(aulaAtual)
  const [chamada, setChamada] = useState({})
  const [justificativas, setJustificativas] = useState({})
  const [salvando, setSalvando] = useState(false)

  const aulaObj = aulas.find(a => a.numero === aulaSel)

  useEffect(() => {
    // Carrega chamada existente
    if (!aulaObj) return
    const inicial = {}
    const just = {}
    matriculas.forEach(m => {
      const f = frequencias.find(fr => fr.matricula_id === m.id && fr.aula_id === aulaObj.id)
      inicial[m.id] = f?.status || 'presente'
      just[m.id] = f?.justificativa || ''
    })
    setChamada(inicial)
    setJustificativas(just)
  }, [aulaSel, matriculas, frequencias])

  async function salvarChamada() {
    if (!aulaObj) return
    setSalvando(true)
    for (const m of matriculas) {
      const status = chamada[m.id] || 'presente'
      const justificativa = justificativas[m.id] || null
      const freqExist = frequencias.find(f => f.matricula_id === m.id && f.aula_id === aulaObj.id)

      if (freqExist) {
        await supabase.from('frequencias').update({ status, justificativa, registrado_por: usuario.id }).eq('id', freqExist.id)
      } else {
        await supabase.from('frequencias').insert({ matricula_id: m.id, aula_id: aulaObj.id, status, justificativa, registrado_por: usuario.id })
      }
    }
    setSalvando(false)
    onAtualizar()
    setMsg('Chamada salva com sucesso!')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>FAZER CHAMADA</h1>
          <p className="page-subtitle">{turma.nome} • {formatarData(aulaObj?.data)}</p>
        </div>
        <button className="btn btn-primary" style={{ background: cor.primary }} onClick={salvarChamada} disabled={salvando}>
          {salvando ? 'Salvando...' : '💾 Salvar Chamada'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {aulas.map(a => (
          <button
            key={a.id}
            onClick={() => setAulaSel(a.numero)}
            className="btn btn-sm"
            style={{
              background: aulaSel === a.numero ? cor.primary : '#fff',
              color: aulaSel === a.numero ? '#fff' : cor.primary,
              border: `2px solid ${cor.primary}`,
              fontWeight: aulaSel === a.numero ? 700 : 500,
            }}
          >
            Aula {a.numero}
          </button>
        ))}
      </div>

      {aulaObj && (
        <div className="card" style={{ borderTop: `4px solid ${cor.primary}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: 24, color: cor.primary }}>Aula {aulaObj.numero}</span>
              {aulaObj.titulo && <span style={{ marginLeft: 8, fontSize: 14, color: '#718096' }}>— {aulaObj.titulo}</span>}
            </div>
            <span style={{ fontSize: 13, color: '#718096' }}>{formatarData(aulaObj.data)}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14, fontSize: 12, color: '#718096' }}>
            <span>✅ Presente</span>
            <span>❌ Falta</span>
            <span>📝 Falta Justificada</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matriculas.map(m => {
              const faltas = frequencias.filter(f => f.matricula_id === m.id && f.status === 'falta').length
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{m.aluno?.nome}</p>
                      {m.aluno?.equipe && <span style={{ fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '1px 7px', borderRadius: 8 }}>{m.aluno.equipe}</span>}
                    </div>
                    <p style={{ fontSize: 11, color: '#718096' }}>{m.aluno?.matricula} · {faltas} falta{faltas !== 1 ? 's' : ''}{faltas >= 3 ? ' ⚠️' : ''}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      { s: 'presente', l: 'P', bg: '#d8f3dc', color: '#1b4332', border: '#40916c' },
                      { s: 'falta', l: 'F', bg: '#fee2e2', color: '#9b1c1c', border: '#f87171' },
                      { s: 'falta_justificada', l: 'FJ', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
                    ].map(op => {
                      const ativo = chamada[m.id] === op.s
                      return (
                        <button
                          key={op.s}
                          onClick={() => setChamada(prev => ({ ...prev, [m.id]: op.s }))}
                          style={{
                            width: op.l === 'FJ' ? 36 : 30, height: 30,
                            borderRadius: 6,
                            border: `2px solid ${ativo ? op.border : '#e2e8f0'}`,
                            background: ativo ? op.bg : '#fff',
                            color: ativo ? op.color : '#bbb',
                            fontWeight: 800, fontSize: 11,
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                          }}
                        >
                          {op.l}
                        </button>
                      )
                    })}
                  </div>

                  {chamada[m.id] === 'falta_justificada' && (
                    <input
                      style={{ flex: 1, minWidth: 200, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}
                      placeholder="Motivo da justificativa..."
                      value={justificativas[m.id] || ''}
                      onChange={e => setJustificativas(prev => ({ ...prev, [m.id]: e.target.value }))}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

// ── DIÁRIO COMPLETO ───────────────────────────────────────
function DiarioCompleto({ turma, matriculas, aulas, frequencias, cor }) {
  function getStatus(matId, aulaId) {
    return frequencias.find(f => f.matricula_id === matId && f.aula_id === aulaId)?.status
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>DIÁRIO COMPLETO</h1>
          <p className="page-subtitle">{turma.nome}</p>
        </div>
        <ImprimirDiario turma={turma} matriculas={matriculas} aulas={aulas} frequencias={frequencias} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                {aulas.map(a => (
                  <th key={a.id} style={{ textAlign: 'center', minWidth: 50 }}>
                    <div>A{a.numero}</div>
                    <div style={{ fontWeight: 400, fontSize: 10 }}>{formatarData(a.data)}</div>
                  </th>
                ))}
                <th>Faltas</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {matriculas.map(m => {
                const faltas = frequencias.filter(f => f.matricula_id === m.id && f.status === 'falta').length
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {m.aluno?.nome}
                        {m.aluno?.equipe && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '1px 7px', borderRadius: 8 }}>{m.aluno.equipe}</span>}
                      </td>
                    {aulas.map(a => {
                      const st = getStatus(m.id, a.id)
                      const cMap = {
                        presente: { bg: '#d8f3dc', color: '#1b4332', border: '#40916c', l: 'P' },
                        falta: { bg: '#fee2e2', color: '#9b1c1c', border: '#f87171', l: 'F' },
                        falta_justificada: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', l: 'FJ' },
                      }
                      const c = cMap[st]
                      return (
                        <td key={a.id} style={{ textAlign: 'center', padding: '6px 4px' }}>
                          {c ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: c.bg, border: `2px solid ${c.border}`, color: c.color, fontWeight: 800, fontSize: 11 }}>
                              {c.l}
                            </div>
                          ) : <span style={{ color: '#ddd' }}>—</span>}
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: faltas >= 3 ? '#9b2226' : '#2d6a4f' }}>{faltas}</td>
                    <td>{faltas >= 4 ? <span className="badge badge-vermelho">Reprovado</span> : <span className="badge badge-verde">Regular</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── SITUAÇÃO DOS ALUNOS ───────────────────────────────────
function SituacaoAlunos({ matriculas, frequencias, aulas, cor }) {
  function getFaltas(matId) {
    return frequencias.filter(f => f.matricula_id === matId && f.status === 'falta').length
  }
  function getPresencas(matId) {
    return frequencias.filter(f => f.matricula_id === matId && f.status === 'presente').length
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>SITUAÇÃO DOS ALUNOS</h1>
          <p className="page-subtitle">{matriculas.length} alunos</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {matriculas.map(m => {
          const faltas = getFaltas(m.id)
          const presencas = getPresencas(m.id)
          const total = aulas.length
          const pct = total > 0 ? Math.round((presencas / total) * 100) : 0
          const reprovado = faltas >= 4
          const risco = faltas === 3

          return (
            <div key={m.id} className="card" style={{ borderLeft: `4px solid ${reprovado ? '#9b2226' : risco ? '#d97706' : cor.primary}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{m.aluno?.nome}</p>
                {m.aluno?.equipe && <span style={{ fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '1px 7px', borderRadius: 8 }}>{m.aluno.equipe}</span>}
              </div>
              <p style={{ fontSize: 11, color: '#718096', marginBottom: 12 }}>{m.aluno?.matricula}</p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#2d6a4f' }}>{presencas}</div>
                  <div style={{ fontSize: 10, color: '#718096' }}>Presenças</div>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: faltas >= 3 ? '#9b2226' : '#495057' }}>{faltas}</div>
                  <div style={{ fontSize: 10, color: '#718096' }}>Faltas</div>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1e40af' }}>{pct}%</div>
                  <div style={{ fontSize: 10, color: '#718096' }}>Frequência</div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div style={{ background: '#e2e8f0', borderRadius: 4, height: 6, marginBottom: 10 }}>
                <div style={{ background: reprovado ? '#9b2226' : cor.primary, width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>

              {reprovado && <div className="alerta-reprovado">⚠️ Reprovado — {faltas} faltas</div>}
              {risco && !reprovado && (
                <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                  ⚠️ Atenção — mais 1 falta = reprovação
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
