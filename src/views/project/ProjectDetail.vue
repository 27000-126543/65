<template>
  <div class="project-detail" v-loading="loading">
    <div class="page-card mb-16" v-if="project">
      <div class="detail-header">
        <div class="header-left">
          <el-button link :icon="ArrowLeft" @click="goBack">返回</el-button>
          <h2 class="project-name">{{ project.name }}</h2>
          <el-tag :type="statusTagType(project.status)" effect="dark" size="large">{{ statusText(project.status) }}</el-tag>
        </div>
        <div class="header-right">
          <el-button v-if="project.status === 'draft'" type="primary" :icon="Promotion" @click="handleSubmitApproval">提交审批</el-button>
          <el-button :icon="Edit" @click="goEdit">编辑</el-button>
        </div>
      </div>

      <el-row :gutter="20" class="info-row">
        <el-col :span="6">
          <div class="info-item">
            <div class="info-label">项目类型</div>
            <div class="info-value">{{ project.type || '-' }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <div class="info-label">总投资额</div>
            <div class="info-value highlight">{{ formatMoney(project.total_investment) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <div class="info-label">合同工期</div>
            <div class="info-value">{{ project.contract_days }} 天</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <div class="info-label">创建时间</div>
            <div class="info-value">{{ formatDate(project.created_at, 'YYYY-MM-DD HH:mm') }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <div class="info-label">计划开工日期</div>
            <div class="info-value">{{ project.plan_start_date || '-' }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <div class="info-label">计划竣工日期</div>
            <div class="info-value">{{ project.plan_end_date || '-' }}</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="page-card" v-if="project">
      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="basic">
          <div class="section-title">参建单位</div>
          <el-table :data="contractors" border size="default" style="width: 100%">
            <el-table-column type="index" label="序号" width="70" align="center" />
            <el-table-column prop="name" label="单位名称" min-width="260" />
            <el-table-column prop="role" label="角色" width="150">
              <template #default="{ row }">
                <el-tag type="info" effect="plain">{{ row.role }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="加入时间" width="180">
              <template #default="{ row }">{{ formatDate(row.created_at, 'YYYY-MM-DD HH:mm') }}</template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无参建单位信息" :image-size="60" />
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="进度计划" name="schedule">
          <div class="section-title">进度记录</div>
          <el-table :data="progressList" border size="default" style="width: 100%">
            <el-table-column label="日期" width="140">
              <template #default="{ row }">{{ formatDate(row.record_date) }}</template>
            </el-table-column>
            <el-table-column label="整体进度" width="160">
              <template #default="{ row }">
                <el-progress :percentage="Math.round((row.overall_progress || 0) * 100)" :stroke-width="12" status="success" />
              </template>
            </el-table-column>
            <el-table-column prop="description" label="进度说明" min-width="300" />
            <el-table-column label="记录人" width="120">
              <template #default="{ row }">{{ row.record_by || '-' }}</template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无进度记录" :image-size="60" />
            </template>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="施工区可视化" name="zones">
          <div class="section-title">施工分区进度</div>
          <div class="zones-grid">
            <div v-for="zone in zones" :key="zone.id" class="zone-card">
              <div class="zone-header">
                <span class="zone-name">{{ zone.name }}</span>
                <el-tag size="small" :type="zoneStatusTag(zone.status)">{{ zoneStatusText(zone.status) }}</el-tag>
              </div>
              <div class="zone-body">
                <el-progress
                  type="dashboard"
                  :percentage="Math.round((zone.progress || 0) * 100)"
                  :width="120"
                  :stroke-width="10"
                  color="#67c23a"
                />
              </div>
              <div class="zone-footer">
                <div class="zone-info-item">
                  <span class="label">负责人</span>
                  <span class="value">{{ zone.manager || '-' }}</span>
                </div>
                <div class="zone-info-item">
                  <span class="label">面积</span>
                  <span class="value">{{ zone.area ? zone.area + ' ㎡' : '-' }}</span>
                </div>
              </div>
            </div>
            <el-empty v-if="zones.length === 0" description="暂无施工分区数据" :image-size="80" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="统计概览" name="stats">
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="mini-stat">
                <div class="mini-stat-icon icon-green"><el-icon><Money /></el-icon></div>
                <div class="mini-stat-info">
                  <div class="mini-stat-value">{{ formatMoney(project?.total_investment || 0) }}</div>
                  <div class="mini-stat-label">总投资额</div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="mini-stat">
                <div class="mini-stat-icon icon-blue"><el-icon><Calendar /></el-icon></div>
                <div class="mini-stat-info">
                  <div class="mini-stat-value">{{ project?.contract_days || 0 }} 天</div>
                  <div class="mini-stat-label">合同工期</div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="mini-stat">
                <div class="mini-stat-icon icon-orange"><el-icon><User /></el-icon></div>
                <div class="mini-stat-info">
                  <div class="mini-stat-value">{{ contractors.length }} 家</div>
                  <div class="mini-stat-label">参建单位</div>
                </div>
              </div>
            </el-col>
          </el-row>
          <el-row class="mt-16">
            <el-col :span="12">
              <div class="page-card" style="background:#fafafa">
                <div class="section-title">参建单位角色分布</div>
                <div ref="roleChartRef" class="chart-medium"></div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="page-card" style="background:#fafafa">
                <div class="section-title">施工区进度对比</div>
                <div ref="zoneChartRef" class="chart-medium"></div>
              </div>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Edit, Promotion, Money, Calendar, User } from '@element-plus/icons-vue'
import { formatMoney, formatDate, formatPercent } from '../../utils/helpers'
import { useProjectStore } from '../../stores/project'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const projectId = route.params.id
const loading = ref(false)
const activeTab = ref('basic')
const project = ref(null)
const contractors = ref([])
const zones = ref([])
const progressList = ref([])

const roleChartRef = ref(null)
const zoneChartRef = ref(null)
let roleChart = null
let zoneChart = null

const statusText = (s) => ({ draft: '草稿', approved: '已审批', in_progress: '进行中', pending_approval: '待审批', completed: '已完成' }[s] || s)
const statusTagType = (s) => ({ draft: 'info', approved: 'success', in_progress: 'primary', pending_approval: 'warning', completed: '' }[s] || '')
const zoneStatusText = (s) => ({ not_started: '未开始', in_progress: '施工中', completed: '已完成', paused: '暂停' }[s] || s)
const zoneStatusTag = (s) => ({ not_started: 'info', in_progress: 'primary', completed: 'success', paused: 'warning' }[s] || '')

const goBack = () => router.back()
const goEdit = () => router.push(`/project/register`)

const handleSubmitApproval = async () => {
  try {
    await ElMessageBox.confirm('确认提交项目审批？提交后将通知审批人员。', '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
  } catch { return }
  const ok = await projectStore.submitApproval(project.value.id, project.value.name)
  if (ok) {
    ElMessage.success('提交成功，已进入审批流程')
    loadData()
  } else {
    ElMessage.error('提交失败')
  }
}

const loadData = async () => {
  loading.value = true
  try {
    project.value = await projectStore.fetchById(projectId)
    contractors.value = await projectStore.fetchContractors(projectId)
    zones.value = await projectStore.fetchZones(projectId)
    progressList.value = await projectStore.fetchProgress(projectId)
  } finally {
    loading.value = false
  }
}

const initRoleChart = () => {
  if (!roleChartRef.value) return
  roleChart?.dispose()
  roleChart = echarts.init(roleChartRef.value)
  const roleCount = {}
  contractors.value.forEach(c => {
    roleCount[c.role] = (roleCount[c.role] || 0) + 1
  })
  const data = Object.entries(roleCount).map(([name, value]) => ({ name, value }))
  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '45%'],
      label: { show: true, formatter: '{b}: {c}' },
      data: data.length ? data : [{ name: '暂无数据', value: 1 }],
      color: ['#67c23a', '#409eff', '#e6a23c', '#f56c6c', '#909399', '#8e44ad']
    }]
  }
  roleChart.setOption(option)
}

const initZoneChart = () => {
  if (!zoneChartRef.value) return
  zoneChart?.dispose()
  zoneChart = echarts.init(zoneChartRef.value)
  const names = zones.value.map(z => z.name)
  const values = zones.value.map(z => Math.round((z.progress || 0) * 100))
  const option = {
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    grid: { left: 50, right: 30, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: names.length ? names : ['暂无数据'],
      axisLabel: { fontSize: 11, rotate: names.length > 4 ? 20 : 0 }
    },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'bar',
      data: values.length ? values : [0],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#67c23a' },
          { offset: 1, color: '#95d475' }
        ]),
        borderRadius: [4, 4, 0, 0]
      },
      barWidth: names.length > 6 ? 20 : 36,
      label: { show: true, position: 'top', formatter: '{c}%' }
    }]
  }
  zoneChart.setOption(option)
}

