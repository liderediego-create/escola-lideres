import { COR_MODULO, formatarData } from '../lib/supabase'

// Logo da Escola de Líderes em base64 (referência externa - coordenador deve substituir)
const LOGO_ESCOLA = '' // Coordenador cola aqui o base64 da logo
const LOGO_IGREJA = '' // Coordenador cola aqui o base64 da logo da igreja

export default function ImprimirDiario({ turma, matriculas, aulas, frequencias }) {
  const cor = COR_MODULO[turma?.modulo || 1]

  function getStatus(matId, aulaId) {
    return frequencias.find(f => f.matricula_id === matId && f.aula_id === aulaId)?.status
  }

  function getFaltas(matId) {
    return frequencias.filter(f => f.matricula_id === matId && f.status === 'falta').length
  }

  function gerarHTML() {
    const aulasOrdenadas = [...aulas].sort((a, b) => a.numero - b.numero)
    const matriculasOrdenadas = [...matriculas].sort((a, b) => (a.aluno?.nome || '').localeCompare(b.aluno?.nome || '', 'pt-BR'))

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
  .page { max-width: 900px; margin: 0 auto; padding: 20px; }

  /* CABEÇALHO */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid ${cor.primary};
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .header-logos { display: flex; align-items: center; gap: 16px; }
  .header-logos img { height: 56px; width: auto; }
  .header-title { text-align: center; flex: 1; }
  .header-title h1 {
    font-size: 20px; font-weight: 900;
    text-transform: uppercase; letter-spacing: 3px;
    color: ${cor.primary};
  }
  .header-title h2 { font-size: 13px; color: #555; font-weight: 500; margin-top: 3px; }
  .modulo-badge {
    background: ${cor.primary}; color: #fff;
    padding: 6px 16px; border-radius: 20px;
    font-size: 12px; font-weight: 700;
    letter-spacing: 1px;
  }

  /* INFO TURMA */
  .turma-info {
    display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 8px; margin-bottom: 16px;
  }
  .info-box {
    background: ${cor.light}; border-radius: 6px;
    padding: 8px 12px;
  }
  .info-box label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: ${cor.text}; display: block; margin-bottom: 2px; }
  .info-box span { font-weight: 700; font-size: 12px; }

  /* TABELA DIÁRIO */
  .diario-title {
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 2px;
    color: ${cor.primary}; margin-bottom: 8px;
    padding-bottom: 4px; border-bottom: 1px solid ${cor.light};
  }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }

  /* Cabeçalho da tabela */
  thead tr:first-child th {
    background: ${cor.primary}; color: #fff;
    padding: 8px 6px; text-align: center;
    font-size: 10px; letter-spacing: 0.5px;
  }
  thead tr:first-child th:first-child { text-align: left; padding-left: 10px; min-width: 160px; }

  /* Sub-cabeçalho com datas */
  thead tr:last-child th {
    background: ${cor.light}; color: ${cor.text};
    padding: 4px 4px; text-align: center;
    font-size: 9px; font-weight: 600;
    border-bottom: 1px solid ${cor.primary};
  }
  thead tr:last-child th:first-child { text-align: left; padding-left: 10px; }

  tbody td {
    padding: 7px 6px; border-bottom: 1px solid #f0f0f0;
    text-align: center; font-size: 11px;
    vertical-align: middle;
  }
  tbody td:first-child { text-align: left; padding-left: 10px; font-weight: 600; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody tr:last-child td { border-bottom: 2px solid ${cor.primary}; }

  /* Marcações com fundo colorido */
  .cel-presente {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 22px; border-radius: 5px;
    background: #d8f3dc !important; color: #1b4332 !important;
    border: 1.5px solid #40916c; font-weight: 800; font-size: 10px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .cel-falta {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 22px; border-radius: 5px;
    background: #fee2e2 !important; color: #9b1c1c !important;
    border: 1.5px solid #f87171; font-weight: 800; font-size: 10px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .cel-justificada {
    display: inline-flex; align-items: center; justify-content: center;
    width: 26px; height: 22px; border-radius: 5px;
    background: #fef3c7 !important; color: #92400e !important;
    border: 1.5px solid #fcd34d; font-weight: 800; font-size: 10px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sem-reg { color: #ccc; }

  /* Coluna de faltas */
  .faltas-col { font-weight: 800; }
  .faltas-ok { color: #1b4332; }
  .faltas-risco { color: #92400e; }
  .faltas-reprovado { color: #9b1c1c; }

  /* STATUS FINAL */
  .status-aprovado { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
  .status-reprovado { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }

  /* LEGENDA */
  .legenda {
    display: flex; gap: 20px; margin-bottom: 16px;
    padding: 8px 14px; background: #f8f8f8;
    border-radius: 6px; font-size: 10px;
  }
  .legenda-item { display: flex; align-items: center; gap: 5px; }

  /* ASSINATURAS */
  .assinaturas {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 24px; margin-top: 32px;
  }
  .assinatura-box { text-align: center; }
  .ass-linha { border-top: 1px solid #333; padding-top: 6px; margin-top: 40px; font-size: 11px; }
  .ass-cargo { font-size: 10px; color: #666; margin-top: 2px; }

  /* RODAPÉ */
  .rodape {
    margin-top: 20px; text-align: center;
    font-size: 9px; color: #888;
    border-top: 1px solid #e2e8f0; padding-top: 8px;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 10px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- CABEÇALHO -->
  <div class="header">
    <div class="header-logos">
      ${LOGO_ESCOLA ? `<img src="${LOGO_ESCOLA}" alt="Escola de Líderes" />` : '<div style="width:56px;height:56px;background:#f0f0f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">🎓</div>'}
      ${LOGO_IGREJA ? `<img src="${LOGO_IGREJA}" alt="Comunidade Por Amor" />` : ''}
    </div>
    <div class="header-title">
      <h1>Escola de Líderes</h1>
      <h2>Diário de Frequência</h2>
    </div>
    <span class="modulo-badge">MÓDULO ${turma.modulo}</span>
  </div>

  <!-- INFO DA TURMA -->
  <div class="turma-info">
    <div class="info-box">
      <label>Turma</label>
      <span>${turma.nome}</span>
    </div>
    <div class="info-box">
      <label>Professor(a)</label>
      <span>${turma.professor?.nome || '—'}</span>
    </div>
    <div class="info-box">
      <label>Início das Aulas</label>
      <span>${formatarData(turma.data_inicio)}</span>
    </div>
    <div class="info-box">
      <label>Total de Alunos</label>
      <span>${matriculas.length} alunos</span>
    </div>
  </div>

  <!-- RESUMO DE FREQUÊNCIA -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
    <div style="background:#d8f3dc;border:1.5px solid #40916c;border-radius:8px;padding:10px 14px;text-align:center;">
      <div style="font-size:22px;font-weight:900;color:#1b4332;">${matriculasOrdenadas.reduce((t, m) => t + aulas.filter(a => frequencias.find(f => f.matricula_id === m.id && f.aula_id === a.id && f.status === 'presente')).length, 0)}</div>
      <div style="font-size:10px;font-weight:700;color:#1b4332;text-transform:uppercase;letter-spacing:1px;">Presenças (P)</div>
    </div>
    <div style="background:#fee2e2;border:1.5px solid #f87171;border-radius:8px;padding:10px 14px;text-align:center;">
      <div style="font-size:22px;font-weight:900;color:#9b1c1c;">${matriculasOrdenadas.reduce((t, m) => t + aulas.filter(a => frequencias.find(f => f.matricula_id === m.id && f.aula_id === a.id && f.status === 'falta')).length, 0)}</div>
      <div style="font-size:10px;font-weight:700;color:#9b1c1c;text-transform:uppercase;letter-spacing:1px;">Faltas (F)</div>
    </div>
    <div style="background:#fef3c7;border:1.5px solid #fcd34d;border-radius:8px;padding:10px 14px;text-align:center;">
      <div style="font-size:22px;font-weight:900;color:#92400e;">${matriculasOrdenadas.reduce((t, m) => t + aulas.filter(a => frequencias.find(f => f.matricula_id === m.id && f.aula_id === a.id && f.status === 'falta_justificada')).length, 0)}</div>
      <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">Justificadas (FJ)</div>
    </div>
    <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;text-align:center;">
      <div style="font-size:22px;font-weight:900;color:#9b1c1c;">${matriculasOrdenadas.filter(m => frequencias.filter(f => f.matricula_id === m.id && f.status === 'falta').length >= 4).length}</div>
      <div style="font-size:10px;font-weight:700;color:#9b1c1c;text-transform:uppercase;letter-spacing:1px;">⚠️ Reprovados</div>
    </div>
  </div>

  <!-- LEGENDA -->
  <div class="legenda">
    <div class="legenda-item"><span class="cel-presente">P</span> = Presente</div>
    <div class="legenda-item"><span class="cel-falta">F</span> = Falta</div>
    <div class="legenda-item"><span class="cel-justificada">FJ</span> = Justificada</div>
    <div class="legenda-item">— = Sem registro</div>
    <div style="margin-left:auto;color:#9b1c1c;font-weight:700;">⚠️ Reprovação: 4 ou mais faltas (F)</div>
  </div>

  <!-- TABELA DIÁRIO -->
  <div class="diario-title">📋 Registro de Frequência</div>
  <table>
    <thead>
      <tr>
        <th>Aluno</th>
        ${aulasOrdenadas.map(a => `<th>Aula ${a.numero}</th>`).join('')}
        <th>Faltas</th>
        <th>Situação</th>
      </tr>
      <tr>
        <th>Matrícula</th>
        ${aulasOrdenadas.map(a => `<th>${formatarData(a.data)}</th>`).join('')}
        <th>F / J</th>
        <th>Final</th>
      </tr>
    </thead>
    <tbody>
      ${matriculasOrdenadas.map(m => {
        const faltas = getStatus ? aulas.filter(a => getStatus(m.id, a.id) === 'falta').length : 0
        const reprovado = faltas >= 4
        return `
        <tr>
          <td>
            <div style="font-weight:700;">${m.aluno?.nome || '—'}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              <span style="font-size:9px;color:#888;font-family:monospace;">${m.aluno?.matricula || ''}</span>
              ${m.aluno?.equipe ? `<span style="font-size:8px;font-weight:700;background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:8px;letter-spacing:0.3px;">${m.aluno.equipe}</span>` : ''}
            </div>
          </td>
          ${aulasOrdenadas.map(a => {
            const st = frequencias.find(f => f.matricula_id === m.id && f.aula_id === a.id)?.status
            if (st === 'presente') return `<td><span class="cel-presente">P</span></td>`
            if (st === 'falta') return `<td><span class="cel-falta">F</span></td>`
            if (st === 'falta_justificada') return `<td><span class="cel-justificada">FJ</span></td>`
            return `<td><span class="sem-reg">—</span></td>`
          }).join('')}
          <td class="faltas-col ${faltas >= 4 ? 'faltas-reprovado' : faltas >= 3 ? 'faltas-risco' : 'faltas-ok'}">${faltas}</td>
          <td>${reprovado
            ? `<span class="status-reprovado">Reprovado</span>`
            : `<span class="status-aprovado">Regular</span>`
          }</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>

  <!-- ASSINATURAS -->
  <div class="assinaturas">
    <div class="assinatura-box">
      <div class="ass-linha">Professor(a) Responsável</div>
      <div class="ass-cargo">Escola de Líderes — Módulo ${turma.modulo}</div>
    </div>
    <div class="assinatura-box">
      <div class="ass-linha">Coordenação da Escola de Líderes</div>
      <div class="ass-cargo">Comunidade Por Amor</div>
    </div>
  </div>

  <!-- RODAPÉ -->
  <div class="rodape">
    Escola de Líderes — Comunidade Por Amor &nbsp;|&nbsp;
    Impresso em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} &nbsp;|&nbsp;
    Turma: ${turma.nome}
  </div>

</div>
</body>
</html>`
  }

  function imprimir() {
    const html = gerarHTML()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) { alert('Permita pop-ups para imprimir.'); return }
    win.onload = () => { win.focus(); win.print() }
    setTimeout(() => URL.revokeObjectURL(url), 15000)
  }

  return (
    <button className="btn btn-secondary" onClick={imprimir}>
      🖨️ Imprimir Diário
    </button>
  )
}
