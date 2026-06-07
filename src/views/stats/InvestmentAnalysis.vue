<template>
  <div class="investment-analysis">
    <div class="page-card mb-16">
      <div class="page-header">
        <h2>投资偏差分析</h2>
      </div>

      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="项目">
          <el-select v-model="filters.projectId" placeholder="全部项目" clearable style="width: 260px" @change="loadData">
            <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始月份">
          <el-date-picker
            v-model="filters.startMonth"
            type="month"
            placeholder="选择开始月份"
            value-format="YYYY-MM"
            style="width: 160px"
            @change="loadData"
          />
        </el-form-item>
        <el-form-item label="结束月份">
          <el-date-picker
            v-model="filters.endMonth"
            type="month"
            placeholder="选择结束月份"
            value-format="YYYY-MM"
            style="width: 160px"
            @change="loadData"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadData">分析</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-row :gutter="16" class="stat-row mb-16">
      <el-col :span="5">
        <div class="stat-card stat-card-blue">
          <div class="stat-label">总投资(PV)</div>
          <div class="stat-value">{{ formatMoney(analysis.totalPV) }}</div>
        </div>
      </el-col>
      <el-col :span="5">
        <div class="stat-card stat-card-green">
          <div class="stat-label">已完成产值(EV)</div>
          <div class="stat-value">{{ formatMoney(analysis.totalEV) }}</div>
        </div>
      </el-col>
      <el-col :span="5">
        <div class="stat-card stat-card-orange">
          <div class="stat-label">已发生成本(AC)</div>
          <div class="stat-value">{{ formatMoney(analysis.totalAC) }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card" :class="costStatusClass">
          <div class="stat-label">
            CPI 成本绩效指数
            <el-tag size="small" :type="analysis.costStatusType" effect="light" style="margin-left: 6px">{{ analysis.costStatus }}</el-tag>
          </div>
          <div class="stat-value">{{ analysis.cpi.toFixed(2) }}</div>
        </div>
      </el-col>
      <el-col :span="5">
        <div class="stat-card" :class="scheduleStatusClass">
          <div class="stat-label">
            SPI 进度绩效指数
            <el-tag size="small" :type="analysis.scheduleStatusType" effect="light" style="margin-left: 6px">{{ analysis.scheduleStatus }}</el-tag>
          </div>
          <div class="stat-value">{{ analysis.spi.toFixed(2) }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row mb-16">
      <el-col :span="16">
        <div class="page-card">
          <div class="section-title">累计 S 曲线 (PV / EV / AC)</div>
          <div ref="sCurveChartRef" class="chart-box-lg"></div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="page-card">
          <div class="section-title">成本构成分析</div>
          <div ref="costPieChartRef" class="chart-box-lg"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row mb-16">
      <el-col :span="24">
        <div class="page-card">
          <div class="section-title">月度投资偏差 (CV = EV-AC, SV = EV-PV)</div>
          <div ref="deviationChartRef" class="chart-box-md"></div>
        </div>
      </el-col>
    </el-row>

    <div class="page-card">
      <div class="section-title">分析结论</div>
      <div class="conclusion-box">
        <div v-for="(c, idx) in analysis.conclusions" :key="idx" class="conclusion-item">
          <el-icon class="conclusion-icon" color="#409eff"><InfoFilled /></el-icon>
          <span>{{ c }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { Search, Refresh, InfoFilled } from '@element-plus/icons-vue'
import { formatMoney } from '../../utils/helpers'
import { useStatsStore } from '../../stores/stats'

const statsStore = useStatsStore()

const projectList = ref([])

const filters = reactive({
  projectId: null,
  startMonth: '',
  endMonth: ''
})

const analysis = reactive({
  totalPV: 0,
  totalEV: 0,
  totalAC: 0,
  cpi: 1,
  spi: 1,
  costStatus: '正常',
  costStatusType: 'success',
  scheduleStatus: '正常',
  scheduleStatusType: 'success',
  sCurveData: [],
  cvSvData: [],
  costComposition: [],
  conclusions: []
})

const costStatusClass = computed(() => {
  if (analysis.costStatusType === 'danger') return 'stat-card-danger'
  if (analysis.costStatusType === 'warning') return 'stat-card-orange'
  return 'stat-card-success'
})

const scheduleStatusClass = computed(() => {
  if (analysis.scheduleStatusType === 'danger') return 'stat-card-danger'
  if (analysis.scheduleStatusType === 'warning') return 'stat-card-orange'
  return 'stat-card-success'
})

const sCurveChartRef = ref(null)
const deviationChartRef = ref(null)
const costPieChartRef = ref(null)
let sCurveChart = null
let deviationChart = null
let costPieChart = null

const loadProjects = async () => {
  projectList.value = await statsStore.fetchProjects()
}

const loadData = async () => {
  try {
    const data = await statsStore.fetchInvestmentAnalysis(
      filters.projectId,
      filters.startMonth,
      filters.endMonth
    )
    Object.assign(analysis, data)
    await nextTick()
    initCharts()
  } catch (e) {
    console.error(e)
  }
}

const handleReset = () => {
  filters.projectId = null
  filters.startMonth = ''
  filters.endMonth = ''
  loadData()
}

const initSCurveChart = () => {
  if (!sCurveChartRef.value) return
  if (!sCurveChart) sCurveChart = echarts.init(sCurveChartRef.value)
  const months = analysis.sCurveData.map(d => d.month)
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let html = params[0].axisValue + '<br/>'
        params.forEach(p => {
          html += `${p.marker} ${p.seriesName}: ${formatMoney(p.value)}<br/>`
        })
        return html
      }
    },
    legend: { data: ['计划值 PV', '挣值 EV', '实际成本 AC'], bottom: 0 },
    grid: { left: 70, right: 30, top: 30, bottom: 50 },
    xAxis: { type: 'category', data: months, axisLabel: { fontSize: 11 }, boundaryGap: false },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        formatter: (v) => {
          if (v >= 100000000) return (v / 100000000).toFixed(2) + '亿'
          if (v >= 10000) return (v / 10000).toFixed(0) + '万'
          return v
        }
      }
    },
    series: [
      {
        name: '计划值 PV',
        type: 'line',
        data: analysis.sCurveData.map(d => d.pv),
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#909399' },
        lineStyle: { width: 2.5, color: '#909399', type: 'dashed' }
      },
      {
        name: '挣值 EV',
        type: 'line',
        data: analysis.sCurveData.map(d => d.ev),
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#67c23a' },
        lineStyle: { width: 2.5, color: '#67c23a' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(103,194,58,0.2)' },
            { offset: 1, color: 'rgba(103,194,58,0.01)' }
          ])
        }
      },
      {
        name: '实际成本 AC',
        type: 'line',
        data: analysis.sCurveData.map(d => d.ac),
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#f56c6c' },
        lineStyle: { width: 2.5, color: '#f56c6c' }
      }
    ]
  }
  sCurveChart.setOption(option)
}

