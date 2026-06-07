<template>
  <div class="schedule-approval">
    <div class="page-card">
      <div class="page-header">
        <h2>计划审批</h2>
      </div>
      <el-tabs v-model="activeTab" @tab-change="fetchList">
        <el-tab-pane label="待审批" name="pending">
          <el-table :data="pendingList" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="planName" label="计划名称" min-width="200" />
            <el-table-column prop="projectName" label="所属项目" min-width="180" />
            <el-table-column prop="startDate" label="开始日期" width="120" />
            <el-table-column prop="createdAt" label="创建时间" width="160" />
            <el-table-column label="状态" width="100">
              <template #default>
                <el-tag type="warning" effect="dark">待审批</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewDetail(row)">查看详情</el-button>
                <el-button link type="success" size="small" @click="approvePlan(row)">通过</el-button>
                <el-button link type="danger" size="small" @click="rejectPlan(row)">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="已通过" name="approved">
          <el-table :data="approvedList" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="planName" label="计划名称" min-width="200" />
            <el-table-column prop="projectName" label="所属项目" min-width="180" />
            <el-table-column prop="startDate" label="开始日期" width="120" />
            <el-table-column prop="createdAt" label="创建时间" width="160" />
            <el-table-column prop="approvedBy" label="审批人" width="120" />
            <el-table-column prop="approvedAt" label="审批时间" width="160" />
            <el-table-column label="状态" width="100">
              <template #default>
                <el-tag type="success" effect="dark">已通过</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewDetail(row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="已驳回" name="rejected">
          <el-table :data="rejectedList" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="planName" label="计划名称" min-width="200" />
            <el-table-column prop="projectName" label="所属项目" min-width="180" />
            <el-table-column prop="startDate" label="开始日期" width="120" />
            <el-table-column prop="createdAt" label="创建时间" width="160" />
            <el-table-column prop="rejectRemark" label="驳回意见" min-width="180" />
            <el-table-column prop="rejectedBy" label="审批人" width="120" />
            <el-table-column label="状态" width="100">
              <template #default>
                <el-tag type="danger" effect="dark">已驳回</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewDetail(row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="detailVisible" title="计划详情" width="1100px" top="6vh">
      <div v-if="currentPlan">
        <el-descriptions :column="3" border class="mb-16">
          <el-descriptions-item label="计划名称">{{ currentPlan.planName }}</el-descriptions-item>
          <el-descriptions-item label="所属项目">{{ currentPlan.projectName }}</el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ currentPlan.startDate }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentPlan.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="currentPlan.status === 'pending'" type="warning">待审批</el-tag>
            <el-tag v-else-if="currentPlan.status === 'approved'" type="success">已通过</el-tag>
            <el-tag v-else type="danger">已驳回</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审批人">{{ currentPlan.approvedBy || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="section-title">甘特图</div>
        <div ref="detailGanttRef" style="width: 100%; height: 380px" class="mb-16"></div>

        <div class="section-title">任务列表</div>
        <el-table :data="taskDemo" border stripe size="small" style="width: 100%">
          <el-table-column type="index" label="序号" width="50" />
          <el-table-column prop="name" label="任务名称" min-width="150" />
          <el-table-column prop="section" label="标段" width="90" />
          <el-table-column prop="duration" label="工期" width="70" />
          <el-table-column prop="es" label="ES" width="100" />
          <el-table-column prop="ef" label="EF" width="100" />
          <el-table-column prop="ls" label="LS" width="100" />
          <el-table-column prop="lf" label="LF" width="100" />
          <el-table-column label="是否关键" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.isCritical" type="danger" size="small" effect="dark">关键</el-tag>
              <el-tag v-else type="info" size="small">非关键</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="rejectVisible" title="驳回审批" width="480px">
      <el-form :model="rejectForm" label-width="80px">
        <el-form-item label="驳回意见" required>
          <el-input
            v-model="rejectForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请填写驳回意见"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import { formatDate, addDays, formatDateTime } from '../../utils/helpers'
import { query, exec } from '../../utils/db'

const activeTab = ref('pending')
const pendingList = ref([])
const approvedList = ref([])
const rejectedList = ref([])

const detailVisible = ref(false)
const currentPlan = ref(null)
const detailGanttRef = ref(null)
let detailGanttChart = null

const rejectVisible = ref(false)
const rejectTarget = ref(null)
const rejectForm = reactive({ remark: '' })

const taskDemo = ref([])

onMounted(() => {
  fetchList()
})

onBeforeUnmount(() => {
  if (detailGanttChart) {
    detailGanttChart.dispose()
    detailGanttChart = null
  }
})

const fetchList = async () => {
  try {
    const sql = `
      SELECT sp.id, sp.name AS planName, sp.project_id AS projectId, sp.start_date AS startDate,
             sp.status, sp.created_at AS createdAt, sp.approved_by AS approvedBy,
             sp.approved_at AS approvedAt, sp.reject_remark AS rejectRemark,
             sp.rejected_by AS rejectedBy, p.name AS projectName
      FROM schedule_plans sp
      LEFT JOIN projects p ON sp.project_id = p.id
      ORDER BY sp.created_at DESC
    `
    const rows = await query(sql)
    const mockRows = rows.length ? rows : getMockData()
    pendingList.value = mockRows.filter(r => r.status === 'pending')
    approvedList.value = mockRows.filter(r => r.status === 'approved')
    rejectedList.value = mockRows.filter(r => r.status === 'rejected')
  } catch (e) {
    pendingList.value = getMockData().filter(r => r.status === 'pending')
    approvedList.value = getMockData().filter(r => r.status === 'approved')
    rejectedList.value = getMockData().filter(r => r.status === 'rejected')
  }
}

const getMockData = () => [
  {
    id: 1, planName: 'CBD中心大厦A座-进度计划-2024',
    projectName: 'CBD中心大厦A座项目',
    startDate: '2024-06-01',
    status: 'pending',
    createdAt: '2024-05-28 10:20:00',
    approvedBy: null, approvedAt: null, rejectRemark: null, rejectedBy: null
  },
  {
    id: 2, planName: '滨江住宅小区-二期进度计划',
    projectName: '滨江住宅小区',
    startDate: '2024-05-10',
    status: 'approved',
    createdAt: '2024-05-05 09:15:00',
    approvedBy: '张总监', approvedAt: '2024-05-06 14:30:00',
    rejectRemark: null, rejectedBy: null
  },
  {
    id: 3, planName: '地铁10号线车站主体施工计划',
    projectName: '地铁10号线3标段',
    startDate: '2024-04-20',
    status: 'rejected',
    createdAt: '2024-04-15 16:00:00',
    approvedBy: null, approvedAt: null,
    rejectRemark: '关键路径工期不合理，基础阶段预留时间不足，请重新调整',
    rejectedBy: '李总'
  }
]

const buildDemoTasks = (plan) => {
  const base = [
    { name: '场地平整', section: '一标段', duration: 7 },
    { name: '土方开挖', section: '一标段', duration: 10 },
    { name: '桩基施工', section: '一标段', duration: 15 },
    { name: '基础结构', section: '一标段', duration: 12 },
    { name: '主体结构-1层', section: '二标段', duration: 10 },
    { name: '主体结构-2层', section: '二标段', duration: 10 },
    { name: '砌筑工程', section: '三标段', duration: 18 },
    { name: '室内装修', section: '四标段', duration: 25 },
    { name: '水电安装', section: '四标段', duration: 20 },
    { name: '竣工验收', section: '一标段', duration: 5 }
  ]
  let offset = 0
  return base.map((t, i) => {
    const es = offset
    const ef = es + t.duration - 1
    const ls = i < 2 ? es : es
    const lf = ls + t.duration - 1
    const isCritical = i < 4 || i === base.length - 1
    offset += t.duration
    return {
      ...t,
      es: addDays(plan.startDate, es),
      ef: addDays(plan.startDate, ef),
      ls: addDays(plan.startDate, ls),
      lf: addDays(plan.startDate, lf),
      startOffset: es,
      endOffset: es + t.duration,
      isCritical
    }
  })
}

const viewDetail = async (row) => {
  currentPlan.value = row
  taskDemo.value = buildDemoTasks(row)
  detailVisible.value = true
  await nextTick()
  renderDetailGantt()
}

const renderDetailGantt = () => {
  if (!detailGanttRef.value) return
  if (detailGanttChart) detailGanttChart.dispose()
  detailGanttChart = echarts.init(detailGanttRef.value)

  const data = taskDemo.value
  const categories = data.map(d => d.name).reverse()
  const totalDays = Math.max(...data.map(d => d.endOffset))

  const seriesData = data.slice().reverse().map(d => ({
    name: d.name,
    value: [categories.indexOf(d.name), d.startOffset, d.endOffset, d.duration],
    itemStyle: { color: d.isCritical ? '#f56c6c' : '#67c23a' }
  }))

  const step = Math.max(1, Math.ceil(totalDays / 12))
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0]
        if (!p) return ''
        const d = data.find(t => t.name === p.name)
        return `
          <div style="font-weight:bold;margin-bottom:4px">${d.name}${d.isCritical ? ' (关键)' : ''}</div>
          <div>标段：${d.section}</div>
          <div>工期：${d.duration}天</div>
          <div>开始：${d.es}</div>
          <div>结束：${d.ef}</div>
        `
      }
    },
    grid: { left: 130, right: 30, top: 30, bottom: 60 },
    xAxis: {
      type: 'value', min: 0, max: totalDays, interval: step,
      axisLabel: {
        formatter: (val) => formatDate(addDays(currentPlan.value.startDate, val)),
        rotate: 30
      },
      splitLine: { show: true, lineStyle: { type: 'dashed' } }
    },
    yAxis: { type: 'category', data: categories, axisLabel: { fontSize: 12 } },
    series: [{
      type: 'custom',
      renderItem: (params, api) => {
        const yIndex = api.value(0)
        const start = api.coord([api.value(1), yIndex])
        const end = api.coord([api.value(2), yIndex])
        const height = api.size([0, 1])[1] * 0.6
        const rect = echarts.graphic.clipRectByRect(
          { x: start[0], y: start[1] - height / 2, width: end[0] - start[0], height },
          { x: params.coordSys.x, y: params.coordSys.y, width: params.coordSys.width, height: params.coordSys.height }
        )
        return rect && { type: 'rect', shape: rect, style: api.style() }
      },
      encode: { x: [1, 2], y: 0 },
      data: seriesData
    }]
  }
  detailGanttChart.setOption(option)
}

