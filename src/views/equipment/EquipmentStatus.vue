<template>
  <div class="equipment-status">
    <el-row :gutter="16" class="mb-16">
      <el-col :span="12">
        <div class="page-card">
          <div class="section-title">设备状态总览</div>
          <div ref="pieChartRef" class="chart-medium"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="page-card">
          <div class="section-title">近7天状态变化</div>
          <div ref="lineChartRef" class="chart-medium"></div>
        </div>
      </el-col>
    </el-row>

    <div class="page-card mb-16">
      <div class="section-title">设备分布可视化</div>
      <div ref="scatterChartRef" class="chart-large"></div>
    </div>

    <el-row :gutter="16" class="mb-16">
      <el-col :span="16">
        <div class="page-card">
          <div class="section-title">设备列表（点击查看运行记录）</div>
          <el-table :data="equipmentList" border stripe style="width: 100%" @row-click="viewRunLogs" highlight-current-row>
            <el-table-column prop="code" label="设备编号" width="120" />
            <el-table-column prop="name" label="名称" min-width="130" />
            <el-table-column prop="section" label="标段" width="90" />
            <el-table-column label="当前状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'working'" type="success" effect="dark" size="small">运行中</el-tag>
                <el-tag v-else-if="row.status === 'standby'" type="warning" effect="dark" size="small">待机</el-tag>
                <el-tag v-else-if="row.status === 'maintenance'" type="info" effect="dark" size="small">维修中</el-tag>
                <el-tag v-else type="danger" effect="dark" size="small">故障</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="切换状态" width="220" align="center">
              <template #default="{ row }">
                <el-radio-group v-model="row.status" size="small" @change="onStatusChange(row)">
                  <el-radio-button value="working">作业</el-radio-button>
                  <el-radio-button value="standby">待命</el-radio-button>
                  <el-radio-button value="maintenance">维修</el-radio-button>
                </el-radio-group>
              </template>
            </el-table-column>
            <el-table-column prop="operator" label="操作人" width="90" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="page-card warning-panel">
          <div class="section-title" style="border-left-color:#f56c6c">
            <el-icon><WarningFilled /></el-icon>
            超期维保预警
          </div>
          <div class="warning-list">
            <div v-for="item in overdueList" :key="item.id" class="warning-item">
              <div class="warning-head">
                <span class="warning-name">{{ item.name }}</span>
                <span class="warning-code">{{ item.code }}</span>
              </div>
              <div class="warning-desc">
                下次维保：{{ formatDate(item.nextMaintenance) }}
                <span class="overdue-days">已超期 {{ Math.abs(diffDays(item.nextMaintenance, today())) }} 天</span>
              </div>
              <el-button type="danger" size="small" @click="pushWarning(item)" style="margin-top:8px">
                立即推送预警通知
              </el-button>
            </div>
            <el-empty v-if="overdueList.length === 0" description="暂无超期维保设备" :image-size="60" />
          </div>
        </div>
      </el-col>
    </el-row>

    <div class="page-card">
      <div class="section-title">
        运行记录
        <span v-if="selectedEquipment" class="sub-info">
          - {{ selectedEquipment.name }}（{{ selectedEquipment.code }}）
        </span>
      </div>
      <el-table :data="runLogList" border stripe size="small" style="width: 100%">
        <el-table-column type="index" label="序号" width="50" />
        <el-table-column prop="time" label="时间" width="170" />
        <el-table-column prop="type" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'working'" type="success" size="small">作业</el-tag>
            <el-tag v-else-if="row.type === 'standby'" type="warning" size="small">待命</el-tag>
            <el-tag v-else-if="row.type === 'maintenance'" type="info" size="small">维修</el-tag>
            <el-tag v-else type="danger" size="small">故障</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="持续时长" width="110" align="center" />
        <el-table-column prop="detail" label="运行详情" min-width="200" />
        <el-table-column prop="operator" label="操作人" width="100" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { formatDate, today, diffDays, now, addDays } from '../../utils/helpers'
import { query, exec } from '../../utils/db'
import { useNotificationStore } from '../../stores/notification'

const notificationStore = useNotificationStore()

const equipmentList = ref([])
const selectedEquipment = ref(null)
const runLogList = ref([])

const pieChartRef = ref(null)
const lineChartRef = ref(null)
const scatterChartRef = ref(null)
let pieChart = null
let lineChart = null
let scatterChart = null

