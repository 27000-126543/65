<template>
  <div class="monthly-report">
    <div class="page-card mb-16">
      <div class="page-header">
        <h2>月度综合报表</h2>
        <el-button type="primary" :icon="Download" @click="handleExport" :loading="exporting">导出月度报表</el-button>
      </div>

      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="年份">
          <el-select v-model="filters.year" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="y in yearOptions" :key="y" :label="y + '年'" :value="y" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份">
          <el-select v-model="filters.month" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="m in 12" :key="m" :label="m + '月'" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目">
          <el-select v-model="filters.projectIds" multiple placeholder="全部" collapse-tags collapse-tags-tooltip style="width: 220px">
            <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标段">
          <el-select v-model="filters.sections" multiple placeholder="全部" collapse-tags collapse-tags-tooltip style="width: 220px">
            <el-option v-for="s in sectionOptions" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadData">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-row :gutter="16" class="stat-row mb-16">
      <el-col :span="4">
        <div class="stat-card stat-card-blue">
          <div class="stat-label">本月完成产值</div>
          <div class="stat-value">{{ formatMoney(stats.summary.total_completed_value) }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card stat-card-green">
          <div class="stat-label">计划产值</div>
          <div class="stat-value">{{ formatMoney(stats.summary.total_planned_value) }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card stat-card-orange">
          <div class="stat-label">实际成本</div>
          <div class="stat-value">{{ formatMoney(stats.summary.total_actual_cost) }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card" :class="stats.summary.total_cost_deviation >= 0 ? 'stat-card-success' : 'stat-card-danger'">
          <div class="stat-label">成本偏差</div>
          <div class="stat-value">{{ formatMoney(stats.summary.total_cost_deviation) }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card stat-card-purple">
          <div class="stat-label">质量合格率</div>
          <div class="stat-value">{{ formatPercent(stats.summary.avg_quality_pass_rate) }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card stat-card-red">
          <div class="stat-label">安全事件数</div>
          <div class="stat-value">{{ stats.summary.total_safety_incidents }} 起</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row mb-16">
      <el-col :span="12">
        <div class="page-card">
          <div class="section-title">完成产值 vs 计划产值</div>
          <div ref="barChartRef" class="chart-box"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="page-card">
          <div class="section-title">成本偏差趋势</div>
          <div ref="lineChartRef" class="chart-box"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row mb-16">
      <el-col :span="12">
        <div class="page-card">
          <div class="section-title">各标段质量合格率</div>
          <div ref="radarChartRef" class="chart-box"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="page-card">
          <div class="section-title">安全事件类型分布</div>
          <div ref="pieChartRef" class="chart-box"></div>
        </div>
      </el-col>
    </el-row>

    <div class="page-card">
      <div class="section-title">标段统计明细</div>
      <el-table :data="stats.sections" stripe style="width: 100%">
        <el-table-column prop="section" label="标段" width="140" />
        <el-table-column label="完成产值" width="160">
          <template #default="{ row }">{{ formatMoney(row.completed_value) }}</template>
        </el-table-column>
        <el-table-column label="计划产值" width="160">
          <template #default="{ row }">{{ formatMoney(row.planned_value) }}</template>
        </el-table-column>
        <el-table-column label="实际成本" width="160">
          <template #default="{ row }">{{ formatMoney(row.actual_cost) }}</template>
        </el-table-column>
        <el-table-column label="成本偏差" width="160">
          <template #default="{ row }">
            <span :style="{ color: row.cost_deviation >= 0 ? '#67c23a' : '#f56c6c' }">
              {{ formatMoney(row.cost_deviation) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="质量合格率" width="140">
          <template #default="{ row }">
            <el-progress :percentage="Number(row.quality_pass_rate.toFixed(1))" :stroke-width="8" />
          </template>
        </el-table-column>
        <el-table-column label="安全事件数" width="120">
          <template #default="{ row }">
            <el-tag :type="row.safety_incidents > 0 ? 'danger' : 'success'" effect="light">
              {{ row.safety_incidents }} 起
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'
import { Download, Search, Refresh } from '@element-plus/icons-vue'
import { formatMoney, formatPercent } from '../../utils/helpers'
import { showSaveDialog, writeFile } from '../../utils/db'
import { useStatsStore } from '../../stores/stats'

const statsStore = useStatsStore()

const exporting = ref(false)
const projectList = ref([])
const sectionOptions = ref([])
const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

const filters = reactive({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  projectIds: [],
  sections: []
})

const stats = reactive({
  summary: {
    total_completed_value: 0,
    total_planned_value: 0,
    total_actual_cost: 0,
    total_cost_deviation: 0,
    avg_quality_pass_rate: 0,
    total_safety_incidents: 0
  },
  sections: [],
  trend: [],
  safetyTypes: []
})

const barChartRef = ref(null)
const lineChartRef = ref(null)
const radarChartRef = ref(null)
const pieChartRef = ref(null)
let barChart = null
let lineChart = null
let radarChart = null
let pieChart = null

const loadProjects = async () => {
  projectList.value = await statsStore.fetchProjects()
}

const loadSections = async () => {
  sectionOptions.value = await statsStore.fetchSections(filters.projectIds)
}

const loadData = async () => {
  try {
    const data = await statsStore.fetchMonthlyStats({
      year: filters.year,
      month: filters.month,
      projectIds: filters.projectIds,
      sections: filters.sections
    })
    Object.assign(stats.summary, data.summary)
    stats.sections = data.sections
    stats.trend = data.trend
    stats.safetyTypes = data.safetyTypes
    await nextTick()
    initCharts()
  } catch (e) {
    ElMessage.error('加载统计数据失败')
  }
}

const handleReset = () => {
  filters.year = new Date().getFullYear()
  filters.month = new Date().getMonth() + 1
  filters.projectIds = []
  filters.sections = []
  loadSections()
  loadData()
}

const initBarChart = () => {
  if (!barChartRef.value) return
  if (!barChart) barChart = echarts.init(barChartRef.value)
  const months = stats.trend.map(t => `${t.month}月`)
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['完成产值', '计划产值'], bottom: 0 },
    grid: { left: 60, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: months, axisLabel: { fontSize: 11 } },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        formatter: (v) => v >= 10000 ? (v / 10000).toFixed(0) + '万' : v
      }
    },
    series: [
      {
        name: '完成产值',
        type: 'bar',
        data: stats.trend.map(t => t.completed_value),
        itemStyle: { color: '#409eff', borderRadius: [3, 3, 0, 0] },
        barWidth: 18
      },
      {
        name: '计划产值',
        type: 'bar',
        data: stats.trend.map(t => t.planned_value),
        itemStyle: { color: '#67c23a', borderRadius: [3, 3, 0, 0] },
        barWidth: 18
      }
    ]
  }
  barChart.setOption(option)
}

const initLineChart = () => {
  if (!lineChartRef.value) return
  if (!lineChart) lineChart = echarts.init(lineChartRef.value)
  const months = stats.trend.map(t => `${t.month}月`)
  const deviations = stats.trend.map(t => (t.completed_value || 0) - (t.actual_cost || 0))
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        return `${p.axisValue}<br/>成本偏差: ${formatMoney(p.value)}`
      }
    },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: months, axisLabel: { fontSize: 11 }, boundaryGap: false },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        formatter: (v) => v >= 10000 ? (v / 10000).toFixed(0) + '万' : v
      }
    },
    series: [{
      type: 'line',
      data: deviations,
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: { color: '#e6a23c' },
      lineStyle: { width: 3, color: '#e6a23c' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(230,162,60,0.25)' },
          { offset: 1, color: 'rgba(230,162,60,0.02)' }
        ])
      },
      markLine: {
        symbol: 'none',
        data: [{ yAxis: 0, lineStyle: { color: '#f56c6c', type: 'dashed' } }]
      }
    }]
  }
  lineChart.setOption(option)
}

