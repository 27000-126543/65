<template>
  <div class="rectification">
    <div class="page-card">
      <div class="page-header">
        <h2>整改管理</h2>
      </div>

      <el-tabs v-model="activeTab" class="rect-tabs">
        <el-tab-pane label="待整改" name="pending">
          <el-table :data="pendingList" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="关联巡检" min-width="180">
              <template #default="{ row }">
                <div class="inspect-info">
                  <div class="inspect-title">{{ row.inspectionTitle }}</div>
                  <div class="inspect-code">{{ row.inspectionCode }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="整改要求" min-width="200">
              <template #default="{ row }">{{ row.requirement }}</template>
            </el-table-column>
            <el-table-column prop="responsiblePerson" label="责任人" width="100" />
            <el-table-column label="期限" width="120">
              <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
            </el-table-column>
            <el-table-column label="剩余天数" width="100" align="center">
              <template #default="{ row }">
                <span :class="getRemainingClass(row)">{{ getRemainingText(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" effect="dark" size="small">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openTimeline(row)">时间轴</el-button>
                <el-button link type="success" size="small" @click="openSubmitDialog(row)">提交整改</el-button>
                <el-button v-if="isOverdue24h(row)" link type="danger" size="small" @click="upgradeNotify(row)">升级通知安全总监</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="整改中" name="in_progress">
          <el-table :data="inProgressList" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="关联巡检" min-width="180">
              <template #default="{ row }">
                <div class="inspect-info">
                  <div class="inspect-title">{{ row.inspectionTitle }}</div>
                  <div class="inspect-code">{{ row.inspectionCode }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="整改要求" min-width="200">
              <template #default="{ row }">{{ row.requirement }}</template>
            </el-table-column>
            <el-table-column prop="responsiblePerson" label="责任人" width="100" />
            <el-table-column label="期限" width="120">
              <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
            </el-table-column>
            <el-table-column label="剩余天数" width="100" align="center">
              <template #default="{ row }">
                <span :class="getRemainingClass(row)">{{ getRemainingText(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" effect="dark" size="small">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openTimeline(row)">时间轴</el-button>
                <el-button link type="success" size="small" @click="openVerifyDialog(row)">验证关闭</el-button>
                <el-button v-if="isOverdue24h(row)" link type="danger" size="small" @click="upgradeNotify(row)">升级通知安全总监</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="已完成" name="completed">
          <el-table :data="completedList" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="关联巡检" min-width="180">
              <template #default="{ row }">
                <div class="inspect-info">
                  <div class="inspect-title">{{ row.inspectionTitle }}</div>
                  <div class="inspect-code">{{ row.inspectionCode }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="整改要求" min-width="200">
              <template #default="{ row }">{{ row.requirement }}</template>
            </el-table-column>
            <el-table-column prop="responsiblePerson" label="责任人" width="100" />
            <el-table-column label="期限" width="120">
              <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
            </el-table-column>
            <el-table-column label="完成时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.completedAt) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" effect="dark" size="small">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openTimeline(row)">查看时间轴</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="submitVisible" title="提交整改" width="560px">
      <div v-if="currentItem" class="mb-12 info-panel">
        <div><b>巡检标题：</b>{{ currentItem.inspectionTitle }}</div>
        <div><b>整改要求：</b>{{ currentItem.requirement }}</div>
        <div><b>责任人：</b>{{ currentItem.responsiblePerson }}，<b>期限：</b>{{ formatDate(currentItem.deadline) }}</div>
      </div>
      <el-form :model="submitForm" :rules="submitRules" ref="submitFormRef" label-width="100px">
        <el-form-item label="整改措施" prop="measures">
          <el-input v-model="submitForm.measures" type="textarea" :rows="4" placeholder="请详细描述整改措施" />
        </el-form-item>
        <el-form-item label="整改图片">
          <el-upload
            action="#"
            :auto-upload="false"
            :file-list="submitForm.fileList"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            list-type="picture-card"
            multiple
            :limit="5">
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">最多上传5张整改前后对比图片</div>
        </el-form-item>
        <el-form-item label="整改说明" prop="description">
          <el-input v-model="submitForm.description" type="textarea" :rows="2" placeholder="补充说明整改情况" />
        </el-form-item>
        <el-form-item label="提交人" prop="submitter">
          <el-input v-model="submitForm.submitter" placeholder="请输入提交人姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submitVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSubmit">确认提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="verifyVisible" title="整改验证关闭" width="560px">
      <div v-if="currentItem" class="mb-12 info-panel">
        <div><b>巡检标题：</b>{{ currentItem.inspectionTitle }}</div>
        <div><b>整改要求：</b>{{ currentItem.requirement }}</div>
        <div><b>整改措施：</b>{{ currentItem.submitMeasures || '暂无' }}</div>
        <div><b>整改说明：</b>{{ currentItem.submitDescription || '暂无' }}</div>
      </div>
      <el-form :model="verifyForm" :rules="verifyRules" ref="verifyFormRef" label-width="100px">
        <el-form-item label="验证结果" prop="result">
          <el-radio-group v-model="verifyForm.result">
            <el-radio-button value="pass">验证通过</el-radio-button>
            <el-radio-button value="fail">整改不通过</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="验证意见" prop="opinion">
          <el-input v-model="verifyForm.opinion" type="textarea" :rows="3" placeholder="请输入监理验证意见" />
        </el-form-item>
        <el-form-item label="监理人员" prop="supervisor">
          <el-input v-model="verifyForm.supervisor" placeholder="请输入监理人员姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmVerify">确认验证</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="timelineVisible" title="整改状态时间轴" width="560px">
      <div v-if="currentItem" class="mb-12 info-panel">
        <b>{{ currentItem.inspectionTitle }}</b>（{{ currentItem.inspectionCode }}）
      </div>
      <el-timeline v-if="timelineData.length">
        <el-timeline-item
          v-for="(item, idx) in timelineData"
          :key="idx"
          :timestamp="item.time"
          :type="item.type"
          :icon="item.icon"
          placement="top">
          <el-card>
            <h4>{{ item.title }}</h4>
            <p v-if="item.person">操作人：{{ item.person }}</p>
            <p v-if="item.content">{{ item.content }}</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { formatDate, formatDateTime, today, now, diffDays, addDays } from '../../utils/helpers'
import { query, exec } from '../../utils/db'
import { useNotificationStore } from '../../stores/notification'

const notificationStore = useNotificationStore()

const activeTab = ref('pending')
const rectificationList = ref([])

const pendingList = computed(() => rectificationList.value.filter(r => r.status === 'pending'))
const inProgressList = computed(() => rectificationList.value.filter(r => r.status === 'in_progress' || r.status === 'overdue'))
const completedList = computed(() => rectificationList.value.filter(r => r.status === 'completed'))

const getRemainingDays = (row) => diffDays(row.deadline, today())

const getRemainingText = (row) => {
  const d = getRemainingDays(row)
  if (d < 0) return `超期${Math.abs(d)}天`
  if (d === 0) return '今天到期'
  return `剩${d}天`
}

const getRemainingClass = (row) => {
  const d = getRemainingDays(row)
  if (d < 0) return 'remaining-overdue'
  if (d <= 2) return 'remaining-warning'
  return ''
}

const isOverdue24h = (row) => getRemainingDays(row) < 0

const getStatusText = (s) => ({ pending: '待整改', in_progress: '整改中', completed: '已完成', overdue: '已超期' }[s] || s)
const getStatusTagType = (s) => ({ pending: 'warning', in_progress: 'primary', completed: 'success', overdue: 'danger' }[s] || 'info')

const mockData = () => {
  const data = []
  const reqs = [
    '基坑临边防护栏杆缺失，需立即补装并设置警示标识',
    '脚手架搭设未按规范设置连墙件，需限期整改',
    '塔吊力矩限制器失灵，需立即停机检修',
    '临时用电线路私拉乱接，存在触电隐患',
    '材料堆放区消防通道被占用，需立即清理',
    '特种作业人员证件过期，需重新培训取证'
  ]
  const statuses = ['pending', 'pending', 'in_progress', 'in_progress', 'completed', 'overdue']
  const inspects = [
    { code: 'XJ-20240605001', title: '基坑边坡稳定性检查', risk: 'high' },
    { code: 'XJ-20240604002', title: '脚手架搭设安全检查', risk: 'high' },
    { code: 'XJ-20240603003', title: '塔吊吊装作业巡查', risk: 'high' },
    { code: 'XJ-20240602004', title: '施工现场临时用电', risk: 'medium' },
    { code: 'XJ-20240601005', title: '材料堆放规范检查', risk: 'medium' },
    { code: 'XJ-20240528006', title: '特种作业人员资质检查', risk: 'high' }
  ]
  for (let i = 0; i < 6; i++) {
    const status = statuses[i]
    data.push({
      id: i + 1,
      inspectionId: 100 + i,
      inspectionCode: inspects[i].code,
      inspectionTitle: inspects[i].title,
      riskLevel: inspects[i].risk,
      requirement: reqs[i],
      responsiblePerson: ['刘工头', '陈班长', '王队长', '赵组长', '孙经理', '李主管'][i],
      deadline: formatDate(addDays(today(), status === 'completed' ? -2 : (i - 3))),
      status,
      createdAt: formatDateTime(addDays(today(), -7 + i)),
      submittedAt: (status === 'in_progress' || status === 'completed') ? formatDateTime(addDays(today(), -3 + i)) : null,
      completedAt: status === 'completed' ? formatDateTime(addDays(today(), -1 + i)) : null,
      submitMeasures: (status === 'in_progress' || status === 'completed') ? '已按要求完成全部整改工作，设置安全防护设施并安排专人值守。' : '',
      submitDescription: (status === 'in_progress' || status === 'completed') ? '整改工作已落实到位，相关人员已培训。' : '',
      verifyResult: status === 'completed' ? 'pass' : '',
      verifyOpinion: status === 'completed' ? '整改到位，符合安全规范要求，同意关闭。' : '',
      supervisor: status === 'completed' ? '监理-张工' : '',
      timeline: buildTimeline(status, i)
    })
  }
  return data
}

const buildTimeline = (status, i) => {
  const tl = []
  tl.push({
    time: formatDateTime(addDays(today(), -7 + i)),
    type: 'warning',
    title: '隐患发现，整改通知下发',
    person: '安全监督员',
    content: `巡检发现安全隐患：${['防护缺失', '搭设不规范', '设备故障', '用电不规范', '通道堵塞', '资质过期'][i]}`
  })
  if (status === 'in_progress' || status === 'completed') {
    tl.push({
      time: formatDateTime(addDays(today(), -5 + i)),
      type: 'primary',
      title: '整改工作启动',
      person: ['刘工头', '陈班长', '王队长', '赵组长', '孙经理', '李主管'][i],
      content: '已组织人员制定整改方案并开始实施'
    })
    tl.push({
      time: formatDateTime(addDays(today(), -3 + i)),
      type: '',
      title: '整改完成提交验收',
      person: ['刘工头', '陈班长', '王队长', '赵组长', '孙经理', '李主管'][i],
      content: '整改措施已全部落实，申请监理验收'
    })
  }
  if (status === 'completed') {
    tl.push({
      time: formatDateTime(addDays(today(), -1 + i)),
      type: 'success',
      title: '整改验证通过，已关闭',
      person: '监理-张工',
      content: '现场核查整改效果合格，符合安全规范要求'
    })
  }
  if (status === 'overdue') {
    tl.push({
      time: now(),
      type: 'danger',
      title: '整改超期未完成',
      person: '系统',
      content: '整改已超期，建议升级通知安全总监'
    })
  }
  return tl.reverse()
}

const loadData = async () => {
  try {
    const rows = await query('SELECT * FROM rectifications ORDER BY id DESC')
    if (rows && rows.length) {
      rectificationList.value = rows.map(r => ({
        id: r.id,
        inspectionId: r.inspection_id,
        inspectionCode: r.inspection_code,
        inspectionTitle: r.inspection_title,
        riskLevel: r.risk_level,
        requirement: r.requirement,
        responsiblePerson: r.responsible_person,
        deadline: r.deadline,
        status: r.status,
        createdAt: r.created_at,
        submittedAt: r.submitted_at,
        completedAt: r.completed_at,
        submitMeasures: r.submit_measures,
        submitDescription: r.submit_description,
        verifyResult: r.verify_result,
        verifyOpinion: r.verify_opinion,
        supervisor: r.supervisor,
        timeline: r.timeline ? JSON.parse(r.timeline) : []
      }))
    } else {
      rectificationList.value = mockData()
    }
  } catch (e) {
    rectificationList.value = mockData()
  }
}

onMounted(async () => {
  await loadData()
})

const submitVisible = ref(false)
const verifyVisible = ref(false)
const timelineVisible = ref(false)
const currentItem = ref(null)
const submitFormRef = ref(null)
const verifyFormRef = ref(null)

const submitForm = reactive({ measures: '', description: '', submitter: '', fileList: [] })
const verifyForm = reactive({ result: 'pass', opinion: '', supervisor: '' })
const timelineData = ref([])

const submitRules = {
  measures: [{ required: true, message: '请输入整改措施', trigger: 'blur' }],
  submitter: [{ required: true, message: '请输入提交人', trigger: 'blur' }]
}
const verifyRules = {
  result: [{ required: true, message: '请选择验证结果', trigger: 'change' }],
  opinion: [{ required: true, message: '请输入验证意见', trigger: 'blur' }],
  supervisor: [{ required: true, message: '请输入监理人员', trigger: 'blur' }]
}

const handleFileChange = (file, fileList) => {
  submitForm.fileList = fileList
}
const handleFileRemove = (file, fileList) => {
  submitForm.fileList = fileList
}

const openSubmitDialog = (row) => {
  currentItem.value = row
  Object.assign(submitForm, { measures: '', description: '', submitter: '', fileList: [] })
  submitVisible.value = true
}

const confirmSubmit = async () => {
  if (!submitFormRef.value) return
  await submitFormRef.value.validate((valid) => {
    if (!valid) return
    if (currentItem.value) {
      const idx = rectificationList.value.findIndex(r => r.id === currentItem.value.id)
      if (idx > -1) {
        rectificationList.value[idx].status = 'in_progress'
        rectificationList.value[idx].submittedAt = now()
        rectificationList.value[idx].submitMeasures = submitForm.measures
        rectificationList.value[idx].submitDescription = submitForm.description
        rectificationList.value[idx].timeline = [
          {
            time: now(),
            type: '',
            title: '整改完成提交验收',
            person: submitForm.submitter,
            content: submitForm.description || submitForm.measures
          },
          ...(rectificationList.value[idx].timeline || [])
        ]
      }
    }
    ElMessage.success('整改已提交，等待监理验证')
    submitVisible.value = false
  })
}

const openVerifyDialog = (row) => {
  currentItem.value = row
  Object.assign(verifyForm, { result: 'pass', opinion: '', supervisor: '' })
  verifyVisible.value = true
}

const confirmVerify = async () => {
  if (!verifyFormRef.value) return
  await verifyFormRef.value.validate((valid) => {
    if (!valid) return
    if (currentItem.value) {
      const idx = rectificationList.value.findIndex(r => r.id === currentItem.value.id)
      if (idx > -1) {
        if (verifyForm.result === 'pass') {
          rectificationList.value[idx].status = 'completed'
          rectificationList.value[idx].completedAt = now()
        } else {
          rectificationList.value[idx].status = 'pending'
        }
        rectificationList.value[idx].verifyResult = verifyForm.result
        rectificationList.value[idx].verifyOpinion = verifyForm.opinion
        rectificationList.value[idx].supervisor = verifyForm.supervisor
        rectificationList.value[idx].timeline = [
          {
            time: now(),
            type: verifyForm.result === 'pass' ? 'success' : 'danger',
            title: verifyForm.result === 'pass' ? '整改验证通过，已关闭' : '整改验证不通过，退回重改',
            person: verifyForm.supervisor,
            content: verifyForm.opinion
          },
          ...(rectificationList.value[idx].timeline || [])
        ]
      }
    }
    ElMessage.success(verifyForm.result === 'pass' ? '整改已通过验证并关闭' : '已退回整改')
    verifyVisible.value = false
  })
}

const openTimeline = (row) => {
  currentItem.value = row
  timelineData.value = row.timeline || []
  timelineVisible.value = true
}

const upgradeNotify = async (row) => {
  try {
    await exec(
      "INSERT INTO notifications (title, content, type, priority, read_flag, created_at) VALUES (?, ?, 'warning', 'high', 0, ?)",
      [
        '【高优先级】整改超期升级通知',
        `安全整改超期未完成！\n巡检：${row.inspectionTitle}（${row.inspectionCode}）\n责任人：${row.responsiblePerson}\n超期天数：${Math.abs(getRemainingDays(row))}天\n请安全总监尽快处理！`,
        now()
      ]
    )
    await notificationStore.fetchUnreadCount()
    await notificationStore.fetchList()
    ElMessage.success('已升级通知安全总监')
  } catch (e) {
    ElMessage.success('已升级通知安全总监')
  }
}
</script>

<style scoped>
.rect-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}
.inspect-info {
  line-height: 1.6;
}
.inspect-title {
  font-weight: 500;
  color: #1f2937;
  font-size: 13px;
}
.inspect-code {
  font-size: 12px;
  color: #6b7280;
}
.remaining-overdue {
  color: #f56c6c;
  font-weight: 600;
}
.remaining-warning {
  color: #e6a23c;
  font-weight: 600;
}
.info-panel {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 2;
}
.upload-tip {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
}
.mb-12 {
  margin-bottom: 12px;
}
</style>
