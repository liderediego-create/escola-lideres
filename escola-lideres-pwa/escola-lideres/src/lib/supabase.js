import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lcrykgaukxkdshsebtag.supabase.co'
const SUPABASE_KEY = 'sb_publishable_E2gHtk4jEs7Rl-5K1uhhNw_k3FJDkqP'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Cores por módulo
export const COR_MODULO = {
  1: { primary: '#2d6a4f', light: '#d8f3dc', accent: '#40916c', text: '#1b4332', badge: '#b7e4c7' },
  2: { primary: '#9b2226', light: '#f8d7da', accent: '#ae2012', text: '#6a0c0e', badge: '#f5c2c7' },
  3: { primary: '#495057', light: '#e9ecef', accent: '#343a40', text: '#212529', badge: '#ced4da' },
}

// Calcula a aula atual de uma turma baseada na data de início
export function calcularAulaAtual(dataInicio, datasSemAula = []) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  let data = new Date(dataInicio + 'T12:00:00')
  let aulaNum = 0

  while (data <= hoje) {
    const dataStr = data.toISOString().split('T')[0]
    const ehSemAula = datasSemAula.includes(dataStr)
    if (!ehSemAula) aulaNum++
    data.setDate(data.getDate() + 7)
  }
  return Math.max(aulaNum, 1)
}

// Calcula todas as datas de aulas de uma turma
export function calcularDatasAulas(dataInicio, totalAulas = 10, datasSemAula = []) {
  const aulas = []
  let data = new Date(dataInicio + 'T12:00:00')
  let aulaNum = 0

  while (aulaNum < totalAulas) {
    const dataStr = data.toISOString().split('T')[0]
    if (!datasSemAula.includes(dataStr)) {
      aulaNum++
      aulas.push({ numero: aulaNum, data: dataStr })
    }
    data.setDate(data.getDate() + 7)
  }
  return aulas
}

export function formatarData(data) {
  if (!data) return '—'
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')
}