const initRadarChart = () => {
  if (!radarChartRef.value) return
  if (!radarChart) radarChart = echarts.init(radarChartRef.value)
  const indicators = stats.sections.map(s => ({ name: s.section, max: 100 }))
  const values = stats.sections.map(s => s.quality_pass_rate)
  const option = {
    tooltip: {},
    radar: {
      indicator: indicators.length > 0 ? indicators : [{ name: '暂无数据', max: 100 }],
      radius: '65%',
      axisName: { fontSize: 11, color: '#606266' },
      splitArea: { areaStyle: { color: ['rgba(103,194,58,0.05)', 'rgba(64,158,255,0.05)'] } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: values.length > 0 ? values : [0],
        name: '质量合格率',
        areaStyle: { color: 'rgba(103,194,58,0.3)' },
        lineStyle: { color: '#67c23a', width: 2 },
        itemStyle: { color: '#67c23a' }
      }]
    }]
  }
  radarChart.setOption(option)
}

const initPieChart = () => {
  if (!pieChartRef.value) return
  if (!pieChart) pieChart = echarts.init(pieChartRef.value)
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}起 ({d}%)' },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['38%', '62%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: stats.safetyTypes,
      color: ['#f56c6c', '#e6a23c', '#409eff', '#67c23a', '#909399']
    }]
  }
  pieChart.setOption(option)
}

