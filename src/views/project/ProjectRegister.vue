<template>
  <div class="project-register">
    <div class="page-card">
      <div class="page-header">
        <h2>立项登记</h2>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px" class="register-form">
        <el-divider content-position="left">项目基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入项目名称" maxlength="100" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目类型" prop="type">
              <el-select v-model="form.type" placeholder="请选择项目类型" style="width: 100%">
                <el-option label="住宅" value="住宅" />
                <el-option label="商业综合体" value="商业综合体" />
                <el-option label="办公楼" value="办公楼" />
                <el-option label="市政工程" value="市政工程" />
                <el-option label="工业厂房" value="工业厂房" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总投资额" prop="total_investment">
              <el-input-number v-model="form.total_investment" :min="0" :precision="2" :step="10000" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同工期(天)" prop="contract_days">
              <el-input-number v-model="form.contract_days" :min="1" :max="3650" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划开工日期" prop="plan_start_date">
              <el-date-picker
                v-model="form.plan_start_date"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
                :disabled-date="disableStartBefore"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划竣工日期" prop="plan_end_date">
              <el-date-picker
                v-model="form.plan_end_date"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
                :disabled-date="disableEndBefore"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">参建单位</el-divider>
        <div class="contractor-section">
          <div class="contractor-header">
            <span class="contractor-tip">请添加项目参建单位信息</span>
            <el-button type="primary" :icon="Plus" size="small" @click="addContractor">添加单位</el-button>
          </div>
          <el-table :data="contractors" border size="default" style="width: 100%">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column label="单位名称" min-width="260">
              <template #default="{ row, $index }">
                <el-form-item :prop="`contractors.${$index}.name`" :rules="contractorNameRule" style="margin:0">
                  <el-input v-model="row.name" placeholder="请输入单位名称" />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="角色" width="200">
              <template #default="{ row, $index }">
                <el-form-item :prop="`contractors.${$index}.role`" :rules="contractorRoleRule" style="margin:0">
                  <el-select v-model="row.role" placeholder="请选择角色" style="width: 100%">
                    <el-option label="总承包" value="总承包" />
                    <el-option label="设计" value="设计" />
                    <el-option label="监理" value="监理" />
                    <el-option label="勘察" value="勘察" />
                    <el-option label="分包" value="分包" />
                  </el-select>
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center">
              <template #default="{ $index }">
                <el-button type="danger" link :icon="Delete" @click="removeContractor($index)">删除</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无参建单位，点击右上角添加" :image-size="60" />
            </template>
          </el-table>
        </div>

        <el-form-item class="form-actions">
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
          <el-button type="default" :icon="Document" @click="handleSave('draft')">保存为草稿</el-button>
          <el-button type="primary" :icon="Promotion" @click="handleSave('pending_approval')">提交审批</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, RefreshLeft, Document, Promotion } from '@element-plus/icons-vue'
import { today } from '../../utils/helpers'
import { useProjectStore } from '../../stores/project'

const router = useRouter()
const projectStore = useProjectStore()
const formRef = ref(null)

const form = reactive({
  name: '',
  type: '',
  total_investment: 0,
  contract_days: 1,
  plan_start_date: '',
  plan_end_date: ''
})

const contractors = ref([
  { name: '', role: '总承包' }
])

const rules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择项目类型', trigger: 'change' }],
  total_investment: [{ required: true, message: '请输入总投资额', trigger: 'blur' }],
  contract_days: [{ required: true, message: '请输入合同工期', trigger: 'blur' }],
  plan_start_date: [{ required: true, message: '请选择计划开工日期', trigger: 'change' }],
  plan_end_date: [
    { required: true, message: '请选择计划竣工日期', trigger: 'change' },
    {
      validator: (_, value, cb) => {
        if (value && form.plan_start_date && value < form.plan_start_date) {
          cb(new Error('竣工日期不能早于开工日期'))
        } else {
          cb()
        }
      },
      trigger: 'change'
    }
  ]
}

const contractorNameRule = [{ required: true, message: '请输入单位名称', trigger: 'blur' }]
const contractorRoleRule = [{ required: true, message: '请选择角色', trigger: 'change' }]

const disableStartBefore = (d) => d.getTime() < new Date(today()).getTime() - 86400000

const disableEndBefore = (d) => {
  if (form.plan_start_date) {
    return d.getTime() < new Date(form.plan_start_date).getTime()
  }
  return false
}

const addContractor = () => {
  contractors.value.push({ name: '', role: '' })
}

const removeContractor = (index) => {
  if (contractors.value.length <= 1) {
    ElMessage.warning('至少保留一条参建单位信息')
    return
  }
  contractors.value.splice(index, 1)
}

const handleReset = () => {
  formRef.value?.resetFields()
  contractors.value = [{ name: '', role: '总承包' }]
}

const validateContractors = () => {
  for (let i = 0; i < contractors.value.length; i++) {
    if (!contractors.value[i].name || !contractors.value[i].name.trim()) {
      ElMessage.warning(`第 ${i + 1} 条参建单位名称不能为空`)
      return false
    }
    if (!contractors.value[i].role) {
      ElMessage.warning(`第 ${i + 1} 条参建单位角色不能为空`)
      return false
    }
  }
  return true
}

const handleSave = async (status) => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!validateContractors()) return

  const msg = status === 'pending_approval'
    ? '确认提交审批？提交后将通知审批人员。'
    : '确认保存为草稿？'

  try {
    await ElMessageBox.confirm(msg, '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
  } catch {
    return
  }

  const data = { ...form, status }
  const ok = await projectStore.create(data, contractors.value)
  if (ok) {
    ElMessage.success(status === 'pending_approval' ? '提交成功，已进入审批流程' : '草稿保存成功')
    router.push('/project/list')
  } else {
    ElMessage.error('操作失败，请稍后重试')
  }
}
</script>

<style scoped>
.project-register {
  width: 100%;
}
.register-form {
  max-width: 960px;
}
.contractor-section {
  margin-bottom: 20px;
}
.contractor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.contractor-tip {
  font-size: 13px;
  color: #6b7280;
}
.form-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}
:deep(.el-divider__text) {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}
</style>
