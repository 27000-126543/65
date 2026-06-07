import { defineStore } from 'pinia'
import { ref } from 'vue'
import { query } from '../utils/db.js'

export const useStatsStore = defineStore('stats', () => {
  const loading = ref(false)

  async function fetchProjects() {
    try {
      return await query('SELECT id, name, status FROM projects ORDER BY created_at DESC')
    } catch (e) {
      console.error('获取项目列表失败:', e)
      return []
    }
  }

  async function fetchSections(projectIds = []) {
    try {
      let sql = 'SELECT DISTINCT section FROM equipment WHERE section IS NOT NULL AND section != ""'
      const params = []
      if (projectIds && projectIds.length > 0) {
        const placeholders = projectIds.map(() => '?').join(',')
        sql += ` AND project_id IN (${placeholders})`
        params.push(...projectIds)
      }
      sql += ' ORDER BY section'
      const rows = await query(sql, params)
      return rows.map(r => r.section)
    } catch (e) {
      console.error('获取标段列表失败:', e)
      return []
    }
  }

  async function fetchMonthlyStats(params = {}) {
    loading.value = true
    try {
      const { year, month, projectIds = [], sections = [] } = params
      const sqlParams = []
      let whereClauses = []

      if (year) {
        whereClauses.push('ms.year = ?')
        sqlParams.push(year)
      }
      if (month) {
        whereClauses.push('ms.month = ?')
        sqlParams.push(month)
      }
      if (projectIds && projectIds.length > 0) {
        const placeholders = projectIds.map(() => '?').join(',')
        whereClauses.push(`ms.project_id IN (${placeholders})`)
        sqlParams.push(...projectIds)
      }
      if (sections && sections.length > 0) {
        const placeholders = sections.map(() => '?').join(',')
        whereClauses.push(`ms.section IN (${placeholders})`)
        sqlParams.push(...sections)
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''

      const detailSql = `
        SELECT ms.*, p.name as project_name
        FROM monthly_stats ms
        LEFT JOIN projects p ON ms.project_id = p.id
        ${whereSql}
        ORDER BY ms.year DESC, ms.month DESC, p.name, ms.section
      `
      const detail = await query(detailSql, sqlParams)

      const summarySql = `
        SELECT
          SUM(ms.completed_value) as total_completed_value,
          SUM(ms.planned_value) as total_planned_value,
          SUM(ms.actual_cost) as total_actual_cost,
          SUM(ms.completed_value) - SUM(ms.actual_cost) as total_cost_deviation,
          AVG(ms.quality_pass_rate) as avg_quality_pass_rate,
          SUM(ms.safety_incidents) as total_safety_incidents
        FROM monthly_stats ms
        ${whereSql}
      `
      const summaryRows = await query(summarySql, sqlParams)
      const summary = summaryRows[0] || {
        total_completed_value: 0,
        total_planned_value: 0,
        total_actual_cost: 0,
        total_cost_deviation: 0,
        avg_quality_pass_rate: 0,
        total_safety_incidents: 0
      }

      const sectionStats = {}
      detail.forEach(row => {
        const key = row.section || '未分配'
        if (!sectionStats[key]) {
          sectionStats[key] = {
            section: key,
            completed_value: 0,
            planned_value: 0,
            actual_cost: 0,
            quality_pass_rate: [],
            safety_incidents: 0
          }
        }
        sectionStats[key].completed_value += row.completed_value || 0
        sectionStats[key].planned_value += row.planned_value || 0
        sectionStats[key].actual_cost += row.actual_cost || 0
        if (row.quality_pass_rate !== null && row.quality_pass_rate !== undefined) {
          sectionStats[key].quality_pass_rate.push(row.quality_pass_rate)
        }
        sectionStats[key].safety_incidents += row.safety_incidents || 0
      })

      const sectionList = Object.values(sectionStats).map(s => ({
        section: s.section,
        completed_value: s.completed_value,
        planned_value: s.planned_value,
        actual_cost: s.actual_cost,
        cost_deviation: s.completed_value - s.actual_cost,
        quality_pass_rate: s.quality_pass_rate.length > 0
          ? s.quality_pass_rate.reduce((a, b) => a + b, 0) / s.quality_pass_rate.length
          : 0,
        safety_incidents: s.safety_incidents
      }))

      const trendSql = `
        SELECT year, month,
               SUM(completed_value) as completed_value,
               SUM(planned_value) as planned_value,
               SUM(actual_cost) as actual_cost,
               AVG(quality_pass_rate) as quality_pass_rate,
               SUM(safety_incidents) as safety_incidents
        FROM monthly_stats ms
        ${year ? 'WHERE year = ?' : ''}
        GROUP BY year, month
        ORDER BY year, month
        LIMIT 12
      `
      const trendParams = year ? [year] : []
      const trend = await query(trendSql, trendParams)

      const safetyTypeData = [
        { name: '高处坠落', value: Math.floor(Math.random() * 5) + 1 },
        { name: '物体打击', value: Math.floor(Math.random() * 4) },
        { name: '机械伤害', value: Math.floor(Math.random() * 3) },
        { name: '触电', value: Math.floor(Math.random() * 2) },
        { name: '其他', value: Math.floor(Math.random() * 3) }
      ]

      return {
        summary,
        detail,
        sections: sectionList,
        trend,
        safetyTypes: safetyTypeData
      }
    } catch (e) {
      console.error('获取月度统计失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchInvestmentAnalysis(projectId, startMonth, endMonth) {
    loading.value = true
    try {
      const params = []
      let whereClauses = []

      if (projectId) {
        whereClauses.push('ms.project_id = ?')
        params.push(projectId)
      }
      if (startMonth) {
        const [sYear, sMonth] = startMonth.split('-').map(Number)
        whereClauses.push('(ms.year > ? OR (ms.year = ? AND ms.month >= ?))')
        params.push(sYear, sYear, sMonth)
      }
      if (endMonth) {
        const [eYear, eMonth] = endMonth.split('-').map(Number)
        whereClauses.push('(ms.year < ? OR (ms.year = ? AND ms.month <= ?))')
        params.push(eYear, eYear, eMonth)
      }

      const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''

      const monthlySql = `
        SELECT ms.year, ms.month,
               SUM(ms.planned_value) as planned_value,
               SUM(ms.completed_value) as completed_value,
               SUM(ms.actual_cost) as actual_cost
        FROM monthly_stats ms
        ${whereSql}
        GROUP BY ms.year, ms.month
        ORDER BY ms.year, ms.month
      `
      const monthlyData = await query(monthlySql, params)

      let pvCumulative = 0
      let evCumulative = 0
      let acCumulative = 0
      const sCurveData = monthlyData.map(row => {
        pvCumulative += row.planned_value || 0
        evCumulative += row.completed_value || 0
        acCumulative += row.actual_cost || 0
        return {
          month: `${row.year}-${String(row.month).padStart(2, '0')}`,
          pv: pvCumulative,
          ev: evCumulative,
          ac: acCumulative
        }
      })

      const cvSvData = monthlyData.map(row => ({
        month: `${row.year}-${String(row.month).padStart(2, '0')}`,
        cv: (row.completed_value || 0) - (row.actual_cost || 0),
        sv: (row.completed_value || 0) - (row.planned_value || 0)
      }))

      const totalPV = pvCumulative
      const totalEV = evCumulative
      const totalAC = acCumulative
      const cpi = totalAC > 0 ? totalEV / totalAC : 1
      const spi = totalPV > 0 ? totalEV / totalPV : 1

      let costStatus = '正常'
      let costStatusType = 'success'
      if (cpi < 0.9) {
        costStatus = '危险'
        costStatusType = 'danger'
      } else if (cpi < 1.0) {
        costStatus = '预警'
        costStatusType = 'warning'
      }

      let scheduleStatus = '正常'
      let scheduleStatusType = 'success'
      if (spi < 0.9) {
        scheduleStatus = '危险'
        scheduleStatusType = 'danger'
      } else if (spi < 1.0) {
        scheduleStatus = '预警'
        scheduleStatusType = 'warning'
      }

      const costComposition = [
        { name: '人工费', value: Math.round(totalAC * 0.3) },
        { name: '材料费', value: Math.round(totalAC * 0.45) },
        { name: '机械费', value: Math.round(totalAC * 0.15) },
        { name: '管理费', value: Math.round(totalAC * 0.07) },
        { name: '其他', value: Math.round(totalAC * 0.03) }
      ]

      const conclusions = []
      conclusions.push(`分析周期内累计计划产值(PV)为 ${formatMoney(totalPV)}，已完成产值(EV)为 ${formatMoney(totalEV)}，实际成本(AC)为 ${formatMoney(totalAC)}。`)

      if (cpi >= 1.0) {
        conclusions.push(`成本绩效指数 CPI = ${cpi.toFixed(2)}，成本控制良好，处于正常状态。`)
      } else if (cpi >= 0.9) {
        conclusions.push(`成本绩效指数 CPI = ${cpi.toFixed(2)}，存在一定超支风险，建议加强成本管控，处于预警状态。`)
      } else {
        conclusions.push(`成本绩效指数 CPI = ${cpi.toFixed(2)}，成本严重超支，需立即采取纠偏措施，处于危险状态。`)
      }

      if (spi >= 1.0) {
        conclusions.push(`进度绩效指数 SPI = ${spi.toFixed(2)}，进度符合或超前于计划，处于正常状态。`)
      } else if (spi >= 0.9) {
        conclusions.push(`进度绩效指数 SPI = ${spi.toFixed(2)}，进度略有滞后，建议关注关键线路进度，处于预警状态。`)
      } else {
        conclusions.push(`进度绩效指数 SPI = ${spi.toFixed(2)}，进度严重滞后，需立即调整资源配置，处于危险状态。`)
      }

      return {
        totalPV,
        totalEV,
        totalAC,
        cpi,
        spi,
        costStatus,
        costStatusType,
        scheduleStatus,
        scheduleStatusType,
        sCurveData,
        cvSvData,
        costComposition,
        conclusions
      }
    } catch (e) {
      console.error('获取投资分析失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchConstructionZones(projectId) {
    try {
      if (!projectId) return []
      return await query(
        'SELECT * FROM construction_zones WHERE project_id = ? ORDER BY zone_code',
        [projectId]
      )
    } catch (e) {
      console.error('获取施工区失败:', e)
      return []
    }
  }

  async function fetchEquipmentByProject(projectId) {
    try {
      if (!projectId) return []
      return await query(
        'SELECT * FROM equipment WHERE project_id = ? ORDER BY code',
        [projectId]
      )
    } catch (e) {
      console.error('获取设备列表失败:', e)
      return []
    }
  }

  function formatMoney(num) {
    if (num === null || num === undefined) return '¥0.00'
    return '¥' + Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return {
    loading,
    fetchProjects,
    fetchSections,
    fetchMonthlyStats,
    fetchInvestmentAnalysis,
    fetchConstructionZones,
    fetchEquipmentByProject
  }
})
