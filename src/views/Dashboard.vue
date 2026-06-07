<template>
  <div class="dashboard">
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <div class="stat-card stat-card-1">
          <div class="stat-icon"><el-icon :size="36"><OfficeBuilding /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.projectCount }}</div>
            <div class="stat-label">在建项目数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-card-2">
          <div class="stat-icon"><el-icon :size="36"><Money /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ formatMoney(stats.totalInvestment) }}</div>
            <div class="stat-label">总投资（元）</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-card-3">
          <div class="stat-icon"><el-icon :size="36"><Document /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayPurchase }}</div>
            <div class="stat-label">今日采购单</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-card-4">
          <div class="stat-icon"><el-icon :size="36"><Promotion /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pendingApproval }}</div>
            <div class="stat-label">待审批数</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :span="16">
        <el-row :gutter="16">
          <el-col :span="8">
            <div class="page-card">
              <div class="section-title">项目投资分布</div>
              <div ref="pieChartRef" class="chart-small"></div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="page-card">
              <div class="section-title">月度产值</div>
              <div ref="barChartRef" class="chart-small"></div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="page-card">
              <div class="section-title">质量合格率趋势</div>
              <div ref="lineChartRef" class="chart-small"></div>
            </div>
          </el-col>
        </el-row>
        <el-row class="mt-16">
          <el-col :span="24">
            <div class="page-card">
              <div class="section-title">项目状态概览</div>
              <el-table :data="projectList" size="default" style="width: 100%">
                <el-table-column prop="name" label="项目名称" min-width="200">
                  <template #default="{ row }">
                    <el-link type="primary" @click="goDetail(row.id)">{{ row.name }}</el-link>
                  </template>
                </el-table-column>
                <el-table-column prop="type" label="类型" width="120" />
                <el-table-column label="总投资额" width="140">
                  <template #default="{ row }">{{ formatMoney(row.total_investment) }}</template>
                </el-table-column>
                <el-table-column label="计划工期" width="120">
                  <template #default="{ row }">{{ row.contract_days }}天</template>
                </el-table-column>
                <el-table-column label="状态" width="120">
                  <template #default="{ row }">
                    <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="创建时间" width="180">
                  <template #default="{ row }">{{ formatDate(row.created_at, 'YYYY-MM-DD HH:mm') }}</template>
                </el-table-column>
              </el-table>
            </div>
          </el-col>
        </el-row>
      </el-col>
      <el-col :span="8">
        <div class="page-card mb-16">
          <div class="section-title">最新通知</div>
          <div class="notice-list">
            <div v-for="item in noticeList" :key="item.id" class="notice-item">
              <el-badge :is-dot="!item.is_read" class="notice-dot">
                <div class="notice-content">
                  <div class="notice-title">{{ item.title }}</div>
                  <div class="notice-time">{{ formatDate(item.created_at, 'MM-DD HH:mm') }}</div>
                </div>
              </el-badge>
            </div>
            <el-empty v-if="noticeList.length === 0" description="暂无通知" :image-size="60" />
          </div>
        </div>
        <div class="page-card">
          <div class="section-title">设备状态概览</div>
          <div class="equip-list">
            <div class="equip-item">
              <div class="equip-name">运行中</div>
              <div class="equip-count equip-running">{{ equipmentStats.running }}</div>
            </div>
            <div class="equip-item">
              <div class="equip-name">待机</div>
              <div class="equip-count equip-idle">{{ equipmentStats.idle }}</div>
            </div>
            <div class="equip-item">
              <div class="equip-name">维修中</div>
              <div class="equip-count equip-repair">{{ equipmentStats.repair }}</div>
            </div>
            <div class="equip-item">
              <div class="equip-name">故障</div>
              <div class="equip-count equip-fault">{{ equipmentStats.fault }}</div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { formatMoney, formatDate } from '../utils/helpers'
import { query } from '../utils/db'
import { useNotificationStore } from '../stores/notification'

const router = useRouter()
const notificationStore = useNotificationStore()

const stats = reactive({
  projectCount: 0,
  totalInvestment: 0,
  todayPurchase: 0,
  pendingApproval: 0
})
const projectList = ref([])
const noticeList = ref([])
const equipmentStats = reactive({ running: 0, idle: 0, repair: 0, fault: 0 })

const pieChartRef = ref(null)
const barChartRef = ref(null)
const lineChartRef = ref(null)
let pieChart = null
let barChart = null
let lineChart = null

const statusText = (s) => ({ draft: '草稿', approved: '已审批', in_progress: '进行中', pending_approval: '待审批', completed: '已完成' }[s] || s)
const statusTagType = (s) => ({ draft: 'info', approved: 'success', in_progress: 'primary', pending_approval: 'warning', completed: '' }[s] || '')

const goDetail = (id) => router.push(`/project/detail/${id}`)

