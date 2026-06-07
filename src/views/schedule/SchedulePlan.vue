<template>
  <div class="schedule-plan">
    <div class="page-card mb-16">
      <div class="page-header">
        <h2>施工进度计划</h2>
      </div>
      <el-form :inline="true" :model="planForm" class="plan-header">
        <el-form-item label="选择项目">
          <el-select v-model="planForm.projectId" placeholder="请选择项目" style="width: 220px">
            <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="planForm.startDate"
            type="date"
            placeholder="选择开始日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="MagicStick" @click="autoGenerateTasks">自动生成计划</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="page-card mb-16">
      <div class="section-title">任务编辑</div>
      <div class="task-toolbar mb-12">
        <el-button type="primary" :icon="Plus" size="small" @click="addTask">新增任务</el-button>
        <el-button type="danger" :icon="Delete" size="small" @click="deleteSelectedTasks" :disabled="selectedTasks.length === 0">删除选中</el-button>
      </div>
      <el-table :data="taskList" border stripe @selection-change="handleSelectionChange" style="width: 100%">
        <el-table-column type="selection" width="50" />
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column label="任务名称" min-width="180">
          <template #default="{ row }">
            <el-input v-model="row.name" placeholder="请输入任务名称" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="标段" width="140">
          <template #default="{ row }">
            <el-select v-model="row.section" placeholder="选择标段" size="small" style="width: 100%">
              <el-option label="一标段" value="一标段" />
              <el-option label="二标段" value="二标段" />
              <el-option label="三标段" value="三标段" />
              <el-option label="四标段" value="四标段" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="工期(天)" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.duration" :min="1" size="small" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="前置任务" min-width="200">
          <template #default="{ row, $index }">
            <el-select
              v-model="row.predecessors"
              multiple
              placeholder="选择前置任务"
              size="small"
              style="width: 100%"
            >
              <el-option
                v-for="(t, i) in taskList"
                :key="t.tempId || i"
                :label="t.name || `任务${i + 1}`"
                :value="t.tempId || i"
                :disabled="i >= $index"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="资源需求" min-width="200">
          <template #default="{ row }">
            <el-input v-model="row.resources" placeholder="如：钢筋工10人、塔吊1台" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ $index }">
            <el-button type="danger" link size="small" @click="removeTask($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="mt-16" style="text-align: right">
        <el-button type="success" :icon="Histogram" @click="generateSchedule">生成进度计划</el-button>
      </div>
    </div>

    <div v-if="scheduleResult" class="page-card mb-16">
      <div class="section-title">甘特图</div>
      <div ref="ganttChartRef" style="width: 100%; height: 420px"></div>
    </div>

    <div v-if="scheduleResult" class="page-card mb-16">
      <div class="section-title">任务详细信息（关键路径分析）</div>
      <el-table :data="scheduleResult" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="任务名称" min-width="140" />
        <el-table-column prop="section" label="标段" width="100" />
        <el-table-column prop="duration" label="工期(天)" width="90" />
        <el-table-column prop="es" label="ES" width="110" />
        <el-table-column prop="ef" label="EF" width="110" />
        <el-table-column prop="ls" label="LS" width="110" />
        <el-table-column prop="lf" label="LF" width="110" />
        <el-table-column prop="totalFloat" label="总浮动(天)" width="100" />
        <el-table-column prop="freeFloat" label="自由浮动(天)" width="110" />
        <el-table-column label="是否关键" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isCritical" type="danger" effect="dark">关键任务</el-tag>
            <el-tag v-else type="info">非关键</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="scheduleResult" class="page-card">
      <div style="text-align: right">
        <el-button type="primary" :icon="Check" @click="submitApproval">提交审批</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, MagicStick, Histogram, Check } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { formatDate, addDays, today } from '../../utils/helpers'
import { query, exec } from '../../utils/db'

const ganttChartRef = ref(null)
let ganttChart = null

const projectList = ref([])
const selectedTasks = ref([])

const planForm = reactive({
  projectId: null,
  startDate: today()
})

const taskList = ref([])
const scheduleResult = ref(null)

let tempIdCounter = 0
const nextTempId = () => `tmp_${++tempIdCounter}`

onMounted(async () => {
  try {
    const projects = await query('SELECT id, name FROM projects ORDER BY id DESC')
    projectList.value = projects
  } catch (e) {
    console.error(e)
  }
})

onBeforeUnmount(() => {
  if (ganttChart) {
    ganttChart.dispose()
    ganttChart = null
  }
})

const handleSelectionChange = (val) => {
  selectedTasks.value = val
}

const addTask = () => {
  taskList.value.push({
    tempId: nextTempId(),
    name: '',
    section: '',
    duration: 5,
    predecessors: [],
    resources: ''
  })
}

const removeTask = (index) => {
  taskList.value.splice(index, 1)
  taskList.value.forEach(t => {
    t.predecessors = (t.predecessors || []).filter(p => {
      if (typeof p === 'number') return p !== index && (p > index ? p - 1 : p)
      return true
    })
  })
}