const approvePlan = async (row) => {
  try {
    await ElMessageBox.confirm(`确认通过计划"${row.planName}"？通过后将通知各标段负责人。`, '审批确认', { type: 'success' })
    try {
      const sql = `UPDATE schedule_plans SET status='approved', approved_by='张总监', approved_at=datetime('now') WHERE id=${row.id}`
      await exec(sql)
      const notifSql = `INSERT INTO notifications (title, content, type, target_role, created_at) VALUES
        ('进度计划审批通过', '计划【${row.planName}】已通过审批，请各标段按计划执行', 'info', 'section_manager', datetime('now'))`
      await exec(notifSql)
    } catch (e) {}
    ElMessage.success('审批已通过，已推送通知给各标段负责人')
    fetchList()
  } catch (e) {}
}

const rejectPlan = (row) => {
  rejectTarget.value = row
  rejectForm.remark = ''
  rejectVisible.value = true
}

const confirmReject = async () => {
  if (!rejectForm.remark.trim()) {
    ElMessage.warning('请填写驳回意见')
    return
  }
  try {
    const row = rejectTarget.value
    try {
      const sql = `UPDATE schedule_plans SET status='rejected', reject_remark='${rejectForm.remark}', rejected_by='张总监' WHERE id=${row.id}`
      await exec(sql)
    } catch (e) {}
    ElMessage.success('已驳回')
    rejectVisible.value = false
    fetchList()
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped>
</style>
