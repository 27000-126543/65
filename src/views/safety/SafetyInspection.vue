<template>
  <div class="safety-inspection">
    <div class="page-card mb-16">
      <div class="page-header">
        <h2>安全巡检</h2>
        <el-button type="primary" @click="autoGenerateTasks">
          <el-icon><MagicStick /></el-icon>自动生成巡检任务
        </el-button>
      </div>

      <el-form :inline="true" :model="filterForm" class="mb-12">
        <el-form-item label="项目">
          <el-select v-model="filterForm.projectId" placeholder="全部项目" clearable style="width: 180px">
            <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域">
          <el-select v-model="filterForm.area" placeholder="全部区域" clearable style="width: 150px">
            <el-option v-for="a in areaOptions" :key="a" :label="a" :value="a" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险等级">
          <el-select v-model="filterForm.riskLevel" placeholder="全部等级" clearable style="width: 140px">
            <el-option label="高风险" value="high" />
            <el-option label="中风险" value="medium" />
            <el-option label="低风险" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="结果状态">
          <el-select v-model="filterForm.result" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="正常" value="normal" />
            <el-option label="异常" value="abnormal" />
            <el-option label="待检查" value="pending" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="filterList">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="filteredList" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="code" label="巡检编号" width="140" />
        <el-table-column prop="projectName" label="项目" min-width="160" />
        <el-table-column prop="area" label="区域" width="120" />
        <el-table-column label="风险等级" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.riskLevel === 'high'" type="danger" effect="dark">高风险</el-tag>
            <el-tag v-else-if="row.riskLevel === 'medium'" type="warning" effect="dark">中风险</el-tag>
            <el-tag v-else type="success" effect="dark">低风险</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="inspector" label="巡检人" width="100" />
        <el-table-column label="巡检日期" width="120">
          <template #default="{ row }">{{ formatDate(row.inspectDate) }}</template>
        </el-table-column>
        <el-table-column label="结果" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.result === 'normal'" type="success" size="small">正常</el-tag>
            <el-tag v-else-if="row.result === 'abnormal'" type="danger" size="small">异常</el-tag>
            <el-tag v-else type="info" size="small">待检</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="需整改" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.needRectify" type="danger" size="small">是</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openResultDialog(row)" v-if="row.result === 'pending'">结果录入</el-button>
            <el-button link type="info" size="small" @click="viewDetail(row)" v-else>查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-button type="primary" @click="openAddDialog" style="margin-bottom: 16px">
      <el-icon><Plus /></el-icon>新建巡检
    </el-button>

    <el-dialog v-model="addVisible" title="新建巡检" width="580px">
      <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="项目" prop="projectId">
              <el-select v-model="addForm.projectId" placeholder="请选择项目" style="width: 100%">
                <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="区域" prop="area">
              <el-select v-model="addForm.area" placeholder="请选择区域" style="width: 100%">
                <el-option v-for="a in areaOptions" :key="a" :label="a" :value="a" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="风险等级" prop="riskLevel">
              <el-select v-model="addForm.riskLevel" placeholder="请选择" style="width: 100%">
                <el-option label="高风险" value="high" />
                <el-option label="中风险" value="medium" />
                <el-option label="低风险" value="low" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="巡检人" prop="inspector">
              <el-input v-model="addForm.inspector" placeholder="请输入巡检人" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="标题" prop="title">
          <el-input v-model="addForm.title" placeholder="请输入巡检标题" />
        </el-form-item>
        <el-form-item label="检查项清单">
          <div class="checklist-container">
            <div v-for="(item, idx) in addForm.checklist" :key="idx" class="checklist-item">
              <el-input v-model="item.content" placeholder="请输入检查项" style="flex: 1" />
              <el-button link type="danger" @click="removeCheckItem(idx)">删除</el-button>
            </div>
            <el-button type="primary" plain size="small" @click="addCheckItem">+ 添加检查项</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">确认提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resultVisible" title="巡检结果录入" width="580px">
      <div v-if="currentInspection" class="mb-12 info-panel">
        <div><b>巡检编号：</b>{{ currentInspection.code }}</div>
        <div><b>标题：</b>{{ currentInspection.title }}</div>
        <div><b>风险等级：</b>
          <el-tag v-if="currentInspection.riskLevel === 'high'" type="danger" size="small">高风险</el-tag>
          <el-tag v-else-if="currentInspection.riskLevel === 'medium'" type="warning" size="small">中风险</el-tag>
          <el-tag v-else type="success" size="small">低风险</el-tag>
        </div>
      </div>
      <el-form :model="resultForm" :rules="resultRules" ref="resultFormRef" label-width="110px">
        <el-form-item label="检查结果" prop="result">
          <el-radio-group v-model="resultForm.result">
            <el-radio-button value="normal">正常</el-radio-button>
            <el-radio-button value="abnormal">异常</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="隐患描述" v-if="resultForm.result === 'abnormal'">
          <el-input v-model="resultForm.hazardDesc" type="textarea" :rows="3" placeholder="请描述发现的隐患问题" />
        </el-form-item>
        <el-form-item label="是否需要整改" v-if="resultForm.result === 'abnormal'">
          <el-radio-group v-model="resultForm.needRectify">
            <el-radio :value="true">是</el-radio>
            <el-radio :value="false">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="整改责任人" v-if="resultForm.needRectify">
          <el-input v-model="resultForm.responsiblePerson" placeholder="请输入整改责任人" />
        </el-form-item>
        <el-form-item label="整改期限" v-if="resultForm.needRectify">
          <el-date-picker v-model="resultForm.deadline" type="date" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="检查项结果">
          <div class="checklist-result">
            <div v-for="(item, idx) in currentInspection?.checklist || []" :key="idx" class="checklist-result-item">
              <span class="check-item-label">{{ idx + 1 }}. {{ item.content }}</span>
              <el-radio-group v-model="item.result" size="small">
                <el-radio-button :value="true">合格</el-radio-button>
                <el-radio-button :value="false">不合格</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resultVisible = false">取消</el-button>
        <el-button type="primary" @click="submitResult">确认录入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="巡检详情" width="580px">
      <div v-if="currentInspection" class="detail-content">
        <el-descriptions :column="2" border size="default">
          <el-descriptions-item label="巡检编号">{{ currentInspection.code }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ currentInspection.projectName }}</el-descriptions-item>
          <el-descriptions-item label="区域">{{ currentInspection.area }}</el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag v-if="currentInspection.riskLevel === 'high'" type="danger" size="small">高风险</el-tag>
            <el-tag v-else-if="currentInspection.riskLevel === 'medium'" type="warning" size="small">中风险</el-tag>
            <el-tag v-else type="success" size="small">低风险</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="巡检人">{{ currentInspection.inspector }}</el-descriptions-item>
          <el-descriptions-item label="巡检日期">{{ formatDate(currentInspection.inspectDate) }}</el-descriptions-item>
          <el-descriptions-item label="检查结果" :span="2">
            <el-tag v-if="currentInspection.result === 'normal'" type="success">正常</el-tag>
            <el-tag v-else type="danger">异常</el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentInspection.result === 'abnormal'" label="隐患描述" :span="2">{{ currentInspection.hazardDesc || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentInspection.result === 'abnormal'" label="需整改" :span="2">{{ currentInspection.needRectify ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentInspection.needRectify" label="整改责任人">{{ currentInspection.responsiblePerson }}</el-descriptions-item>
          <el-descriptions-item v-if="currentInspection.needRectify" label="整改期限">{{ formatDate(currentInspection.deadline) }}</el-descriptions-item>
        </el-descriptions>
        <div class="mt-16">
          <div class="section-title" style="margin-bottom: 10px">检查项清单</div>
          <el-table :data="currentInspection.checklist || []" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="content" label="检查项" />
            <el-table-column label="结果" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.result === true" type="success" size="small">合格</el-tag>
                <el-tag v-else-if="row.result === false" type="danger" size="small">不合格</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, MagicStick } from '@element-plus/icons-vue'
import { formatDate, today, generateOrderNo, addDays } from '../../utils/helpers'
import { query, exec } from '../../utils/db'

const inspectionList = ref([])
const projectList = ref([])
const areaOptions = ['基坑区域', '脚手架区', '塔吊作业区', '临时用电区', '材料堆放区', '宿舍区', '办公区', '出入口']

const filterForm = reactive({ projectId: '', area: '', riskLevel: '', result: '' })

const filteredList = computed(() => {
  let list = [...inspectionList.value]
  if (filterForm.projectId) list = list.filter(r => r.projectId === filterForm.projectId)
  if (filterForm.area) list = list.filter(r => r.area === filterForm.area)
  if (filterForm.riskLevel) list = list.filter(r => r.riskLevel === filterForm.riskLevel)
  if (filterForm.result) list = list.filter(r => r.result === filterForm.result)
  return list
})

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

const genChecklist = (risk) => {
  if (risk === 'high') {
    return [
      { content: '临边防护设施完好', result: null },
      { content: '安全警示标识齐全', result: null },
      { content: '作业人员佩戴安全帽', result: null },
      { content: '特种作业人员持证上岗', result: null },
      { content: '机械设备安全装置有效', result: null }
    ]
  } else if (risk === 'medium') {
    return [
      { content: '现场材料堆放规范', result: null },
      { content: '消防设施配备齐全', result: null },
      { content: '用电线路规范敷设', result: null }
    ]
  } else {
    return [
      { content: '现场卫生整洁', result: null },
      { content: '通道畅通无阻', result: null }
    ]
  }
}

const mockData = () => {
  const data = []
  const titles = [
    { t: '基坑边坡稳定性检查', r: 'high', a: '基坑区域' },
    { t: '脚手架搭设安全检查', r: 'high', a: '脚手架区' },
    { t: '塔吊吊装作业巡查', r: 'high', a: '塔吊作业区' },
    { t: '施工现场临时用电', r: 'medium', a: '临时用电区' },
    { t: '材料堆放规范检查', r: 'medium', a: '材料堆放区' },
    { t: '消防设施日常巡查', r: 'medium', a: '办公区' },
    { t: '生活区卫生检查', r: 'low', a: '宿舍区' },
    { t: '出入口安保检查', r: 'low', a: '出入口' }
  ]
  const results = ['normal', 'abnormal', 'pending', 'normal', 'abnormal', 'pending', 'normal', 'pending']
  const inspectors = ['李安全', '王巡检', '张监督员', '赵安全员']
  for (let i = 0; i < titles.length; i++) {
    const item = titles[i]
    const needRectify = results[i] === 'abnormal' && Math.random() > 0.3
    data.push({
      id: i + 1,
      code: generateOrderNo('XJ'),
      projectId: (i % 2) + 1,
      projectName: (i % 2) === 0 ? 'CBD中心大厦' : '滨江花园小区',
      area: item.a,
      riskLevel: item.r,
      title: item.t,
      inspector: inspectors[i % 4],
      inspectDate: formatDate(addDays(today(), -i)),
      result: results[i],
      hazardDesc: needRectify ? '发现部分安全防护措施不到位，存在安全隐患' : (results[i] === 'abnormal' ? '轻微问题，现场已整改' : ''),
      needRectify: needRectify,
      responsiblePerson: needRectify ? '刘工头' : '',
      deadline: needRectify ? formatDate(addDays(today(), 5 + i)) : '',
      checklist: genChecklist(item.r).map(c => ({ ...c, result: results[i] === 'pending' ? null : Math.random() > 0.2 }))
    })
  }
  return data
}

const loadInspections = async () => {
  try {
    const rows = await query('SELECT * FROM safety_inspections ORDER BY id DESC')
    if (rows && rows.length) {
      inspectionList.value = rows.map(r => ({
        id: r.id, code: r.code, projectId: r.project_id, projectName: r.project_name || '',
        area: r.area, riskLevel: r.risk_level, title: r.title, inspector: r.inspector,
        inspectDate: r.inspect_date, result: r.result, hazardDesc: r.hazard_desc,
        needRectify: r.need_rectify ? true : false, responsiblePerson: r.responsible_person,
        deadline: r.deadline, checklist: r.checklist ? JSON.parse(r.checklist) : []
      }))
    } else {
      inspectionList.value = mockData()
    }
  } catch (e) {
    inspectionList.value = mockData()
  }
}

onMounted(async () => {
  await loadProjects()
  await loadInspections()
})

const filterList = () => {}

const resetFilter = () => {
  filterForm.projectId = ''
  filterForm.area = ''
  filterForm.riskLevel = ''
  filterForm.result = ''
}

const autoGenerateTasks = async () => {
  const riskLevels = [
    { level: 'high', name: '高风险区域', areas: ['基坑区域', '塔吊作业区', '脚手架区'] },
    { level: 'medium', name: '中风险区域', areas: ['临时用电区', '材料堆放区'] },
    { level: 'low', name: '低风险区域', areas: ['宿舍区', '办公区', '出入口'] }
  ]
  const project = projectList.value[0]
  if (!project) {
    ElMessage.warning('暂无项目数据')
    return
  }
  let count = 0
  riskLevels.forEach(rl => {
    rl.areas.forEach(area => {
      const titlesByArea = {
        '基坑区域': '基坑边坡稳定性检查',
        '塔吊作业区': '塔吊吊装作业巡查',
        '脚手架区': '脚手架搭设安全检查',
        '临时用电区': '施工现场临时用电检查',
        '材料堆放区': '材料堆放规范检查',
        '宿舍区': '生活区安全卫生检查',
        '办公区': '办公区消防检查',
        '出入口': '出入口安保检查'
      }
      inspectionList.value.unshift({
        id: Date.now() + count,
        code: generateOrderNo('XJ'),
        projectId: project.id,
        projectName: project.name,
        area,
        riskLevel: rl.level,
        title: titlesByArea[area] || `${area}安全巡检`,
        inspector: '系统自动分配',
        inspectDate: today(),
        result: 'pending',
        hazardDesc: '',
        needRectify: false,
        responsiblePerson: '',
        deadline: '',
        checklist: genChecklist(rl.level)
      })
      count++
    })
  })
  ElMessage.success(`已自动生成 ${count} 条巡检任务`)
}

const addVisible = ref(false)
const addFormRef = ref(null)
const addForm = reactive({
  projectId: '', area: '', riskLevel: '', inspector: '', title: '',
  checklist: [{ content: '' }]
})

const addRules = {
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  area: [{ required: true, message: '请选择区域', trigger: 'change' }],
  riskLevel: [{ required: true, message: '请选择风险等级', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  inspector: [{ required: true, message: '请输入巡检人', trigger: 'blur' }]
}

const openAddDialog = () => {
  Object.assign(addForm, {
    projectId: '', area: '', riskLevel: '', inspector: '', title: '',
    checklist: [{ content: '' }]
  })
  addVisible.value = true
}

const addCheckItem = () => {
  addForm.checklist.push({ content: '' })
}

const removeCheckItem = (idx) => {
  if (addForm.checklist.length > 1) addForm.checklist.splice(idx, 1)
}

const submitAdd = async () => {
  if (!addFormRef.value) return
  await addFormRef.value.validate((valid) => {
    if (!valid) return
    const checklist = addForm.checklist.filter(c => c.content.trim())
    if (!checklist.length) {
      ElMessage.warning('请至少填写一个检查项')
      return
    }
    const project = projectList.value.find(p => p.id === addForm.projectId)
    inspectionList.value.unshift({
      id: Date.now(),
      code: generateOrderNo('XJ'),
      projectId: addForm.projectId,
      projectName: project?.name || '',
      area: addForm.area,
      riskLevel: addForm.riskLevel,
      title: addForm.title,
      inspector: addForm.inspector,
      inspectDate: today(),
      result: 'pending',
      hazardDesc: '',
      needRectify: false,
      responsiblePerson: '',
      deadline: '',
      checklist: checklist.map(c => ({ content: c.content, result: null }))
    })
    ElMessage.success('巡检任务已创建')
    addVisible.value = false
  })
}

const resultVisible = ref(false)
const detailVisible = ref(false)
const currentInspection = ref(null)
const resultFormRef = ref(null)
const resultForm = reactive({ result: 'normal', hazardDesc: '', needRectify: false, responsiblePerson: '', deadline: '' })

const resultRules = {
  result: [{ required: true, message: '请选择检查结果', trigger: 'change' }]
}

const openResultDialog = (row) => {
  currentInspection.value = JSON.parse(JSON.stringify(row))
  Object.assign(resultForm, { result: 'normal', hazardDesc: '', needRectify: false, responsiblePerson: '', deadline: '' })
  resultVisible.value = true
}

const viewDetail = (row) => {
  currentInspection.value = row
  detailVisible.value = true
}

const submitResult = async () => {
  if (!resultFormRef.value) return
  await resultFormRef.value.validate((valid) => {
    if (!valid) return
    if (resultForm.result === 'abnormal' && resultForm.needRectify) {
      if (!resultForm.responsiblePerson.trim()) {
        ElMessage.warning('请输入整改责任人')
        return
      }
      if (!resultForm.deadline) {
        ElMessage.warning('请选择整改期限')
        return
      }
    }
    if (currentInspection.value) {
      const idx = inspectionList.value.findIndex(r => r.id === currentInspection.value.id)
      if (idx > -1) {
        Object.assign(inspectionList.value[idx], {
          result: resultForm.result,
          hazardDesc: resultForm.hazardDesc,
          needRectify: resultForm.needRectify,
          responsiblePerson: resultForm.responsiblePerson,
          deadline: resultForm.deadline,
          checklist: currentInspection.value.checklist
        })
      }
    }
    ElMessage.success('结果录入成功')
    resultVisible.value = false
  })
}
</script>

<style scoped>
.checklist-container {
  width: 100%;
}
.checklist-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.checklist-result {
  width: 100%;
}
.checklist-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #eee;
}
.checklist-result-item:last-child {
  border-bottom: none;
}
.check-item-label {
  flex: 1;
  font-size: 13px;
  color: #374151;
}
.info-panel {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.8;
}
.mt-16 {
  margin-top: 16px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}
</style>