const initDeviationChart = () => {
  if (!deviationChartRef.value) return
  if (!deviationChart) deviationChart = echarts.init(deviationChartRef.value)
  const months = analysis.cvSvData.map(d => d.month)
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        let html = params[0].axisValue + '<br/>'
        params.forEach(p => {
          html += `${p.marker} ${p.seriesName}: ${formatMoney(p.value)}<br/>`
        })
        return html
      }
    },
    legend: { data: ['成本偏差 CV', '进度偏差 SV'], bottom: 0 },
    grid: { left: 70, right: 30, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: months, axisLabel: { fontSize: 11 } },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        formatter: (v) => {
          if (v >= 10000) return (v / 10000).toFixed(0) + '万'
          return v
        }
      }
    },
    series: [
      {
        name: '成本偏差 CV',
        type: 'bar',
        data: analysis.cvSvData.map(d => d.cv),
        itemStyle: {
          color: (params) => params.value >= 0 ? '#67c23a' : '#f56c6c',
          borderRadius: [3, 3, 0, 0]
        },
        barWidth: 22
      },
      {
        name: '进度偏差 SV',
        type: 'bar',
        data: analysis.cvSvData.map(d => d.sv),
        itemStyle: {
          color: (params) => params.value >= 0 ? '#409eff' : '#e6a23c',
          borderRadius: [3, 3, 0, 0]
        },
        barWidth: 22
      }
    ]
  }
  deviationChart.setOption(option)
}

const initCostPieChart = () => {
  if (!costPieChartRef.value) return
  if (!costPieChart) costPieChart = echarts.init(costPieChartRef.value)
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}元 ({d}%)' },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { show: true, fontSize: 11, formatter: '{b}\n{d}%' },
      labelLine: { length: 8, length2: 6 },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: analysis.costComposition,
      color: ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399']
    }]
  }
  costPieChart.setOption(option)
}

const initCharts = () => {
  initSCurveChart()
  initDeviationChart()
  initCostPieChart()
}

const handleResize = () => {
  sCurveChart?.resize()
  deviationChart?.resize()
  costPieChart?.resize()
}

onMounted(async () => {
  await loadProjects()
  await loadData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  sCurveChart?.dispose()
  deviationChart?.dispose()
  costPieChart?.dispose()
})
</script>

<style scoped>
.investment-analysis {
  width: 100%;
}
.filter-form {
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
}
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 18px;
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
.stat-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}
.chart-box-lg {
  width: 100%;
  height: 340px;
}
.chart-box-md {
  width: 100%;
  height: 280px;
}
.conclusion-box {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 16px 20px;
}
.conclusion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  color: #374151;
  line-height: 1.7;
}
.conclusion-icon {
  flex-shrink: 0;
  margin-top: 3px;
}
</style>