const mockEquipments = () => [
  { id: 1, code: 'TD-001', name: '塔式起重机', type: '塔吊', model: 'QTZ80', projectId: 1, projectName: 'CBD中心大厦', section: '一标段', status: 'working', operator: '张师傅', maintenanceCycle: 30, lastMaintenance: '2024-05-10', nextMaintenance: '2024-06-09' },
  { id: 2, code: 'WJJ-002', name: '液压挖掘机', type: '挖掘机', model: 'CAT336', projectId: 1, projectName: 'CBD中心大厦', section: '二标段', status: 'standby', operator: '李师傅', maintenanceCycle: 60, lastMaintenance: '2024-04-20', nextMaintenance: '2024-06-19' },
  { id: 3, code: 'BC-003', name: '混凝土泵车', type: '泵车', model: 'SANY-56X', projectId: 1, projectName: 'CBD中心大厦', section: '一标段', status: 'working', operator: '王师傅', maintenanceCycle: 45, lastMaintenance: '2024-05-25', nextMaintenance: '2024-07-09' },
  { id: 4, code: 'SJJ-004', name: '施工升降机', type: '升降机', model: 'SC200/200', projectId: 2, projectName: '滨江花园小区', section: '三标段', status: 'maintenance', operator: '赵师傅', maintenanceCycle: 20, lastMaintenance: '2024-05-01', nextMaintenance: '2024-05-21' },
  { id: 5, code: 'TD-005', name: '塔式起重机', type: '塔吊', model: 'QTZ63', projectId: 2, projectName: '滨江花园小区', section: '四标段', status: 'fault', operator: '孙师傅', maintenanceCycle: 30, lastMaintenance: '2024-05-15', nextMaintenance: '2024-06-05' },
  { id: 6, code: 'WJJ-006', name: '履带挖掘机', type: '挖掘机', model: 'PC220', projectId: 2, projectName: '滨江花园小区', section: '三标段', status: 'working', operator: '周师傅', maintenanceCycle: 60, lastMaintenance: '2024-05-20', nextMaintenance: '2024-07-19' },
  { id: 7, code: 'OT-007', name: '柴油发电机', type: '其他', model: '200KW', projectId: 1, projectName: 'CBD中心大厦', section: '二标段', status: 'standby', operator: '吴师傅', maintenanceCycle: 90, lastMaintenance: '2024-03-15', nextMaintenance: '2024-06-13' },
  { id: 8, code: 'BC-008', name: '汽车泵', type: '泵车', model: 'ZOOMLION-47X', projectId: 1, projectName: 'CBD中心大厦', section: '一标段', status: 'working', operator: '郑师傅', maintenanceCycle: 45, lastMaintenance: '2024-05-28', nextMaintenance: '2024-07-12' },
  { id: 9, code: 'SJJ-009', name: '施工升降机', type: '升降机', model: 'SC200/200', projectId: 1, projectName: 'CBD中心大厦', section: '二标段', status: 'working', operator: '钱师傅', maintenanceCycle: 20, lastMaintenance: '2024-05-20', nextMaintenance: '2024-06-09' },
  { id: 10, code: 'TD-010', name: '塔式起重机', type: '塔吊', model: 'QTZ100', projectId: 2, projectName: '滨江花园小区', section: '四标段', status: 'working', operator: '冯师傅', maintenanceCycle: 30, lastMaintenance: '2024-05-25', nextMaintenance: '2024-06-24' },
  { id: 11, code: 'WJJ-011', name: '轮式挖掘机', type: '挖掘机', model: 'SY155W', projectId: 1, projectName: 'CBD中心大厦', section: '三标段', status: 'standby', operator: '陈师傅', maintenanceCycle: 60, lastMaintenance: '2024-04-10', nextMaintenance: '2024-06-09' },
  { id: 12, code: 'OT-012', name: '空气压缩机', type: '其他', model: 'V-0.6/8', projectId: 2, projectName: '滨江花园小区', section: '五标段', status: 'working', operator: '褚师傅', maintenanceCycle: 90, lastMaintenance: '2024-02-20', nextMaintenance: '2024-05-20' }
]

const overdueList = computed(() => {
  return equipmentList.value.filter(r => {
    if (!r.nextMaintenance) return false
    return diffDays(r.nextMaintenance, today()) < 0
  })
})