const deleteSelectedTasks = () => {
  if (selectedTasks.value.length === 0) return
  const toDelete = new Set(selectedTasks.value.map(t => t.tempId))
  taskList.value = taskList.value.filter(t => !toDelete.has(t.tempId))
  selectedTasks.value = []
}

const autoGenerateTasks = () => {
  if (!planForm.projectId) {
    ElMessage.warning('请先选择项目')
    return
  }
  const templates = [
    { name: '场地平整与临时设施', section: '一标段', duration: 7, predecessors: [], resources: '推土机2台、工人15人' },
    { name: '基础土方开挖', section: '一标段', duration: 10, predecessors: [], resources: '挖掘机3台、运土车8辆' },
    { name: '桩基施工', section: '一标段', duration: 15, predecessors: [], resources: '打桩机2台、钢筋工10人' },
    { name: '基础承台与地梁', section: '一标段', duration: 12, predecessors: [], resources: '模板工15人、混凝土工20人' },
    { name: '主体结构-1层', section: '二标段', duration: 10, predecessors: [], resources: '架子工20人、木工25人' },
    { name: '主体结构-2层', section: '二标段', duration: 10, predecessors: [], resources: '架子工20人、木工25人' },
    { name: '主体结构-3层', section: '二标段', duration: 10, predecessors: [], resources: '架子工20人、木工25人' },
    { name: '砌筑工程', section: '三标段', duration: 20, predecessors: [], resources: '瓦工30人、砂浆机3台' },
    { name: '外墙抹灰', section: '三标段', duration: 15, predecessors: [], resources: '抹灰工25人' },
    { name: '室内装修', section: '四标段', duration: 30, predecessors: [], resources: '装修工40人、水电工15人' },
    { name: '水电安装', section: '四标段', duration: 25, predecessors: [], resources: '水电工30人' },
    { name: '室外工程与绿化', section: '四标段', duration: 20, predecessors: [], resources: '绿化工20人、管网工15人' },
    { name: '竣工验收', section: '一标段', duration: 5, predecessors: [], resources: '各专业负责人' }
  ]
  taskList.value = templates.map(t => ({
    ...t,
    tempId: nextTempId(),
    predecessors: []
  }))
  for (let i = 1; i < taskList.value.length; i++) {
    taskList.value[i].predecessors = [taskList.value[i - 1].tempId]
  }
  ElMessage.success('已自动生成13个标准施工任务，请根据实际情况调整')
}

const generateSchedule = () => {
  if (taskList.value.length === 0) {
    ElMessage.warning('请先添加任务')
    return
  }
  if (!planForm.startDate) {
    ElMessage.warning('请选择开始日期')
    return
  }
  const invalid = taskList.value.some(t => !t.name || !t.duration || t.duration < 1)
  if (invalid) {
    ElMessage.error('请填写完整的任务名称和工期')
    return
  }

  const tasks = taskList.value.map((t, i) => ({
    index: i,
    tempId: t.tempId,
    name: t.name,
    section: t.section,
    duration: t.duration,
    predecessors: t.predecessors || [],
    resources: t.resources
  }))

  const idToIdx = new Map()
  tasks.forEach((t, i) => idToIdx.set(t.tempId, i))

  const predIdxMap = new Map()
  tasks.forEach((t, i) => {
    const idxPreds = []
    t.predecessors.forEach(p => {
      if (idToIdx.has(p)) idxPreds.push(idToIdx.get(p))
      else if (typeof p === 'number' && p < i) idxPreds.push(p)
    })
    predIdxMap.set(i, idxPreds)
  })

  const successors = new Map()
  tasks.forEach((_, i) => successors.set(i, []))
  tasks.forEach((_, i) => {
    predIdxMap.get(i).forEach(p => {
      successors.get(p).push(i)
    })
  })

  const es = new Array(tasks.length).fill(0)
  const ef = new Array(tasks.length).fill(0)
  const topoForward = []
  const inDegree = new Array(tasks.length).fill(0)
  tasks.forEach((_, i) => { inDegree[i] = predIdxMap.get(i).length })
  const queue = []
  tasks.forEach((_, i) => { if (inDegree[i] === 0) queue.push(i) })
  while (queue.length) {
    const u = queue.shift()
    topoForward.push(u)
    successors.get(u).forEach(v => {
      inDegree[v]--
      if (inDegree[v] === 0) queue.push(v)
    })
  }
  topoForward.forEach(i => {
    const preds = predIdxMap.get(i)
    let maxEf = 0
    preds.forEach(p => { if (ef[p] > maxEf) maxEf = ef[p] })
    es[i] = maxEf
    ef[i] = es[i] + tasks[i].duration
  })

  let projectDuration = 0
  ef.forEach(v => { if (v > projectDuration) projectDuration = v })

  const lf = new Array(tasks.length).fill(projectDuration)
  const ls = new Array(tasks.length).fill(0)
  const topoBackward = [...topoForward].reverse()
  topoBackward.forEach(i => {
    const succs = successors.get(i)
    let minLs = projectDuration
    succs.forEach(s => { if (ls[s] < minLs) minLs = ls[s] })
    lf[i] = succs.length === 0 ? projectDuration : minLs
    ls[i] = lf[i] - tasks[i].duration
  })

  const totalFloat = new Array(tasks.length).fill(0)
  const freeFloat = new Array(tasks.length).fill(0)
  tasks.forEach((_, i) => {
    totalFloat[i] = ls[i] - es[i]
    const succs = successors.get(i)
    if (succs.length === 0) {
      freeFloat[i] = projectDuration - ef[i]
    } else {
      let minEs = projectDuration
      succs.forEach(s => { if (es[s] < minEs) minEs = es[s] })
      freeFloat[i] = minEs - ef[i]
    }
  })

  const result = tasks.map((t, i) => ({
    ...t,
    es: addDays(planForm.startDate, es[i]),
    ef: addDays(planForm.startDate, ef[i] - 1),
    ls: addDays(planForm.startDate, ls[i]),
    lf: addDays(planForm.startDate, lf[i] - 1),
    totalFloat: totalFloat[i],
    freeFloat: freeFloat[i],
    isCritical: totalFloat[i] === 0,
    startOffset: es[i],
    endOffset: ef[i]
  }))

  scheduleResult.value = result
  nextTick(() => renderGantt(result, projectDuration))
  ElMessage.success('进度计划已生成，关键路径已标记')
}

