<template>
  <div class="equipment-list">
    <el-row :gutter="16" class="mb-16">
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #409eff">
          <div class="stat-label">设备总数</div>
          <div class="stat-value" style="color:#409eff">{{ stats.total }}</div>
          <div class="stat-sub">全部登记设备</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #67c23a">
          <div class="stat-label">运行中</div>
          <div class="stat-value" style="color:#67c23a">{{ stats.working }}</div>
          <div class="stat-sub">正常作业</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #e6a23c">
          <div class="stat-label">待机</div>
          <div class="stat-value" style="color:#e6a23c">{{ stats.standby }}</div>
          <div class="stat-sub">待命状态</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #f56c6c">
          <div class="stat-label">维修中</div>
          <div class="stat-value" style="color:#f56c6c">{{ stats.maintenance }}</div>
          <div class="stat-sub">故障/维修</div>
        </div>
      </el-col>
    </el-row>

    <div class="page-card">
      <div class="page-header">
        <h2>设备台账</h2>
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>新增设备
        </el-button>
      </div>

      <el-form :inline="true" :model="filterForm" class="mb-12">
        <el-form-item label="项目">
          <el-select v-model="filterForm.projectId" placeholder="全部项目" clearable style="width: 180px">
            <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable style="width: 140px">
            <el-option label="塔吊" value="塔吊" />
            <el-option label="挖掘机" value="挖掘机" />
            <el-option label="泵车" value="泵车" />
            <el-option label="升降机" value="升降机" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="运行中" value="working" />
            <el-option label="待机" value="standby" />
            <el-option label="维修中" value="maintenance" />
            <el-option label="故障" value="fault" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="filterForm.keyword" placeholder="设备编号/名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="filterList">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="filteredList" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="code" label="设备编号" width="140" />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="model" label="型号" width="140" />
        <el-table-column prop="projectName" label="所属项目" min-width="140" />
        <el-table-column prop="section" label="标段" width="100" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'working'" type="success" effect="dark">运行中</el-tag>
            <el-tag v-else-if="row.status === 'standby'" type="warning" effect="dark">待机</el-tag>
            <el-tag v-else-if="row.status === 'maintenance'" type="info" effect="dark">维修中</el-tag>
            <el-tag v-else type="danger" effect="dark">故障</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column label="上次维保" width="120">
          <template #default="{ row }">{{ formatDate(row.lastMaintenance) }}</template>
        </el-table-column>
        <el-table-column label="下次维保" width="140">
          <template #default="{ row }">
            <div :class="getMaintenanceClass(row)">
              {{ formatDate(row.nextMaintenance) }}
              <span v-if="getMaintenanceWarn(row)" class="warn-badge">{{ getMaintenanceWarn(row) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="success" size="small" @click="openMaintenanceDialog(row)">维保登记</el-button>
            <el-button link type="info" size="small" @click="viewLogs(row)">运行日志</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑设备' : '新增设备'" width="560px">
      <el-form :model="equipmentForm" :rules="formRules" ref="formRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="设备编号" prop="code">
              <el-input v-model="equipmentForm.code" placeholder="请输入设备编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备名称" prop="name">
              <el-input v-model="equipmentForm.name" placeholder="请输入设备名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="设备类型" prop="type">
              <el-select v-model="equipmentForm.type" placeholder="请选择" style="width: 100%">
                <el-option label="塔吊" value="塔吊" />
                <el-option label="挖掘机" value="挖掘机" />
                <el-option label="泵车" value="泵车" />
                <el-option label="升降机" value="升降机" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="型号" prop="model">
              <el-input v-model="equipmentForm.model" placeholder="请输入型号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="所属项目" prop="projectId">
              <el-select v-model="equipmentForm.projectId" placeholder="请选择项目" style="width: 100%" @change="onProjectChange">
                <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="标段" prop="section">
              <el-select v-model="equipmentForm.section" placeholder="请选择标段" style="width: 100%">
                <el-option v-for="s in sectionOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="初始状态" prop="status">
              <el-select v-model="equipmentForm.status" placeholder="请选择" style="width: 100%">
                <el-option label="运行中" value="working" />
                <el-option label="待机" value="standby" />
                <el-option label="维修中" value="maintenance" />
                <el-option label="故障" value="fault" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="维保周期(天)" prop="maintenanceCycle">
              <el-input-number v-model="equipmentForm.maintenanceCycle" :min="1" :max="365" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="操作人" prop="operator">
          <el-input v-model="equipmentForm.operator" placeholder="请输入操作人姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="maintenanceVisible" title="维保登记" width="480px">
      <div v-if="currentEquipment" class="mb-12">
        <div>设备：<b>{{ currentEquipment.name }}</b>（{{ currentEquipment.code }}）</div>
        <div>上次维保：{{ formatDate(currentEquipment.lastMaintenance) || '暂无记录' }}</div>
        <div>维保周期：{{ currentEquipment.maintenanceCycle }} 天</div>
      </div>
      <el-form :model="maintenanceForm" label-width="90px">
        <el-form-item label="维保日期">
          <el-date-picker v-model="maintenanceForm.date" type="date" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="维保内容">
          <el-input v-model="maintenanceForm.content" type="textarea" :rows="3" placeholder="请输入维保内容" />
        </el-form-item>
        <el-form-item label="维保人员">
          <el-input v-model="maintenanceForm.person" placeholder="请输入维保人员" />
        </el-form-item>
        <el-form-item label="下次维保">
          <el-date-picker v-model="maintenanceForm.nextDate" type="date" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="maintenanceVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMaintenance">确认登记</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="logsVisible" title="运行日志" width="780px">
      <div v-if="currentEquipment" class="mb-12">
        设备：<b>{{ currentEquipment.name }}</b>（{{ currentEquipment.code }}）
      </div>
      <el-table :data="logList" border stripe size="small" style="width: 100%">
        <el-table-column type="index" label="序号" width="50" />
        <el-table-column prop="time" label="时间" width="170" />
        <el-table-column prop="type" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'start'" type="success" size="small">开机</el-tag>
            <el-tag v-else-if="row.type === 'stop'" type="info" size="small">停机</el-tag>
            <el-tag v-else-if="row.type === 'status'" type="warning" size="small">状态切换</el-tag>
            <el-tag v-else type="danger" size="small">故障</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" min-width="200" />
        <el-table-column prop="operator" label="操作人" width="100" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { formatDate, today, addDays, diffDays, now } from '../../utils/helpers'
import { query, exec } from '../../utils/db'

const equipmentList = ref([])
const projectList = ref([])
const logList = ref([])

const filterForm = reactive({ projectId: '', type: '', status: '', keyword: '' })

const sectionOptions = ['一标段', '二标段', '三标段', '四标段', '五标段']

const stats = computed(() => {
  const list = equipmentList.value
  return {
    total: list.length,
    working: list.filter(r => r.status === 'working').length,
    standby: list.filter(r => r.status === 'standby').length,
    maintenance: list.filter(r => r.status === 'maintenance' || r.status === 'fault').length
  }
})

const filteredList = computed(() => {
  let list = [...equipmentList.value]
  if (filterForm.projectId) list = list.filter(r => r.projectId === filterForm.projectId)
  if (filterForm.type) list = list.filter(r => r.type === filterForm.type)
  if (filterForm.status) list = list.filter(r => r.status === filterForm.status)
  if (filterForm.keyword) {
    const kw = filterForm.keyword.toLowerCase()
    list = list.filter(r => r.code.toLowerCase().includes(kw) || r.name.toLowerCase().includes(kw))
  }
  return list
})

const getMaintenanceClass = (row) => {
  if (!row.nextMaintenance) return ''
  const diff = diffDays(row.nextMaintenance, today())
  if (diff < 0) return 'maintenance-overdue'
  if (diff <= 3) return 'maintenance-warning'
  return ''
}

const getMaintenanceWarn = (row) => {
  if (!row.nextMaintenance) return ''
  const diff = diffDays(row.nextMaintenance, today())
  if (diff < 0) return `超期${Math.abs(diff)}天`
  if (diff <= 3) return `剩${diff}天`
  return ''
}

const mockData = () => [
  { id: 1, code: 'TD-001', name: '塔式起重机', type: '塔吊', model: 'QTZ80', projectId: 1, projectName: 'CBD中心大厦', section: '一标段', status: 'working', operator: '张师傅', maintenanceCycle: 30, lastMaintenance: '2024-05-10', nextMaintenance: '2024-06-09' },
  { id: 2, code: 'WJJ-002', name: '液压挖掘机', type: '挖掘机', model: 'CAT336', projectId: 1, projectName: 'CBD中心大厦', section: '二标段', status: 'standby', operator: '李师傅', maintenanceCycle: 60, lastMaintenance: '2024-04-20', nextMaintenance: '2024-06-19' },
  { id: 3, code: 'BC-003', name: '混凝土泵车', type: '泵车', model: 'SANY-56X', projectId: 1, projectName: 'CBD中心大厦', section: '一标段', status: 'working', operator: '王师傅', maintenanceCycle: 45, lastMaintenance: '2024-05-25', nextMaintenance: '2024-07-09' },
  { id: 4, code: 'SJJ-004', name: '施工升降机', type: '升降机', model: 'SC200/200', projectId: 2, projectName: '滨江花园小区', section: '三标段', status: 'maintenance', operator: '赵师傅', maintenanceCycle: 20, lastMaintenance: '2024-05-01', nextMaintenance: '2024-05-21' },
  { id: 5, code: 'TD-005', name: '塔式起重机', type: '塔吊', model: 'QTZ63', projectId: 2, projectName: '滨江花园小区', section: '四标段', status: 'fault', operator: '孙师傅', maintenanceCycle: 30, lastMaintenance: '2024-05-15', nextMaintenance: '2024-06-05' },
  { id: 6, code: 'WJJ-006', name: '履带挖掘机', type: '挖掘机', model: 'PC220', projectId: 2, projectName: '滨江花园小区', section: '三标段', status: 'working', operator: '周师傅', maintenanceCycle: 60, lastMaintenance: '2024-05-20', nextMaintenance: '2024-07-19' },
  { id: 7, code: 'OT-007', name: '柴油发电机', type: '其他', model: '200KW', projectId: 1, projectName: 'CBD中心大厦', section: '二标段', status: 'standby', operator: '吴师傅', maintenanceCycle: 90, lastMaintenance: '2024-03-15', nextMaintenance: '2024-06-13' },
  { id: 8, code: 'BC-008', name: '汽车泵', type: '泵车', model: 'ZOOMLION-47X', projectId: 1, projectName: 'CBD中心大厦', section: '一标段', status: 'working', operator: '郑师傅', maintenanceCycle: 45, lastMaintenance: '2024-05-28', nextMaintenance: '2024-07-12' }
]

const loadProjects = async () => {
  try {
    const rows = await query('SELECT id, name FROM projects ORDER BY id')
    projectList.value = rows.length ? rows : [
      { id: 1, name: 'CBD中心大厦' },
      { id: 2, name: '滨江花园小区' },
      { id: 3, name: '科技园区一期' }
    ]
  } catch (e) {
    projectList.value = [
      { id: 1, name: 'CBD中心大厦' },
      { id: 2, name: '滨江花园小区' },
      { id: 3, name: '科技园区一期' }
    ]
  }
}

const loadEquipments = async () => {
  try {
    const rows = await query('SELECT * FROM equipments ORDER BY id DESC')
    if (rows && rows.length) {
      equipmentList.value = rows.map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        model: r.model,
        projectId: r.project_id,
        projectName: r.project_name || projectList.value.find(p => p.id === r.project_id)?.name || '',
        section: r.section,
        status: r.status,
        operator: r.operator,
        maintenanceCycle: r.maintenance_cycle,
        lastMaintenance: r.last_maintenance,
        nextMaintenance: r.next_maintenance
      }))
    } else {
      equipmentList.value = mockData()
    }
  } catch (e) {
    equipmentList.value = mockData()
  }
}

