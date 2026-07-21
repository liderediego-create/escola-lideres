import { useState, useEffect } from 'react'
import { supabase, COR_MODULO, calcularDatasAulas, formatarData } from '../lib/supabase'
import ImprimirDiario from '../components/ImprimirDiario'

const ABAS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'turmas', label: 'Turmas', icon: '🏫' },
  { id: 'alunos', label: 'Alunos', icon: '👥' },
  { id: 'equipe', label: 'Equipe', icon: '👨‍🏫' },
  { id: 'frequencia', label: 'Frequência', icon: '📋' },
  { id: 'aulas', label: 'Aulas & Conteúdo', icon: '📚' },
  { id: 'relatorios', label: 'Relatórios', icon: '📈' },
]

export default function AreaCoordenador({ usuario, onLogout }) {
  const [aba, setAba] = useState('dashboard')
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [matriculas, setMatriculas] = useState([])
  const [aulas, setAulas] = useState([])
  const [frequencias, setFrequencias] = useState([])
  const [msg, setMsg] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setCarregando(true)
    const [t, u, m, a, f] = await Promise.all([
      supabase.from('turmas').select('*, professor:professor_id(nome)').eq('ativa', true).order('modulo'),
      supabase.from('usuarios').select('*').eq('ativo', true).order('nome'),
      supabase.from('matriculas').select('*, aluno:aluno_id(nome, matricula), turma:turma_id(nome, modulo)'),
      supabase.from('aulas').select('*').order('numero'),
      supabase.from('frequencias').select('*'),
    ])
    setTurmas(t.data || [])
    setAlunos((u.data || []).filter(u => u.perfil === 'aluno'))
    setMatriculas(m.data || [])
    setAulas(a.data || [])
    setFrequencias(f.data || [])
    setCarregando(false)
  }

  const cor = COR_MODULO[1]

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar" style={{ background: `linear-gradient(160deg, #1b4332, #2d6a4f)` }}>
        <div className="sidebar-logo">
          <div style={{ fontSize: 40, marginBottom: 6 }}>🎓</div>
          <h2>ESCOLA DE LÍDERES</h2>
          <p>Coordenação</p>
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

      {/* CONTEÚDO */}
      <main className="main-content">
        {carregando ? (
          <div className="empty-state"><div className="loading-spinner" /><p>Carregando...</p></div>
        ) : (
          <>
            {aba === 'dashboard' && <Dashboard turmas={turmas} alunos={alunos} matriculas={matriculas} frequencias={frequencias} />}
            {aba === 'turmas' && <GerenciarTurmas turmas={turmas} alunos={alunos} onAtualizar={carregar} setMsg={setMsg} />}
            {aba === 'alunos' && <GerenciarAlunos alunos={alunos} turmas={turmas} matriculas={matriculas} onAtualizar={carregar} setMsg={setMsg} />}
            {aba === 'equipe' && <GerenciarEquipe onAtualizar={carregar} setMsg={setMsg} />}
            {aba === 'frequencia' && <VerFrequencia turmas={turmas} matriculas={matriculas} aulas={aulas} frequencias={frequencias} onAtualizar={carregar} />}
            {aba === 'aulas' && <GerenciarAulas turmas={turmas} aulas={aulas} onAtualizar={carregar} setMsg={setMsg} />}
            {aba === 'relatorios' && <Relatorios turmas={turmas} matriculas={matriculas} aulas={aulas} frequencias={frequencias} alunos={alunos} />}
          </>
        )}
        {msg && <div className="msg-ok" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 999 }}>{msg}</div>}
      </main>
    </div>
  )
}