const handleResize = () => {
  roleChart?.resize()
  zoneChart?.resize()
}

watch(activeTab, async (tab) => {
  if (tab === 'stats') {
    await nextTick()
    initRoleChart()
    initZoneChart()
  }
})

onMounted(async () => {
  await loadData()
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.project-detail {
  width: 100%;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.project-name {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}
.header-right {
  display: flex;
  gap: 8px;
}
.info-row {
  margin-bottom: 4px;
}
.info-item {
  padding: 8px 0;
}
.info-label {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}
.info-value {
  font-size: 15px;
  font-weight: 500;
  color: #1f2937;
}
.info-value.highlight {
  color: #e6a23c;
  font-weight: 600;
}
.detail-tabs {
  margin-top: 4px;
}
:deep(.el-tabs__header) {
  margin-bottom: 16px;
}
:deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
}
.zones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding: 4px 0;
}
.zone-card {
  background: #fafafa;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}
.zone-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}
.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.zone-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}
.zone-body {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
}
.zone-footer {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px dashed #e5e7eb;
}
.zone-info-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 3px 0;
}
.zone-info-item .label { color: #6b7280; }
.zone-info-item .value { color: #1f2937; font-weight: 500; }
.mini-stat {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}
.mini-stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 22px;
  color: #fff;
}
.icon-green { background: #67c23a; }
.icon-blue { background: #409eff; }
.icon-orange { background: #e6a23c; }
.mini-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
  margin-bottom: 4px;
}
.mini-stat-label {
  font-size: 13px;
  color: #6b7280;
}
.chart-medium {
  width: 100%;
  height: 280px;
}
</style>