onMounted(async () => {
  await loadProjects()
  await loadEquipments()
})

const filterList = () => {}

const resetFilter = () => {
  filterForm.projectId = ''
  filterForm.type = ''
  filterForm.status = ''
  filterForm.keyword = ''
}

const dialogVisible = ref(false)
const isEdit = ref(false)
const currentEquipment = ref(null)
const formRef = ref(null)
const equipmentForm = reactive({
  code: '', name: '', type: '', model: '', projectId: '', section: '', status: 'standby', maintenanceCycle: 30, operator: ''
})

const formRules = {
  code: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  status: [{ required: true, message: '请选择初始状态', trigger: 'change' }]
}

const onProjectChange = () => {
  equipmentForm.section = ''
}

const openAddDialog = () => {
  isEdit.value = false
  currentEquipment.value = null
  Object.assign(equipmentForm, { code: '', name: '', type: '', model: '', projectId: '', section: '', status: 'standby', maintenanceCycle: 30, operator: '' })
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  currentEquipment.value = row
  Object.assign(equipmentForm, {
    code: row.code, name: row.name, type: row.type, model: row.model,
    projectId: row.projectId, section: row.section, status: row.status,
    maintenanceCycle: row.maintenanceCycle, operator: row.operator
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      const project = projectList.value.find(p => p.id === equipmentForm.projectId)
      if (isEdit.value && currentEquipment.value) {
        const idx = equipmentList.value.findIndex(r => r.id === currentEquipment.value.id)
        if (idx > -1) {
          Object.assign(equipmentList.value[idx], {
            ...equipmentForm,
            projectName: project?.name || ''
          })
        }
        ElMessage.success('编辑成功')
      } else {
        const newItem = {
          id: Date.now(),
          ...equipmentForm,
          projectName: project?.name || '',
          lastMaintenance: today(),
          nextMaintenance: addDays(today(), equipmentForm.maintenanceCycle)
        }
        equipmentList.value.unshift(newItem)
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    } catch (e) {
      ElMessage.error('操作失败')
    }
  })
}