// ── DASHBOARD ──────────────────────────────────────────────
function Dashboard({ turmas, alunos, matriculas, frequencias }) {
  const totalAlunos = alunos.length
  const totalTurmas = turmas.length
  const faltas = frequencias.filter(f => f.status === 'falta').length
  const reprovados = calcularReprovados(matriculas, frequencias)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: '#1b4332' }}>DASHBOARD</h1>
          <p className="page-subtitle">Visão geral da Escola de Líderes</p>
        </div>
      </div>

      <div className="cards-grid">
        {[
          { icon: '🏫', valor: totalTurmas, label: 'Turmas ativas', cor: '#2d6a4f' },
          { icon: '👥', valor: totalAlunos, label: 'Alunos matriculados', cor: '#1e40af' },
          { icon: '❌', valor: faltas, label: 'Faltas registradas', cor: '#9b2226' },
          { icon: '⚠️', valor: reprovados, label: 'Alunos em risco', cor: '#d97706' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-valor" style={{ color: c.cor }}>{c.valor}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {turmas.map(t => {
          const cor = COR_MODULO[t.modulo]
          const mats = matriculas.filter(m => m.turma_id === t.id)
          return (
            <div key={t.id} className="card" style={{ borderTop: `4px solid ${cor.primary}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="badge" style={{ background: cor.light, color: cor.text }}>Módulo {t.modulo}</span>
                <span style={{ fontSize: 12, color: '#718096' }}>{formatarData(t.data_inicio)}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t.nome}</h3>
              <p style={{ fontSize: 12, color: '#718096' }}>Prof.: {t.professor?.nome || '—'}</p>
              <div style={{ marginTop: 12, padding: '8px 12px', background: cor.light, borderRadius: 6, textAlign: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: cor.primary }}>{mats.length}</span>
                <span style={{ fontSize: 11, color: cor.text, marginLeft: 4 }}>alunos</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── GERENCIAR TURMAS ──────────────────────────────────────
function GerenciarTurmas({ turmas, alunos, onAtualizar, setMsg }) {
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [showDatas, setShowDatas] = useState(null)
  const [professores, setProfessores] = useState([])
  const [form, setForm] = useState(formVazio())
  const [novaData, setNovaData] = useState('')
  const [datasSemAula, setDatasSemAula] = useState([])

  useEffect(() => {
    supabase.from('usuarios').select('*').eq('perfil', 'professor').eq('ativo', true)
      .then(({ data }) => setProfessores(data || []))
  }, [])

  function formVazio() {
    return { nome: '', modulo: 1, professor_id: '', data_inicio: '', dia_semana: 0, total_aulas: 10 }
  }

  async function salvar() {
    if (!form.nome || !form.data_inicio) return
    if (editando) {
      await supabase.from('turmas').update(form).eq('id', editando)
    } else {
      const { data: t } = await supabase.from('turmas').insert(form).select().single()
      // Gera aulas automaticamente
      if (t) {
        const datasAulas = calcularDatasAulas(form.data_inicio, form.total_aulas, [])
        await supabase.from('aulas').insert(datasAulas.map(a => ({ turma_id: t.id, numero: a.numero, data: a.data })))
      }
    }
    setShowForm(false)
    setEditando(null)
    setForm(formVazio())
    onAtualizar()
    setMsg('Turma salva com sucesso!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function carregarDatas(turmaId) {
    const { data } = await supabase.from('datas_sem_aula').select('*').eq('turma_id', turmaId)
    setDatasSemAula(data || [])
    setShowDatas(turmaId)
  }

  async function adicionarData() {
    if (!novaData) return
    await supabase.from('datas_sem_aula').insert({ turma_id: showDatas, data: novaData, motivo: 'Congresso / Sem aula' })
    setNovaData('')
    carregarDatas(showDatas)
    setMsg('Data adicionada!')
    setTimeout(() => setMsg(''), 2000)
  }

  async function removerData(id) {
    await supabase.from('datas_sem_aula').delete().eq('id', id)
    carregarDatas(showDatas)
  }

  async function encerrarTurma(id) {
    if (!window.confirm('Encerrar esta turma?')) return
    await supabase.from('turmas').update({ ativa: false }).eq('id', id)
    onAtualizar()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: '#1b4332' }}>TURMAS</h1>
          <p className="page-subtitle">{turmas.length} turmas ativas</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditando(null); setForm(formVazio()) }}>+ Nova Turma</button>
      </div>

      {/* MODAL FORM */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editando ? 'Editar Turma' : 'Nova Turma'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="form-group"><label>Nome da Turma</label>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Módulo 1 - Turma 2025A" />
            </div>
            <div className="form-row">
              <div className="form-group"><label>Módulo</label>
                <select value={form.modulo} onChange={e => setForm({ ...form, modulo: parseInt(e.target.value) })}>
                  <option value={1}>Módulo 1 (Verde)</option>
                  <option value={2}>Módulo 2 (Vermelho)</option>
                  <option value={3}>Módulo 3 (Cinza)</option>
                </select>
              </div>
              <div className="form-group"><label>Professor</label>
                <select value={form.professor_id} onChange={e => setForm({ ...form, professor_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Data da Aula 01</label>
                <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div className="form-group"><label>Total de Aulas</label>
                <input type="number" value={form.total_aulas} onChange={e => setForm({ ...form, total_aulas: parseInt(e.target.value) })} min={1} max={20} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DATAS SEM AULA */}
      {showDatas && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">📅 Datas sem Aula</h3>
              <button className="modal-close" onClick={() => setShowDatas(null)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#718096', marginBottom: 16 }}>Congressos, feriados e outros eventos que cancelam a aula desta turma.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 6 }} />
              <button className="btn btn-primary" onClick={adicionarData}>Adicionar</button>
            </div>
            {datasSemAula.length === 0 ? (
              <p style={{ color: '#718096', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Nenhuma data cadastrada</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {datasSemAula.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                    <span style={{ fontSize: 13 }}>{formatarData(d.data)} — {d.motivo || 'Sem aula'}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => removerData(d.id)}>Remover</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LISTA DE TURMAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {turmas.map(t => {
          const cor = COR_MODULO[t.modulo]
          return (
            <div key={t.id} className="card" style={{ borderLeft: `4px solid ${cor.primary}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="badge" style={{ background: cor.light, color: cor.text }}>Módulo {t.modulo}</span>
                <span style={{ fontSize: 11, color: '#718096' }}>Início: {formatarData(t.data_inicio)}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t.nome}</h3>
              <p style={{ fontSize: 12, color: '#718096', marginBottom: 12 }}>Prof.: {t.professor?.nome || 'Não definido'}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditando(t.id); setForm({ nome: t.nome, modulo: t.modulo, professor_id: t.professor_id, data_inicio: t.data_inicio, dia_semana: t.dia_semana, total_aulas: t.total_aulas }); setShowForm(true) }}>✏️ Editar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => carregarDatas(t.id)}>📅 Sem aula</button>
                <button className="btn btn-danger btn-sm" onClick={() => encerrarTurma(t.id)}>Encerrar</button>
              </div>
            </div>
          )
        })}
      </div>

      {turmas.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🏫</div>
          <h3>Nenhuma turma cadastrada</h3>
          <p>Clique em "+ Nova Turma" para começar</p>
        </div>
      )}
    </>
  )
}