const loadStats = async () => {
  try {
    const r1 = await query("SELECT COUNT(*) as cnt FROM projects WHERE status IN ('approved','in_progress','pending_approval')")
    stats.projectCount = r1[0]?.cnt || 0
    const r2 = await query("SELECT SUM(total_investment) as total FROM projects")
    stats.totalInvestment = r2[0]?.total || 0
    const today = formatDate(new Date())
    const r3 = await query("SELECT COUNT(*) as cnt FROM purchase_orders WHERE DATE(created_at) = ?", [today])
    stats.todayPurchase = r3[0]?.cnt || 0
    const r4 = await query("SELECT COUNT(*) as cnt FROM approvals WHERE status = 'pending'")
    stats.pendingApproval = r4[0]?.cnt || 0
  } catch (e) {
    console.error(e)
  }
}

const loadProjects = async () => {
  try {
    projectList.value = await query("SELECT * FROM projects ORDER BY created_at DESC LIMIT 5")
  } catch (e) {
    console.error(e)
  }
}

const loadNotices = async () => {
  noticeList.value = await notificationStore.fetchList(8)
}

const loadEquipment = async () => {
  try {
    const rows = await query("SELECT status, COUNT(*) as cnt FROM equipments GROUP BY status")
    rows.forEach(r => {
      if (r.status === 'running') equipmentStats.running = r.cnt
      else if (r.status === 'idle') equipmentStats.idle = r.cnt
      else if (r.status === 'repair') equipmentStats.repair = r.cnt
      else if (r.status === 'fault') equipmentStats.fault = r.cnt
    })
  } catch (e) {
    console.error(e)
  }
}

const initPieChart = () => {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)
  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
      data: [
        { value: 35, name: '住宅' },
        { value: 25, name: '商业综合体' },
        { value: 18, name: '办公楼' },
        { value: 12, name: '市政工程' },
        { value: 10, name: '工业厂房' }
      ],
      color: ['#67c23a', '#409eff', '#e6a23c', '#f56c6c', '#909399']
    }]
  }
  pieChart.setOption(option)
}

const initBarChart = () => {
  if (!barChartRef.value) return
  barChart = echarts.init(barChartRef.value)
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
      axisLabel: { fontSize: 11 }
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar',
      data: [120, 190, 150, 220, 280, 260],
      itemStyle: { color: '#409eff', borderRadius: [3, 3, 0, 0] },
      barWidth: 18
    }]
  }
  barChart.setOption(option)
}

const initLineChart = () => {
  if (!lineChartRef.value) return
  lineChart = echarts.init(lineChartRef.value)
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLabel: { fontSize: 11 }
    },
    yAxis: { type: 'value', min: 80, max: 100, axisLabel: { fontSize: 11 } },
    series: [{
      type: 'line',
      data: [92.5, 94.2, 91.8, 95.3, 96.1, 93.7, 94.8],
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#67c23a' },
      lineStyle: { width: 2, color: '#67c23a' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(103,194,58,0.3)' },
          { offset: 1, color: 'rgba(103,194,58,0.02)' }
        ])
      }
    }]
  }
  lineChart.setOption(option)
}

const handleResize = () => {
  pieChart?.resize()
  barChart?.resize()
  lineChart?.resize()
}

onMounted(async () => {
  await Promise.all([loadStats(), loadProjects(), loadNotices(), loadEquipment()])
  await nextTick()
  initPieChart()
  initBarChart()
  initLineChart()
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard {
  width: 100%;
}
.stat-row {
  margin-bottom: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  position: relative;
  overflow: hidden;
}
.stat-card::after {
  content: '';
  position: absolute;
  right: -20px;
  top: -20px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  opacity: 0.1;
}
.stat-card-1::after { background: #67c23a; }
.stat-card-2::after { background: #409eff; }
.stat-card-3::after { background: #e6a23c; }
.stat-card-4::after { background: #f56c6c; }
.stat-card-1 .stat-icon { color: #67c23a; }
.stat-card-2 .stat-icon { color: #409eff; }
.stat-card-3 .stat-icon { color: #e6a23c; }
.stat-card-4 .stat-icon { color: #f56c6c; }
.stat-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(0,0,0,0.03);
}
.stat-info { flex: 1; }
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
  margin-bottom: 6px;
}
.stat-label {
  font-size: 13px;
  color: #6b7280;
}
.chart-row { }
.chart-small {
  width: 100%;
  height: 220px;
}
.notice-list {
  max-height: 320px;
  overflow-y: auto;
}
.notice-item {
  padding: 10px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.notice-item:last-child { border-bottom: none; }
.notice-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.notice-title {
  flex: 1;
  font-size: 13px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notice-time {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}
.notice-dot { padding: 0; }
.equip-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.equip-item {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}
.equip-name {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
}
.equip-count {
  font-size: 26px;
  font-weight: 700;
}
.equip-running { color: #67c23a; }
.equip-idle { color: #409eff; }
.equip-repair { color: #e6a23c; }
.equip-fault { color: #f56c6c; }
</style>