const renderGantt = (data, totalDays) => {
  if (!ganttChartRef.value) return
  if (ganttChart) ganttChart.dispose()
  ganttChart = echarts.init(ganttChartRef.value)

  const categories = data.map(d => d.name).reverse()
  const startDate = planForm.startDate

  const seriesData = data.slice().reverse().map(d => ({
    name: d.name,
    value: [
      categories.indexOf(d.name),
      d.startOffset,
      d.endOffset,
      d.duration
    ],
    itemStyle: {
      color: d.isCritical ? '#f56c6c' : '#67c23a'
    }
  }))

  const xAxisTicks = []
  const step = Math.max(1, Math.ceil(totalDays / 15))
  for (let i = 0; i <= totalDays; i += step) {
    xAxisTicks.push({
      value: i,
      label: formatDate(addDays(startDate, i))
    })
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0]
        if (!p) return ''
        const d = data.find(t => t.name === p.name)
        if (!d) return ''
        return `
          <div style="font-weight:bold;margin-bottom:6px">${d.name}${d.isCritical ? ' <span style="color:#f56c6c">(关键)</span>' : ''}</div>
          <div>标段：${d.section || '-'}</div>
          <div>工期：${d.duration}天</div>
          <div>开始：${d.es}</div>
          <div>结束：${d.ef}</div>
          <div>总浮动：${d.totalFloat}天</div>
          <div>资源：${d.resources || '-'}</div>
        `
      }
    },
    grid: {
      left: 150,
      right: 40,
      top: 40,
      bottom: 80
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: totalDays,
      interval: step,
      axisLabel: {
        formatter: (val) => formatDate(addDays(startDate, val)),
        rotate: 30
      },
      splitLine: { show: true, lineStyle: { type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { fontSize: 12 }
    },
    series: [
      {
        type: 'custom',
        renderItem: (params, api) => {
          const yIndex = api.value(0)
          const start = api.coord([api.value(1), yIndex])
          const end = api.coord([api.value(2), yIndex])
          const height = api.size([0, 1])[1] * 0.6
          const rectShape = echarts.graphic.clipRectByRect(
            {
              x: start[0],
              y: start[1] - height / 2,
              width: end[0] - start[0],
              height: height
            },
            {
              x: params.coordSys.x,
              y: params.coordSys.y,
              width: params.coordSys.width,
              height: params.coordSys.height
            }
          )
          return rectShape && {
            type: 'rect',
            shape: rectShape,
            style: api.style()
          }
        },
        encode: {
          x: [1, 2],
          y: 0
        },
        data: seriesData
      }
    ]
  }
  ganttChart.setOption(option)
}

const submitApproval = async () => {
  if (!planForm.projectId) {
    ElMessage.warning('请先选择项目')
    return
  }
  try {
    await ElMessageBox.confirm('确认提交当前进度计划进入审批流程？', '提交确认', { type: 'info' })
    const planName = `${projectList.value.find(p => p.id === planForm.projectId)?.name || ''}-进度计划-${formatDate(new Date())}`
    const sql = `INSERT INTO schedule_plans (project_id, name, start_date, status, created_at)
                 VALUES (${planForm.projectId}, '${planName}', '${planForm.startDate}', 'pending', datetime('now'))`
    await exec(sql)
    ElMessage.success('已提交审批，请在"计划审批"中查看进度')
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}
</script>

<style scoped>
.plan-header {
  margin-bottom: 0;
}
.schedule-plan :deep(.el-table .cell) {
  padding: 4px 6px;
}
</style>