// ── GERENCIAR ALUNOS ─────────────────────────────────────
function GerenciarAlunos({ alunos, turmas, matriculas, onAtualizar, setMsg }) {
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio())
  const [turmaSelecionada, setTurmaSelecionada] = useState('')

  function formVazio() {
    return { nome: '', email: '', senha_hash: '', perfil: 'aluno' }
  }

  function gerarMatriculaAluno(lista) {
    const alunos = lista.filter(u => u.perfil === 'aluno')
    const numeros = alunos
      .map(u => parseInt((u.matricula || '').replace('A', '')) || 0)
      .filter(n => !isNaN(n))
    const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
    return `A${String(proximo).padStart(3, '0')}`
  }

  async function salvar() {
    if (!form.nome) return
    try {
      if (editando) {
        const { error } = await supabase.from('usuarios').update({ nome: form.nome, email: form.email }).eq('id', editando)
        if (error) { alert('Erro ao editar: ' + error.message); return }
        // Atualiza turma se selecionada
        if (turmaSelecionada) {
          const matExist = matriculas.find(m => m.aluno_id === editando)
          if (matExist) {
            await supabase.from('matriculas').update({ turma_id: turmaSelecionada }).eq('id', matExist.id)
          } else {
            await supabase.from('matriculas').insert({ aluno_id: editando, turma_id: turmaSelecionada, status: 'ativo' })
          }
        }
      } else {
        // Gera matrícula única
        const { data: todos } = await supabase.from('usuarios').select('matricula, perfil')
        const matricula = gerarMatriculaAluno(todos || [])
        const senha = form.senha_hash || matricula

        const { data: novoAluno, error: errInsert } = await supabase
          .from('usuarios')
          .insert({ nome: form.nome, email: form.email || null, senha_hash: senha, perfil: 'aluno', matricula, ativo: true })
          .select()
          .single()

        if (errInsert) { alert('Erro ao cadastrar aluno: ' + errInsert.message); return }

        if (novoAluno && turmaSelecionada) {
          const { error: errMat } = await supabase
            .from('matriculas')
            .insert({ aluno_id: novoAluno.id, turma_id: turmaSelecionada, status: 'ativo' })
          if (errMat) { alert('Aluno cadastrado mas erro na matrícula: ' + errMat.message) }
        }
      }
      setShowForm(false)
      setEditando(null)
      setForm(formVazio())
      setTurmaSelecionada('')
      onAtualizar()
      setMsg('Aluno salvo!')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      alert('Erro inesperado: ' + e.message)
    }
  }

  async function promoverAluno(matriculaId, novoStatus) {
    await supabase.from('matriculas').update({ status: novoStatus }).eq('id', matriculaId)
    onAtualizar()
  }

  async function excluirAluno(alunoId, nome) {
    if (!window.confirm(`Excluir o aluno "${nome}"? Esta ação não pode ser desfeita.`)) return
    await supabase.from('frequencias').delete().in('matricula_id',
      (await supabase.from('matriculas').select('id').eq('aluno_id', alunoId)).data?.map(m => m.id) || []
    )
    await supabase.from('respostas').delete().in('matricula_id',
      (await supabase.from('matriculas').select('id').eq('aluno_id', alunoId)).data?.map(m => m.id) || []
    )
    await supabase.from('matriculas').delete().eq('aluno_id', alunoId)
    await supabase.from('usuarios').delete().eq('id', alunoId)
    onAtualizar()
    setMsg('Aluno excluído.')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: '#1b4332' }}>ALUNOS</h1>
          <p className="page-subtitle">{alunos.length} alunos cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditando(null); setForm(formVazio()) }}>+ Novo Aluno</button>
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
            <div className="form-group"><label>E-mail (opcional)</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            {!editando && (
              <div className="form-group"><label>Senha (opcional)</label>
                <input value={form.senha_hash} onChange={e => setForm({ ...form, senha_hash: e.target.value })} placeholder="Padrão: matrícula gerada automaticamente" />
              </div>
            )}
            <div className="form-group"><label>Turma</label>
              <select value={turmaSelecionada} onChange={e => setTurmaSelecionada(e.target.value)}>
                <option value="">{editando ? 'Manter turma atual' : 'Selecione uma turma...'}</option>
                {turmas.map(t => <option key={t.id} value={t.id}>Módulo {t.modulo} — {t.nome}</option>)}
              </select>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', marginBottom: 8 }}>
              {editando ? '✏️ A matrícula não pode ser alterada.' : '✅ Matrícula gerada automaticamente. Ex: A001, A002...'}
            </div>
            {!editando && (
              <div className="form-group"><label>Matricular na Turma</label>
                <select value={turmaSelecionada} onChange={e => setTurmaSelecionada(e.target.value)}>
                  <option value="">Selecione uma turma...</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>Módulo {t.modulo} — {t.nome}</option>)}
                </select>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={!form.nome}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Matrícula</th><th>Nome</th><th>Turma</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map(a => {
                const mat = matriculas.find(m => m.aluno_id === a.id)
                const cor = mat ? COR_MODULO[mat.turma?.modulo || 1] : COR_MODULO[1]
                return (
                  <tr key={a.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{a.matricula}</span></td>
                    <td style={{ fontWeight: 600 }}>{a.nome}</td>
                    <td>{mat ? <span className="badge" style={{ background: cor.light, color: cor.text }}>Módulo {mat.turma?.modulo} — {mat.turma?.nome}</span> : <span style={{ color: '#999' }}>Sem turma</span>}</td>
                    <td>{mat ? <StatusBadge status={mat.status} /> : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditando(a.id); setForm({ nome: a.nome, matricula: a.matricula, email: a.email || '', senha_hash: a.senha_hash || '', perfil: 'aluno' }); setShowForm(true) }}>Editar</button>
                        {mat && mat.status === 'ativo' && (
                          <button className="btn btn-sm" style={{ background: '#d8f3dc', color: '#1b4332', border: '1px solid #b7e4c7' }} onClick={() => promoverAluno(mat.id, 'aprovado')}>✓ Aprovar</button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => excluirAluno(a.id, a.nome)}>🗑️ Excluir</button>
                      </div>
                    </td>
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

// ── VER FREQUÊNCIA ────────────────────────────────────────
function VerFrequencia({ turmas, matriculas, aulas, frequencias, onAtualizar }) {
  const [turmaSel, setTurmaSel] = useState(turmas[0]?.id || '')

  const mats = matriculas.filter(m => m.turma_id === turmaSel)
  const aulasT = aulas.filter(a => a.turma_id === turmaSel).sort((a, b) => a.numero - b.numero)

  function getStatus(matriculaId, aulaId) {
    return frequencias.find(f => f.matricula_id === matriculaId && f.aula_id === aulaId)?.status || null
  }

  function contarFaltas(matriculaId) {
    return frequencias.filter(f => f.matricula_id === matriculaId && f.status === 'falta').length
  }

  const turmaAtual = turmas.find(t => t.id === turmaSel)
  const cor = turmaAtual ? COR_MODULO[turmaAtual.modulo] : COR_MODULO[1]

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: '#1b4332' }}>FREQUÊNCIA</h1>
          <p className="page-subtitle">Visualização geral do diário</p>
        </div>
        {turmaSel && <ImprimirDiario turma={turmaAtual} matriculas={mats} aulas={aulasT} frequencias={frequencias} />}
      </div>

      <div className="form-group" style={{ maxWidth: 400, marginBottom: 20 }}>
        <label>Selecionar Turma</label>
        <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
          {turmas.map(t => <option key={t.id} value={t.id}>Módulo {t.modulo} — {t.nome}</option>)}
        </select>
      </div>

      {mats.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📋</div><h3>Nenhum aluno nesta turma</h3></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  {aulasT.map(a => <th key={a.id} style={{ textAlign: 'center', minWidth: 44 }}>A{a.numero}</th>)}
                  <th>Faltas</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {mats.map(m => {
                  const faltas = contarFaltas(m.id)
                  const reprovado = faltas >= 4
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{m.aluno?.nome}</td>
                      {aulasT.map(a => {
                        const st = getStatus(m.id, a.id)
                        return (
                          <td key={a.id} style={{ textAlign: 'center' }}>
                            {st === 'presente' && <span title="Presente">✅</span>}
                            {st === 'falta' && <span title="Falta">❌</span>}
                            {st === 'falta_justificada' && <span title="Justificada">📝</span>}
                            {!st && <span style={{ color: '#ccc' }}>—</span>}
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: faltas >= 3 ? '#9b2226' : '#2d6a4f' }}>{faltas}</td>
                      <td>{reprovado ? <span className="badge badge-vermelho">⚠️ Reprovado</span> : <span className="badge badge-verde">✓ Regular</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

// ── GERENCIAR AULAS & CONTEÚDO ────────────────────────────
function GerenciarAulas({ turmas, aulas, onAtualizar, setMsg }) {
  const [turmaSel, setTurmaSel] = useState(turmas[0]?.id || '')
  const [editAula, setEditAula] = useState(null)
  const [form, setForm] = useState({})

  const aulasT = aulas.filter(a => a.turma_id === turmaSel).sort((a, b) => a.numero - b.numero)
  const turma = turmas.find(t => t.id === turmaSel)
  const cor = turma ? COR_MODULO[turma.modulo] : COR_MODULO[1]

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
          <h1 className="page-title" style={{ color: '#1b4332' }}>AULAS & CONTEÚDO</h1>
          <p className="page-subtitle">Gerencie PDFs, vídeos e atividades</p>
        </div>
      </div>

      <div className="form-group" style={{ maxWidth: 400, marginBottom: 20 }}>
        <label>Selecionar Turma</label>
        <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
          {turmas.map(t => <option key={t.id} value={t.id}>Módulo {t.modulo} — {t.nome}</option>)}
        </select>
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
            <div className="form-group"><label>🔗 Link do PDF</label>
              <input value={form.url_pdf || ''} onChange={e => setForm({ ...form, url_pdf: e.target.value })} placeholder="https://drive.google.com/..." />
            </div>
            <div className="form-group"><label>▶️ Link do Vídeo (YouTube/Vimeo)</label>
              <input value={form.url_video || ''} onChange={e => setForm({ ...form, url_video: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditAula(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarAula}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {aulasT.map(a => (
          <div key={a.id} className="card" style={{ borderTop: `3px solid ${cor.primary}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: cor.primary }}>Aula {a.numero}</span>
              <span style={{ fontSize: 11, color: '#718096' }}>{formatarData(a.data)}</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{a.titulo || <span style={{ color: '#999', fontStyle: 'italic' }}>Sem título</span>}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 10 }}>
              <span className={`badge ${a.url_pdf ? 'badge-verde' : 'badge-cinza'}`}>{a.url_pdf ? '✓ PDF' : '○ PDF'}</span>
              <span className={`badge ${a.url_video ? 'badge-azul' : 'badge-cinza'}`}>{a.url_video ? '✓ Vídeo' : '○ Vídeo'}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditAula(a.id); setForm(a) }}>✏️ Editar conteúdo</button>
          </div>
        ))}
      </div>
    </>
  )
}

// ── RELATÓRIOS ────────────────────────────────────────────
function Relatorios({ turmas, matriculas, aulas, frequencias, alunos }) {
  const [turmaSel, setTurmaSel] = useState(turmas[0]?.id || '')

  const mats = matriculas.filter(m => m.turma_id === turmaSel)
  const aulasT = aulas.filter(a => a.turma_id === turmaSel)
  const turma = turmas.find(t => t.id === turmaSel)
  const cor = turma ? COR_MODULO[turma.modulo] : COR_MODULO[1]

  function getFaltas(matId) {
    return frequencias.filter(f => f.matricula_id === matId && f.status === 'falta').length
  }
  function getPresencas(matId) {
    return frequencias.filter(f => f.matricula_id === matId && f.status === 'presente').length
  }

  const reprovados = mats.filter(m => getFaltas(m.id) >= 4)
  const aprovados = mats.filter(m => getFaltas(m.id) < 4 && m.status !== 'reprovado')

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: '#1b4332' }}>RELATÓRIOS</h1>
          <p className="page-subtitle">Situação geral dos alunos</p>
        </div>
      </div>

      <div className="form-group" style={{ maxWidth: 400, marginBottom: 24 }}>
        <label>Selecionar Turma</label>
        <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)}>
          {turmas.map(t => <option key={t.id} value={t.id}>Módulo {t.modulo} — {t.nome}</option>)}
        </select>
      </div>

      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-valor" style={{ color: '#1e40af' }}>{mats.length}</div><div className="stat-label">Total de alunos</div></div>
        <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-valor" style={{ color: '#2d6a4f' }}>{aprovados.length}</div><div className="stat-label">Regulares</div></div>
        <div className="stat-card"><div className="stat-icon">⚠️</div><div className="stat-valor" style={{ color: '#9b2226' }}>{reprovados.length}</div><div className="stat-label">Reprovados (≥4 faltas)</div></div>
        <div className="stat-card"><div className="stat-icon">📚</div><div className="stat-valor" style={{ color: '#2d6a4f' }}>{aulasT.length}</div><div className="stat-label">Aulas registradas</div></div>
      </div>

      <div className="card">
        <div className="card-title" style={{ color: cor.primary }}>Situação Individual dos Alunos</div>
        <table>
          <thead>
            <tr><th>Aluno</th><th>Matrícula</th><th>Presenças</th><th>Faltas</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {mats.map(m => {
              const faltas = getFaltas(m.id)
              const presencas = getPresencas(m.id)
              const rep = faltas >= 4
              return (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.aluno?.nome}</td>
                  <td><span style={{ fontFamily: 'monospace' }}>{m.aluno?.matricula}</span></td>
                  <td style={{ color: '#2d6a4f', fontWeight: 600 }}>{presencas}</td>
                  <td style={{ color: faltas >= 3 ? '#9b2226' : '#666', fontWeight: 600 }}>{faltas}</td>
                  <td>{rep ? <span className="badge badge-vermelho">⚠️ Reprovado</span> : <span className="badge badge-verde">✓ Regular</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── HELPERS ───────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { ativo: ['badge-azul', 'Ativo'], aprovado: ['badge-verde', 'Aprovado'], reprovado: ['badge-vermelho', 'Reprovado'], trancado: ['badge-cinza', 'Trancado'] }
  const [cls, label] = map[status] || ['badge-cinza', status]
  return <span className={`badge ${cls}`}>{label}</span>
}

function calcularReprovados(matriculas, frequencias) {
  return matriculas.filter(m => {
    const faltas = frequencias.filter(f => f.matricula_id === m.id && f.status === 'falta').length
    return faltas >= 3
  }).length
}

// ── GERENCIAR EQUIPE (Professores e Coordenadores) ────────
function GerenciarEquipe({ onAtualizar, setMsg }) {
  const [equipe, setEquipe] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(formVazio())
  const [carregando, setCarregando] = useState(true)

  function formVazio() {
    return { nome: '', email: '', senha_hash: '', perfil: 'professor' }
  }

  useEffect(() => { carregarEquipe() }, [])

  async function carregarEquipe() {
    setCarregando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .in('perfil', ['professor', 'coordenador'])
      .eq('ativo', true)
      .order('perfil')
    setEquipe(data || [])
    setCarregando(false)
  }

  function gerarMatricula(perfil, lista) {
    const prefixo = perfil === 'coordenador' ? 'COORD' : 'PROF'
    const doTipo = lista.filter(u => u.perfil === perfil)
    const numeros = doTipo
      .map(u => parseInt((u.matricula || '').replace(prefixo, '')) || 0)
      .filter(n => !isNaN(n))
    const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1
    return `${prefixo}${String(proximo).padStart(3, '0')}`
  }

  async function salvar() {
    if (!form.nome) return
    if (!editando && !form.senha_hash) return
    if (editando) {
      const dados = {
        nome: form.nome,
        email: form.email,
        perfil: form.perfil,
      }
      if (form.senha_hash) dados.senha_hash = form.senha_hash
      await supabase.from('usuarios').update(dados).eq('id', editando)
    } else {
      // Busca todos para gerar matrícula única
      const { data: todos } = await supabase.from('usuarios').select('matricula, perfil')
      const matricula = gerarMatricula(form.perfil, todos || [])
      await supabase.from('usuarios').insert({
        nome: form.nome,
        email: form.email,
        senha_hash: form.senha_hash,
        perfil: form.perfil,
        matricula,
        ativo: true,
      })
    }
    setShowForm(false)
    setEditando(null)
    setForm(formVazio())
    carregarEquipe()
    onAtualizar()
    setMsg('Membro da equipe salvo!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function alterarSenha(id, novaSenha) {
    if (!novaSenha) return
    await supabase.from('usuarios').update({ senha_hash: novaSenha }).eq('id', id)
    setMsg('Senha alterada com sucesso!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function desativar(id) {
    if (!window.confirm('Desativar este membro da equipe?')) return
    await supabase.from('usuarios').update({ ativo: false }).eq('id', id)
    carregarEquipe()
    onAtualizar()
  }

  const professores = equipe.filter(e => e.perfil === 'professor')
  const coordenadores = equipe.filter(e => e.perfil === 'coordenador')

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ color: '#1b4332' }}>EQUIPE</h1>
          <p className="page-subtitle">Professores e coordenadores da Escola de Líderes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditando(null); setForm(formVazio()) }}>
          + Novo Membro
        </button>
      </div>

      {/* MODAL FORM */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editando ? 'Editar Membro' : 'Novo Membro da Equipe'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className="form-group">
              <label>Perfil</label>
              <select value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value })}>
                <option value="professor">Professor</option>
                <option value="coordenador">Coordenador</option>
              </select>
            </div>

            <div className="form-group">
              <label>Nome completo</label>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do professor ou coordenador" />
            </div>

            <div className="form-group">
              <label>E-mail (opcional)</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>

            {!editando && (
              <div className="form-group">
                <label>Senha de acesso</label>
                <input
                  type="password"
                  value={form.senha_hash}
                  onChange={e => setForm({ ...form, senha_hash: e.target.value })}
                  placeholder="Senha inicial de acesso"
                />
              </div>
            )}

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', marginBottom: 16 }}>
              {editando
                ? '✏️ A matrícula é gerada automaticamente e não pode ser alterada. Use o botão "Senha" para trocar a senha.'
                : '✅ A matrícula será gerada automaticamente. Ex: PROF001, PROF002, COORD001...'}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={salvar}
                disabled={!form.nome || (!editando && !form.senha_hash)}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COORDENADORES */}
      {coordenadores.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderTop: '4px solid #1b4332' }}>
          <div className="card-title" style={{ color: '#1b4332' }}>👑 Coordenadores</div>
          <table>
            <thead>
              <tr><th>Nome</th><th>Matrícula</th><th>E-mail</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {coordenadores.map(m => (
                <MembroRow key={m.id} membro={m}
                  onEditar={() => { setEditando(m.id); setForm({ nome: m.nome, matricula: m.matricula, email: m.email || '', senha_hash: '', perfil: m.perfil }); setShowForm(true) }}
                  onSenha={alterarSenha}
                  onDesativar={desativar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PROFESSORES */}
      <div className="card" style={{ borderTop: '4px solid #2d6a4f' }}>
        <div className="card-title" style={{ color: '#2d6a4f' }}>👨‍🏫 Professores</div>
        {carregando ? (
          <p style={{ color: '#718096', fontSize: 13, textAlign: 'center', padding: 20 }}>Carregando...</p>
        ) : professores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👨‍🏫</div>
            <h3>Nenhum professor cadastrado</h3>
            <p>Clique em "+ Novo Membro" para adicionar um professor</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Nome</th><th>Matrícula</th><th>E-mail</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {professores.map(m => (
                <MembroRow key={m.id} membro={m}
                  onEditar={() => { setEditando(m.id); setForm({ nome: m.nome, matricula: m.matricula, email: m.email || '', senha_hash: '', perfil: m.perfil }); setShowForm(true) }}
                  onSenha={alterarSenha}
                  onDesativar={desativar}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ── ROW DE MEMBRO COM TROCA DE SENHA ─────────────────────
function MembroRow({ membro, onEditar, onSenha, onDesativar }) {
  const [trocandoSenha, setTrocandoSenha] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{membro.nome}</td>
      <td><span style={{ fontFamily: 'monospace', background: '#f8fafc', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{membro.matricula}</span></td>
      <td style={{ color: '#718096', fontSize: 12 }}>{membro.email || '—'}</td>
      <td>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={onEditar}>✏️ Editar</button>
          <button
            className="btn btn-sm"
            style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}
            onClick={() => setTrocandoSenha(!trocandoSenha)}
          >
            🔑 Senha
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onDesativar(membro.id)}>Desativar</button>
        </div>
        {trocandoSenha && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              type="password"
              placeholder="Nova senha..."
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { onSenha(membro.id, novaSenha); setNovaSenha(''); setTrocandoSenha(false) }}
              disabled={!novaSenha}
            >
              Salvar
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setTrocandoSenha(false)}>✕</button>
          </div>
        )}
      </td>
    </tr>
  )
}