const initCharts = () => {
  initBarChart()
  initLineChart()
  initRadarChart()
  initPieChart()
}

const handleResize = () => {
  barChart?.resize()
  lineChart?.resize()
  radarChart?.resize()
  pieChart?.resize()
}

const handleExport = async () => {
  exporting.value = true
  try {
    const defaultName = `月度报表_${filters.year || '全部'}${filters.month ? String(filters.month).padStart(2, '0') : ''}.xlsx`
    const result = await showSaveDialog({
      title: '保存月度报表',
      defaultPath: defaultName,
      filters: [{ name: 'Excel文件', extensions: ['xlsx'] }]
    })

    if (result.canceled || !result.filePath) {
      exporting.value = false
      return
    }

    const wb = XLSX.utils.book_new()

    const overviewData = [
      ['指标', '数值'],
      ['本月完成产值', stats.summary.total_completed_value],
      ['计划产值', stats.summary.total_planned_value],
      ['实际成本', stats.summary.total_actual_cost],
      ['成本偏差', stats.summary.total_cost_deviation],
      ['质量合格率(%)', stats.summary.avg_quality_pass_rate],
      ['安全事件数(起)', stats.summary.total_safety_incidents]
    ]
    const ws1 = XLSX.utils.json_to_sheet(overviewData, { skipHeader: true })
    XLSX.utils.book_append_sheet(wb, ws1, '综合概览')

    const产值Data = [
      ['标段', '完成产值', '计划产值', '实际成本', '成本偏差']
    ]
    stats.sections.forEach(s => {
      产值Data.push([s.section, s.completed_value, s.planned_value, s.actual_cost, s.cost_deviation])
    })
    const ws2 = XLSX.utils.json_to_sheet(产值Data, { skipHeader: true })
    XLSX.utils.book_append_sheet(wb, ws2, '产值统计')

    const qualityData = [['标段', '质量合格率(%)']]
    stats.sections.forEach(s => {
      qualityData.push([s.section, s.quality_pass_rate.toFixed(2)])
    })
    const ws3 = XLSX.utils.json_to_sheet(qualityData, { skipHeader: true })
    XLSX.utils.book_append_sheet(wb, ws3, '质量统计')

    const safetyData = [['事件类型', '数量(起)']]
    stats.safetyTypes.forEach(s => {
      safetyData.push([s.name, s.value])
    })
    stats.sections.forEach(s => {
      safetyData.push([`${s.section}-合计`, s.safety_incidents])
    })
    const ws4 = XLSX.utils.json_to_sheet(safetyData, { skipHeader: true })
    XLSX.utils.book_append_sheet(wb, ws4, '安全统计')

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    await writeFile(result.filePath, wbout, { buffer: true })
    ElMessage.success('导出成功')
  } catch (e) {
    console.error(e)
    ElMessage.error('导出失败: ' + e.message)
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  await loadProjects()
  await loadSections()
  await loadData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  barChart?.dispose()
  lineChart?.dispose()
  radarChart?.dispose()
  pieChart?.dispose()
})
</script>

<style scoped>
.monthly-report {
  width: 100%;
}
.filter-form {
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
}
.stat-row { }
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
}
.stat-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}
.stat-card-blue::before { background: #409eff; }
.stat-card-green::before { background: #67c23a; }
.stat-card-orange::before { background: #e6a23c; }
.stat-card-success::before { background: #67c23a; }
.stat-card-danger::before { background: #f56c6c; }
.stat-card-purple::before { background: #909399; }
.stat-card-red::before { background: #f56c6c; }
.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}
.chart-box {
  width: 100%;
  height: 300px;
}
</style>