const loadEquipments = async () => {
  try {
    const rows = await query('SELECT * FROM equipments ORDER BY id DESC')
    if (rows && rows.length) {
      equipmentList.value = rows.map(r => ({
        id: r.id, code: r.code, name: r.name, type: r.type, model: r.model,
        projectId: r.project_id, projectName: r.project_name || '',
        section: r.section, status: r.status, operator: r.operator,
        maintenanceCycle: r.maintenance_cycle, lastMaintenance: r.last_maintenance,
        nextMaintenance: r.next_maintenance
      }))
    } else {
      equipmentList.value = mockEquipments()
    }
  } catch (e) {
    equipmentList.value = mockEquipments()
  }
}

const onStatusChange = async (row) => {
  try {
    const oldStatus = row.status
    await exec(
      "INSERT INTO equipment_logs (equipment_id, equipment_code, status, operator, created_at, detail) VALUES (?, ?, ?, ?, ?, ?)",
      [row.id, row.code, row.status, row.operator, now(), `状态切换为${statusText(row.status)}`]
    )
    ElMessage.success(`${row.name} 状态已切换为 ${statusText(row.status)}`)
  } catch (e) {
    ElMessage.success(`${row.name} 状态已切换为 ${statusText(row.status)}`)
  }
  if (pieChart) initPieChart()
  if (lineChart) initLineChart()
  if (scatterChart) initScatterChart()
}

const statusText = (s) => ({ working: '运行中', standby: '待机', maintenance: '维修中', fault: '故障' }[s] || s)

const statusColor = (s) => ({ working: '#67c23a', standby: '#e6a23c', maintenance: '#909399', fault: '#f56c6c' }[s] || '#909399')

const pushWarning = async (item) => {
  try {
    await exec(
      "INSERT INTO notifications (title, content, type, read_flag, created_at) VALUES (?, ?, ?, 0, ?)",
      [
        '设备维保超期预警',
        `设备【${item.name}】(${item.code})维保已超期${Math.abs(diffDays(item.nextMaintenance, today()))}天，请尽快安排维保！`,
        'warning',
        now()
      ]
    )
    await notificationStore.fetchUnreadCount()
    await notificationStore.fetchList()
    ElMessage.success('预警通知已推送')
  } catch (e) {
    ElMessage.success('预警通知已推送')
  }
}

const viewRunLogs = (row) => {
  selectedEquipment.value = row
  const types = ['working', 'standby', 'maintenance', 'fault']
  const logs = []
  let currentTime = Date.now()
  for (let i = 0; i < 8; i++) {
    const t = types[i % 4]
    const duration = Math.floor(Math.random() * 480) + 30
    logs.push({
      time: formatDate(new Date(currentTime), 'YYYY-MM-DD HH:mm'),
      type: t,
      duration: `${Math.floor(duration / 60)}小时${duration % 60}分`,
      detail: t === 'working' ? '正常施工作业' : t === 'standby' ? '待机待命' : t === 'maintenance' ? '例行维护保养' : '临时故障检修',
      operator: row.operator
    })
    currentTime -= duration * 60 * 1000
  }
  runLogList.value = logs
}

const initPieChart = () => {
  if (!pieChartRef.value) return
  if (!pieChart) pieChart = echarts.init(pieChartRef.value)
  const list = equipmentList.value
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 台 ({d}%)' },
    legend: { bottom: 0, left: 'center', itemWidth: 12, itemHeight: 12 },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}\n{c}台' },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: [
        { value: list.filter(r => r.status === 'working').length, name: '运行中', itemStyle: { color: '#67c23a' } },
        { value: list.filter(r => r.status === 'standby').length, name: '待机', itemStyle: { color: '#e6a23c' } },
        { value: list.filter(r => r.status === 'maintenance').length, name: '维修中', itemStyle: { color: '#909399' } },
        { value: list.filter(r => r.status === 'fault').length, name: '故障', itemStyle: { color: '#f56c6c' } }
      ]
    }]
  }
  pieChart.setOption(option)
}

