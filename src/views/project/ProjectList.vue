<template>
  <div class="project-list">
    <div class="page-card">
      <div class="page-header">
        <h2>项目列表</h2>
        <el-button type="primary" :icon="Plus" @click="goRegister">新建项目</el-button>
      </div>

      <el-form :inline="true" :model="filters" class="search-form mb-16">
        <el-form-item label="项目名称">
          <el-input v-model="filters.name" placeholder="请输入项目名称" clearable style="width: 200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.type" placeholder="全部" clearable style="width: 160px">
            <el-option label="住宅" value="住宅" />
            <el-option label="商业综合体" value="商业综合体" />
            <el-option label="办公楼" value="办公楼" />
            <el-option label="市政工程" value="市政工程" />
            <el-option label="工业厂房" value="工业厂房" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="草稿" value="draft" />
            <el-option label="待审批" value="pending_approval" />
            <el-option label="已审批" value="approved" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="name" label="项目名称" min-width="220">
          <template #default="{ row }">
            <el-link type="primary" @click="goDetail(row.id)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column label="总投资额" width="150">
          <template #default="{ row }">{{ formatMoney(row.total_investment) }}</template>
        </el-table-column>
        <el-table-column label="合同工期" width="110">
          <template #default="{ row }">{{ row.contract_days }}天</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="light">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.created_at, 'YYYY-MM-DD HH:mm') }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="goDetail(row.id)">详情</el-button>
            <el-button size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="editVisible" title="编辑项目" width="640px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="110px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目类型" prop="type">
          <el-select v-model="editForm.type" placeholder="请选择项目类型" style="width: 100%">
            <el-option label="住宅" value="住宅" />
            <el-option label="商业综合体" value="商业综合体" />
            <el-option label="办公楼" value="办公楼" />
            <el-option label="市政工程" value="市政工程" />
            <el-option label="工业厂房" value="工业厂房" />
          </el-select>
        </el-form-item>
        <el-form-item label="总投资额" prop="total_investment">
          <el-input-number v-model="editForm.total_investment" :min="0" :precision="2" :step="10000" style="width: 100%" />
        </el-form-item>
        <el-form-item label="合同工期(天)" prop="contract_days">
          <el-input-number v-model="editForm.contract_days" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="计划开工日期" prop="plan_start_date">
          <el-date-picker v-model="editForm.plan_start_date" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="计划竣工日期" prop="plan_end_date">
          <el-date-picker v-model="editForm.plan_end_date" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="待审批" value="pending_approval" />
            <el-option label="已审批" value="approved" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmEdit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteVisible" title="删除确认" width="420px">
      <div class="delete-content">
        <el-icon :size="24" color="#e6a23c"><Warning /></el-icon>
        <span>确定要删除项目「{{ currentDelete?.name }}」吗？此操作不可恢复。</span>
      </div>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确定删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Warning } from '@element-plus/icons-vue'
import { formatMoney, formatDate } from '../../utils/helpers'
import { useProjectStore } from '../../stores/project'

const router = useRouter()
const projectStore = useProjectStore()

const tableData = ref([])
const loading = ref(false)
const filters = reactive({ name: '', type: '', status: '' })

const statusText = (s) => ({ draft: '草稿', approved: '已审批', in_progress: '进行中', pending_approval: '待审批', completed: '已完成' }[s] || s)
const statusTagType = (s) => ({ draft: 'info', approved: 'success', in_progress: 'primary', pending_approval: 'warning', completed: '' }[s] || '')

const goRegister = () => router.push('/project/register')
const goDetail = (id) => router.push(`/project/detail/${id}`)

const loadData = async () => {
  loading.value = true
  try {
    tableData.value = await projectStore.fetchAll(filters)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => loadData()

const handleReset = () => {
  filters.name = ''
  filters.type = ''
  filters.status = ''
  loadData()
}

const editVisible = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  id: null,
  name: '',
  type: '',
  total_investment: 0,
  contract_days: 1,
  plan_start_date: '',
  plan_end_date: '',
  status: 'draft'
})
const editRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择项目类型', trigger: 'change' }],
  total_investment: [{ required: true, message: '请输入总投资额', trigger: 'blur' }],
  contract_days: [{ required: true, message: '请输入合同工期', trigger: 'blur' }],
  plan_start_date: [{ required: true, message: '请选择计划开工日期', trigger: 'change' }],
  plan_end_date: [{ required: true, message: '请选择计划竣工日期', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const handleEdit = (row) => {
  editForm.id = row.id
  editForm.name = row.name
  editForm.type = row.type
  editForm.total_investment = row.total_investment
  editForm.contract_days = row.contract_days
  editForm.plan_start_date = row.plan_start_date
  editForm.plan_end_date = row.plan_end_date
  editForm.status = row.status
  editVisible.value = true
}

const confirmEdit = async () => {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    const { id, ...data } = editForm
    const ok = await projectStore.update(id, data)
    if (ok) {
      ElMessage.success('修改成功')
      editVisible.value = false
      loadData()
    } else {
      ElMessage.error('修改失败')
    }
  })
}

const deleteVisible = ref(false)
const currentDelete = ref(null)

const handleDelete = (row) => {
  currentDelete.value = row
  deleteVisible.value = true
}

const confirmDelete = async () => {
  if (!currentDelete.value) return
  const ok = await projectStore.remove(currentDelete.value.id)
  if (ok) {
    ElMessage.success('删除成功')
    deleteVisible.value = false
    currentDelete.value = null
    loadData()
  } else {
    ElMessage.error('删除失败')
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.project-list {
  width: 100%;
}
.search-form {
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
}
.delete-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #374151;
}
</style>
