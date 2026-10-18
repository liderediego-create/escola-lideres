import { useState, useEffect } from 'react'
import { supabase, COR_MODULO, formatarData, calcularAulaAtual } from '../lib/supabase'
import ImprimirDiario from '../components/ImprimirDiario'

const EQUIPES = ['Valentes', 'Enoque', 'Inábaláveis', 'Eleitos']

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
      .from('turmas').select('*, professor:professor_id(nome)').eq('professor_id', usuario.id).eq('ativa', true).single()

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
    { id: 'chamada',  label: 'Fazer Chamada',    icon: '✅' },
    { id: 'alunos',   label: 'Alunos',           icon: '👥' },
    { id: 'aulas',    label: 'Aulas & Conteúdo', icon: '📚' },
    { id: 'diario',   label: 'Diário Completo',  icon: '📋' },
    { id: 'relatorio',label: 'Relatórios',       icon: '📊' },
  ]

  return (
    <div className="app-layout">
      <aside className="sidebar" style={{ background: `linear-gradient(160deg, ${cor.text}, ${cor.primary})` }}>
        <div className="sidebar-logo">
          <div style={{ fontSize: 40, marginBottom: 6 }}>🎓</div>
          <h2>ESCOLA DE LÍDERES</h2>
          <p>Área do Professor</p>
        </div>
        <div style={{ padding: '10px 16px', margin: '8px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Sua turma</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{turma.nome}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Aula atual: {aulaAtual}/{turma.total_aulas} · {matriculas.length} alunos</p>
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
        {aba === 'chamada'   && <FazerChamada turma={turma} matriculas={matriculas} aulas={aulas} frequencias={frequencias} usuario={usuario} aulaAtual={aulaAtual} cor={cor} onAtualizar={carregar} setMsg={setMsg} />}
        {aba === 'alunos'    && <GerenciarAlunos turma={turma} matriculas={matriculas} onAtualizar={carregar} setMsg={setMsg} cor={cor} />}
        {aba === 'aulas'     && <GerenciarAulas turma={turma} aulas={aulas} onAtualizar={carregar} setMsg={setMsg} cor={cor} />}
        {aba === 'diario'    && <DiarioCompleto turma={turma} matriculas={matriculas} aulas={aulas} frequencias={frequencias} cor={cor} />}
        {aba === 'relatorio' && <Relatorios turma={turma} matriculas={matriculas} aulas={aulas} frequencias={frequencias} cor={cor} />}
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
    if (!aulaObj) return
    const inicial = {}
    const just = {}
    matriculas.forEach(m => {
      const f = frequencias.find(fr => fr.matricula_id === m.id && fr.aula_id === aulaObj.id)
      inicial[m.id] = f?.status || null
      just[m.id] = f?.justificativa || ''
    })
    setChamada(inicial)
    setJustificativas(just)
  }, [aulaSel, matriculas, frequencias])

  function setStatus(matId, status) {
    setChamada(prev => ({ ...prev, [matId]: status }))
  }

  async function salvarChamada() {
    if (!aulaObj) return
    setSalvando(true)
    for (const m of matriculas) {
      const status = chamada[m.id] || null
      if (!status) continue // pula se não marcado
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
    setMsg('Chamada salva!')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>FAZER CHAMADA</h1>
          <p className="page-subtitle">{turma.nome} · {formatarData(aulaObj?.data)}</p>
        </div>
        <button className="btn btn-primary" style={{ background: cor.primary }} onClick={salvarChamada} disabled={salvando}>
          {salvando ? 'Salvando...' : '💾 Salvar Chamada'}
        </button>
      </div>

      {/* Seletor de aula */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {aulas.map(a => (
          <button key={a.id} onClick={() => setAulaSel(a.numero)} className="btn btn-sm"
            style={{ background: aulaSel === a.numero ? cor.primary : '#fff', color: aulaSel === a.numero ? '#fff' : cor.primary, border: `2px solid ${cor.primary}`, fontWeight: aulaSel === a.numero ? 700 : 500 }}>
            Aula {a.numero}
          </button>
        ))}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { l: 'P', bg: '#d8f3dc', color: '#1b4332', border: '#40916c', label: 'Presente' },
          { l: 'F', bg: '#fee2e2', color: '#9b1c1c', border: '#f87171', label: 'Falta' },
          { l: 'FJ', bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: 'Falta Justificada' },
        ].map(op => (
          <div key={op.l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: op.bg, border: `2px solid ${op.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: op.color, fontSize: 11 }}>{op.l}</div>
            <span style={{ color: '#555' }}>{op.label}</span>
          </div>
        ))}
      </div>

      {aulaObj && (
        <div className="card" style={{ borderTop: `4px solid ${cor.primary}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'Bebas Neue', fontSize: 22, color: cor.primary }}>Aula {aulaObj.numero} {aulaObj.titulo ? `— ${aulaObj.titulo}` : ''}</span>
            <span style={{ fontSize: 13, color: '#718096' }}>{formatarData(aulaObj.data)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matriculas.map((m, idx) => {
              const faltas = frequencias.filter(f => f.matricula_id === m.id && f.status === 'falta').length
              const st = chamada[m.id] || null
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#aaa', minWidth: 24, textAlign: 'right' }}>{idx + 1}</span>
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
                    ].map(op => (
                      <button key={op.s} onClick={() => setStatus(m.id, op.s)} style={{ width: op.l === 'FJ' ? 36 : 30, height: 30, borderRadius: 6, border: `2px solid ${st === op.s ? op.border : '#e2e8f0'}`, background: st === op.s ? op.bg : '#fff', color: st === op.s ? op.color : '#bbb', fontWeight: 800, fontSize: 11, cursor: 'pointer', transition: 'all 0.1s' }}>
                        {op.l}
                      </button>
                    ))}
                  </div>
                  {st === 'falta_justificada' && (
                    <input style={{ flex: 1, minWidth: 180, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}
                      placeholder="Motivo da justificativa..."
                      value={justificativas[m.id] || ''}
                      onChange={e => setJustificativas(prev => ({ ...prev, [m.id]: e.target.value }))} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {matriculas.length === 0 && (
        <div className="empty-state"><div className="empty-state-icon">👥</div><h3>Nenhum aluno nesta turma</h3><p>Adicione alunos na aba "Alunos"</p></div>
      )}
    </>
  )
}

// ── GERENCIAR ALUNOS ─────────────────────────────────────
function GerenciarAlunos({ turma, matriculas, onAtualizar, setMsg, cor }) {
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio())
  const [turmaSelecionada] = useState(turma.id)

  function formVazio() { return { nome: '', email: '', equipe: '', senha_hash: '' } }

  async function gerarMatricula() {
    const { data: todos } = await supabase.from('usuarios').select('matricula, perfil')
    const alunos = (todos || []).filter(u => u.perfil === 'aluno')
    const numeros = alunos.map(u => parseInt((u.matricula || '').replace('A', '')) || 0).filter(n => !isNaN(n))
    const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
    return `A${String(proximo).padStart(3, '0')}`
  }

  async function salvar() {
    if (!form.nome) return
    try {
      if (editando) {
        await supabase.from('usuarios').update({ nome: form.nome, email: form.email || null, equipe: form.equipe || null }).eq('id', editando)
      } else {
        const matricula = await gerarMatricula()
        const { data: novoAluno, error } = await supabase.from('usuarios')
          .insert({ nome: form.nome, email: form.email || null, senha_hash: form.senha_hash || matricula, perfil: 'aluno', matricula, ativo: true, equipe: form.equipe || null })
          .select().single()
        if (error) { alert('Erro: ' + error.message); return }
        if (novoAluno) {
          await supabase.from('matriculas').insert({ aluno_id: novoAluno.id, turma_id: turmaSelecionada, status: 'ativo' })
        }
      }
      setShowForm(false); setEditando(null); setForm(formVazio())
      onAtualizar()
      setMsg('Aluno salvo!')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) { alert('Erro: ' + e.message) }
  }

  async function excluir(alunoId, nome) {
    if (!window.confirm(`Excluir "${nome}"?`)) return
    const { data: mats } = await supabase.from('matriculas').select('id').eq('aluno_id', alunoId)
    const matIds = (mats || []).map(m => m.id)
    if (matIds.length) {
      await supabase.from('frequencias').delete().in('matricula_id', matIds)
      await supabase.from('respostas').delete().in('matricula_id', matIds)
      await supabase.from('matriculas').delete().in('id', matIds)
    }
    await supabase.from('usuarios').delete().eq('id', alunoId)
    onAtualizar()
    setMsg('Aluno excluído.')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>ALUNOS</h1>
          <p className="page-subtitle">{matriculas.length} alunos em {turma.nome}</p>
        </div>
        <button className="btn btn-primary" style={{ background: cor.primary }} onClick={() => { setShowForm(true); setEditando(null); setForm(formVazio()) }}>+ Novo Aluno</button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editando ? 'Editar Aluno' : 'Novo Aluno'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="form-group"><label>Nome completo</label>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do aluno" />
            </div>
            <div className="form-group"><label>Equipe</label>
              <select value={form.equipe} onChange={e => setForm({ ...form, equipe: e.target.value })}>
                <option value="">Sem equipe</option>
                {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div className="form-group"><label>E-mail (opcional)</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            {!editando && (
              <div className="form-group"><label>Senha (opcional)</label>
                <input value={form.senha_hash} onChange={e => setForm({ ...form, senha_hash: e.target.value })} placeholder="Padrão: matrícula gerada automaticamente" />
              </div>
            )}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', marginBottom: 16 }}>
              {editando ? '✏️ A matrícula não pode ser alterada.' : '✅ Matrícula gerada automaticamente. Ex: A046, A047...'}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: cor.primary }} onClick={salvar} disabled={!form.nome}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {matriculas.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">👥</div><h3>Nenhum aluno</h3><p>Clique em "+ Novo Aluno" para começar</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Matrícula</th><th>Nome</th><th>Equipe</th><th>Ações</th></tr></thead>
              <tbody>
                {matriculas.map(m => (
                  <tr key={m.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{m.aluno?.matricula}</span></td>
                    <td style={{ fontWeight: 600 }}>{m.aluno?.nome}</td>
                    <td>{m.aluno?.equipe ? <span className="badge badge-azul">{m.aluno.equipe}</span> : <span style={{ color: '#ccc' }}>—</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditando(m.aluno?.id); setForm({ nome: m.aluno?.nome || '', email: m.aluno?.email || '', equipe: m.aluno?.equipe || '', senha_hash: '' }); setShowForm(true) }}>✏️ Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => excluir(m.aluno?.id, m.aluno?.nome)}>🗑️ Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ── GERENCIAR AULAS & CONTEÚDO ────────────────────────────
function GerenciarAulas({ turma, aulas, onAtualizar, setMsg, cor }) {
  const [editAula, setEditAula] = useState(null)
  const [form, setForm] = useState({})

  async function salvarAula() {
    await supabase.from('aulas').update({ titulo: form.titulo, descricao: form.descricao, url_pdf: form.url_pdf, url_video: form.url_video }).eq('id', editAula)
    setEditAula(null)
    onAtualizar()
    setMsg('Aula atualizada!')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>AULAS & CONTEÚDO</h1>
          <p className="page-subtitle">Adicione títulos, PDFs e vídeos para os alunos</p>
        </div>
      </div>

      {editAula && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Editar Aula {form.numero}</h3>
              <button className="modal-close" onClick={() => setEditAula(null)}>✕</button>
            </div>
            <div className="form-group"><label>Título da Aula</label>
              <input value={form.titulo || ''} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Liderança Servidora" />
            </div>
            <div className="form-group"><label>Descrição</label>
              <textarea value={form.descricao || ''} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Breve descrição do conteúdo..." />
            </div>
            <div className="form-group"><label>📄 Link do PDF (Google Drive, Dropbox...)</label>
              <input value={form.url_pdf || ''} onChange={e => setForm({ ...form, url_pdf: e.target.value })} placeholder="https://drive.google.com/..." />
            </div>
            <div className="form-group"><label>▶️ Link do Vídeo (YouTube / Vimeo)</label>
              <input value={form.url_video || ''} onChange={e => setForm({ ...form, url_video: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 16 }}>
              💡 O PDF só ficará visível para o aluno na semana da aula correspondente.
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditAula(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ background: cor.primary }} onClick={salvarAula}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {aulas.map(a => (
          <div key={a.id} className="card" style={{ borderTop: `3px solid ${cor.primary}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: cor.primary }}>Aula {a.numero}</span>
              <span style={{ fontSize: 11, color: '#718096' }}>{formatarData(a.data)}</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{a.titulo || <span style={{ color: '#999', fontStyle: 'italic' }}>Sem título</span>}</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span className={`badge ${a.url_pdf ? 'badge-verde' : 'badge-cinza'}`}>{a.url_pdf ? '✓ PDF' : '○ PDF'}</span>
              <span className={`badge ${a.url_video ? 'badge-azul' : 'badge-cinza'}`}>{a.url_video ? '✓ Vídeo' : '○ Vídeo'}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditAula(a.id); setForm(a) }}>✏️ Editar conteúdo</button>
          </div>
        ))}
      </div>

      {aulas.length === 0 && (
        <div className="empty-state"><div className="empty-state-icon">📚</div><h3>Nenhuma aula gerada</h3><p>As aulas são geradas automaticamente ao criar a turma.</p></div>
      )}
    </>
  )
}

// ── DIÁRIO COMPLETO ───────────────────────────────────────
function DiarioCompleto({ turma, matriculas, aulas, frequencias, cor }) {
  function getStatus(matId, aulaId) {
    return frequencias.find(f => f.matricula_id === matId && f.aula_id === aulaId)?.status
  }

  const cMap = {
    presente: { bg: '#d8f3dc', color: '#1b4332', border: '#40916c', l: 'P' },
    falta: { bg: '#fee2e2', color: '#9b1c1c', border: '#f87171', l: 'F' },
    falta_justificada: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', l: 'FJ' },
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
                <th style={{ textAlign: 'center' }}>Faltas</th>
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
                      const c = cMap[st]
                      return (
                        <td key={a.id} style={{ textAlign: 'center', padding: '6px 4px' }}>
                          {c ? <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: c.bg, border: `2px solid ${c.border}`, color: c.color, fontWeight: 800, fontSize: 11 }}>{c.l}</div>
                            : <span style={{ color: '#ddd' }}>—</span>}
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

// ── RELATÓRIOS ────────────────────────────────────────────
function Relatorios({ turma, matriculas, aulas, frequencias, cor }) {
  const [aulaSel, setAulaSel] = useState(aulas[0]?.id || '')

  const aulaObj = aulas.find(a => a.id === aulaSel)
  const aulasOrdenadas = [...aulas].sort((a, b) => a.numero - b.numero)

  // Stats por aula selecionada
  function getFreqAula(matId) {
    return frequencias.find(f => f.matricula_id === matId && f.aula_id === aulaSel)?.status || null
  }

  const presencasAula = matriculas.filter(m => getFreqAula(m.id) === 'presente').length
  const faltasAula = matriculas.filter(m => getFreqAula(m.id) === 'falta').length
  const justAula = matriculas.filter(m => getFreqAula(m.id) === 'falta_justificada').length
  const semRegistro = matriculas.filter(m => !getFreqAula(m.id)).length

  // Stats individuais acumulados
  function getFaltas(matId) { return frequencias.filter(f => f.matricula_id === matId && f.status === 'falta').length }
  function getPresencas(matId) { return frequencias.filter(f => f.matricula_id === matId && f.status === 'presente').length }
  function getJust(matId) { return frequencias.filter(f => f.matricula_id === matId && f.status === 'falta_justificada').length }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: cor.primary }}>RELATÓRIOS</h1>
          <p className="page-subtitle">{turma.nome} · {matriculas.length} alunos</p>
        </div>
      </div>

      {/* SELETOR DE AULA */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ color: cor.primary }}>📅 Selecione a semana</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {aulasOrdenadas.map(a => (
            <button key={a.id} onClick={() => setAulaSel(a.id)}
              className="btn btn-sm"
              style={{
                background: aulaSel === a.id ? cor.primary : '#fff',
                color: aulaSel === a.id ? '#fff' : cor.primary,
                border: `2px solid ${cor.primary}`,
                fontWeight: aulaSel === a.id ? 700 : 500,
              }}>
              Aula {a.numero}
              {a.data && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}>{new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* CARDS DA SEMANA */}
      {aulaObj && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#718096', marginBottom: 12 }}>
            <strong style={{ color: cor.primary }}>Aula {aulaObj.numero}</strong>
            {aulaObj.titulo ? ` — ${aulaObj.titulo}` : ''} · {aulaObj.data ? new Date(aulaObj.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : ''}
          </p>
          <div className="cards-grid">
            <div className="stat-card" style={{ borderTop: '3px solid #2d6a4f' }}>
              <div style={{ fontSize: 28 }}>👥</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1e40af' }}>{matriculas.length}</div>
              <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Alunos na turma</div>
            </div>
            <div className="stat-card" style={{ borderTop: '3px solid #2d6a4f' }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2d6a4f' }}>{presencasAula}</div>
              <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Presentes nesta aula</div>
            </div>
            <div className="stat-card" style={{ borderTop: '3px solid #9b2226' }}>
              <div style={{ fontSize: 28 }}>❌</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#9b2226' }}>{faltasAula}</div>
              <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Faltas nesta aula</div>
            </div>
            <div className="stat-card" style={{ borderTop: '3px solid #d97706' }}>
              <div style={{ fontSize: 28 }}>📝</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706' }}>{justAula}</div>
              <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Justificadas</div>
            </div>
            <div className="stat-card" style={{ borderTop: '3px solid #999' }}>
              <div style={{ fontSize: 28 }}>—</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#999' }}>{semRegistro}</div>
              <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Sem registro</div>
            </div>
          </div>
        </div>
      )}

      {/* TABELA INDIVIDUAL */}
      <div className="card">
        <div className="card-title" style={{ color: cor.primary }}>Situação Individual — Acumulado</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Matrícula</th>
                <th>Equipe</th>
                <th style={{ textAlign: 'center' }}>Nesta Aula</th>
                <th style={{ textAlign: 'center' }}>Presenças</th>
                <th style={{ textAlign: 'center' }}>Faltas</th>
                <th style={{ textAlign: 'center' }}>FJ</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {matriculas.map(m => {
                const faltas = getFaltas(m.id)
                const presencas = getPresencas(m.id)
                const just = getJust(m.id)
                const freqAula = getFreqAula(m.id)
                const rep = faltas >= 4
                const cMap = {
                  presente: { bg: '#d8f3dc', color: '#1b4332', border: '#40916c', l: 'P' },
                  falta: { bg: '#fee2e2', color: '#9b1c1c', border: '#f87171', l: 'F' },
                  falta_justificada: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', l: 'FJ' },
                }
                const c = cMap[freqAula]
                return (
                  <tr key={m.id} style={{ background: rep ? '#fff5f5' : faltas >= 3 ? '#fffbeb' : 'transparent' }}>
                    <td style={{ fontWeight: 600 }}>{m.aluno?.nome}</td>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{m.aluno?.matricula}</span></td>
                    <td>{m.aluno?.equipe ? <span className="badge badge-azul">{m.aluno.equipe}</span> : <span style={{ color: '#ccc' }}>—</span>}</td>
                    <td style={{ textAlign: 'center' }}>
                      {c
                        ? <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: c.bg, border: `2px solid ${c.border}`, color: c.color, fontWeight: 800, fontSize: 11 }}>{c.l}</div>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'center', color: '#2d6a4f', fontWeight: 700 }}>{presencas}</td>
                    <td style={{ textAlign: 'center', color: faltas >= 3 ? '#9b2226' : '#666', fontWeight: 700 }}>{faltas}</td>
                    <td style={{ textAlign: 'center', color: '#d97706', fontWeight: 700 }}>{just}</td>
                    <td>{rep ? <span className="badge badge-vermelho">⚠️ Reprovado</span> : faltas >= 3 ? <span className="badge badge-amarelo">⚡ Atenção</span> : <span className="badge badge-verde">✓ Regular</span>}</td>
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