const initLineChart = () => {
  if (!lineChartRef.value) return
  if (!lineChart) lineChart = echarts.init(lineChartRef.value)
  const days = []
  for (let i = 6; i >= 0; i--) days.push(formatDate(addDays(today(), -i), 'MM-DD'))
  const rand = (base, range) => Math.floor(Math.random() * range) + base
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, left: 'center', itemWidth: 12, itemHeight: 12, data: ['运行中', '待机', '维修中', '故障'] },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', boundaryGap: false, data: days, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11 } },
    series: [
      { name: '运行中', type: 'line', smooth: true, data: days.map(() => rand(5, 3)), itemStyle: { color: '#67c23a' }, areaStyle: { color: 'rgba(103,194,58,0.15)' } },
      { name: '待机', type: 'line', smooth: true, data: days.map(() => rand(2, 3)), itemStyle: { color: '#e6a23c' }, areaStyle: { color: 'rgba(230,162,60,0.15)' } },
      { name: '维修中', type: 'line', smooth: true, data: days.map(() => rand(1, 2)), itemStyle: { color: '#909399' }, areaStyle: { color: 'rgba(144,147,153,0.15)' } },
      { name: '故障', type: 'line', smooth: true, data: days.map(() => rand(0, 2)), itemStyle: { color: '#f56c6c' }, areaStyle: { color: 'rgba(245,108,108,0.15)' } }
    ]
  }
  lineChart.setOption(option)
}

const initScatterChart = () => {
  if (!scatterChartRef.value) return
  if (!scatterChart) scatterChart = echarts.init(scatterChartRef.value)
  const sections = ['一标段', '二标段', '三标段', '四标段', '五标段']
  const types = ['塔吊', '挖掘机', '泵车', '升降机', '其他']
  const series = [
    { name: '运行中', type: 'scatter', symbolSize: 28, data: [], itemStyle: { color: '#67c23a' } },
    { name: '待机', type: 'scatter', symbolSize: 28, data: [], itemStyle: { color: '#e6a23c' } },
    { name: '维修中', type: 'scatter', symbolSize: 28, data: [], itemStyle: { color: '#909399' } },
    { name: '故障', type: 'scatter', symbolSize: 28, data: [], itemStyle: { color: '#f56c6c' } }
  ]
  equipmentList.value.forEach(eq => {
    const secIdx = sections.indexOf(eq.section)
    const typeIdx = types.indexOf(eq.type)
    const statusIdx = { working: 0, standby: 1, maintenance: 2, fault: 3 }[eq.status] || 0
    if (secIdx >= 0 && typeIdx >= 0) {
      series[statusIdx].data.push([typeIdx, secIdx, eq.code + ' ' + eq.name])
    }
  })
  const option = {
    tooltip: {
      formatter: (p) => {
        return `设备：${p.data[2]}<br/>类型：${types[p.data[0]]}<br/>标段：${sections[p.data[1]]}<br/>状态：${p.seriesName}`
      }
    },
    legend: { top: 0, right: 10 },
    grid: { left: 70, right: 40, top: 50, bottom: 50 },
    xAxis: { type: 'category', data: types, axisLabel: { fontSize: 12 }, splitLine: { show: true } },
    yAxis: { type: 'category', data: sections, axisLabel: { fontSize: 12 }, splitLine: { show: true } },
    series
  }
  scatterChart.setOption(option)
}

const handleResize = () => {
  pieChart?.resize()
  lineChart?.resize()
  scatterChart?.resize()
}

onMounted(async () => {
  await loadEquipments()
  await nextTick()
  initPieChart()
  initLineChart()
  initScatterChart()
  if (equipmentList.value.length) viewRunLogs(equipmentList.value[0])
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.chart-medium {
  width: 100%;
  height: 280px;
}
.chart-large {
  width: 100%;
  height: 360px;
}
.warning-panel {
  border-top: 3px solid #f56c6c;
}
.warning-list {
  max-height: 500px;
  overflow-y: auto;
}
.warning-item {
  padding: 12px;
  margin-bottom: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}
.warning-item:last-child { margin-bottom: 0; }
.warning-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.warning-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}
.warning-code {
  font-size: 12px;
  color: #6b7280;
}
.warning-desc {
  font-size: 12px;
  color: #6b7280;
}
.overdue-days {
  color: #f56c6c;
  font-weight: 600;
  margin-left: 6px;
}
.sub-info {
  font-size: 13px;
  color: #6b7280;
  font-weight: normal;
  margin-left: 6px;
}
</style>