const maintenanceVisible = ref(false)
const maintenanceForm = reactive({ date: '', content: '', person: '', nextDate: '' })

const openMaintenanceDialog = (row) => {
  currentEquipment.value = row
  maintenanceForm.date = today()
  maintenanceForm.content = ''
  maintenanceForm.person = ''
  maintenanceForm.nextDate = addDays(today(), row.maintenanceCycle)
  maintenanceVisible.value = true
}

const confirmMaintenance = async () => {
  if (!maintenanceForm.person.trim()) {
    ElMessage.warning('请输入维保人员')
    return
  }
  if (!maintenanceForm.content.trim()) {
    ElMessage.warning('请输入维保内容')
    return
  }
  if (currentEquipment.value) {
    currentEquipment.value.lastMaintenance = maintenanceForm.date
    currentEquipment.value.nextMaintenance = maintenanceForm.nextDate
  }
  ElMessage.success('维保登记成功')
  maintenanceVisible.value = false
}

const logsVisible = ref(false)

const viewLogs = (row) => {
  currentEquipment.value = row
  const types = [
    { type: 'start', detail: '设备开机，开始作业' },
    { type: 'stop', detail: '设备停机，结束作业' },
    { type: 'status', detail: '切换至待机状态' },
    { type: 'fault', detail: '液压系统异常，已报修' }
  ]
  const logs = []
  for (let i = 0; i < 10; i++) {
    const t = types[i % 4]
    logs.push({
      time: formatDate(new Date(Date.now() - i * 86400000), 'YYYY-MM-DD HH:mm'),
      type: t.type,
      detail: t.detail,
      operator: ['张师傅', '李师傅', '王师傅'][i % 3]
    })
  }
  logList.value = logs
  logsVisible.value = true
}
</script>

<style scoped>
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 6px;
}
.stat-sub {
  font-size: 12px;
  color: #9ca3af;
}
.maintenance-overdue {
  color: #f56c6c;
  font-weight: 600;
}
.maintenance-warning {
  color: #e6a23c;
  font-weight: 600;
}
.warn-badge {
  font-size: 11px;
  margin-left: 4px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(245, 108, 108, 0.1);
}
.maintenance-warning .warn-badge {
  background: rgba(230, 162, 60, 0.1);
}
</style>
