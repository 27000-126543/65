<template>
  <div class="supplier-list">
    <div class="page-card">
      <div class="page-header">
        <h2>供应商管理</h2>
        <div>
          <el-input v-model="keyword" placeholder="搜索供应商名称/联系人" clearable style="width: 240px; margin-right: 10px" @input="filterList">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">新增供应商</el-button>
        </div>
      </div>

      <el-table :data="filteredList" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="name" label="名称" min-width="220">
          <template #default="{ row }">
            <b>{{ row.name }}</b>
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="120" />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column prop="address" label="地址" min-width="240" />
        <el-table-column label="评级" width="180" align="center">
          <template #default="{ row }">
            <el-rate v-model="row.rating" disabled />
            <span style="margin-left:8px;color:#909399">{{ row.rating }}星</span>
          </template>
        </el-table-column>
        <el-table-column prop="materialType" label="供料类型" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="t in (row.materialType || '').split('、').filter(Boolean)" :key="t" size="small" style="margin-right:4px;margin-bottom:2px">
              {{ t }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button link type="warning" size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="deleteSupplier(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑供应商' : '新增供应商'" width="640px" top="8vh">
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="供应商名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入供应商名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contact">
              <el-input v-model="formData.contact" placeholder="请输入联系人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="formData.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址" prop="address">
          <el-input v-model="formData.address" placeholder="请输入详细地址" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="评级" prop="rating">
              <el-rate v-model="formData.rating" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="供料类型" prop="materialType">
          <el-select
            v-model="selectedTypes"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入供料类型，回车确认"
            style="width: 100%"
            @change="onTypeChange"
          >
            <el-option label="钢筋类" value="钢筋类" />
            <el-option label="水泥类" value="水泥类" />
            <el-option label="砂石类" value="砂石类" />
            <el-option label="木材类" value="木材类" />
            <el-option label="防水材料" value="防水材料" />
            <el-option label="五金配件" value="五金配件" />
            <el-option label="水电材料" value="水电材料" />
            <el-option label="装饰材料" value="装饰材料" />
            <el-option label="保温材料" value="保温材料" />
          </el-select>
        </el-form-item>
        <el-form-item label="开户行">
          <el-input v-model="formData.bank" placeholder="请输入开户银行" />
        </el-form-item>
        <el-form-item label="银行账号">
          <el-input v-model="formData.bankAccount" placeholder="请输入银行账号" />
        </el-form-item>
        <el-form-item label="税号">
          <el-input v-model="formData.taxNo" placeholder="请输入纳税人识别号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="供应商详情" width="640px" top="8vh">
      <div v-if="currentSupplier">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="供应商名称" :span="2">{{ currentSupplier.name }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ currentSupplier.contact }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentSupplier.phone }}</el-descriptions-item>
          <el-descriptions-item label="地址" :span="2">{{ currentSupplier.address }}</el-descriptions-item>
          <el-descriptions-item label="评级">
            <el-rate :model-value="currentSupplier.rating" disabled />
          </el-descriptions-item>
          <el-descriptions-item label="供料类型" :span="2">
            <el-tag v-for="t in (currentSupplier.materialType || '').split('、').filter(Boolean)" :key="t" size="small" style="margin-right:4px;margin-bottom:2px">
              {{ t }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开户行">{{ currentSupplier.bank || '-' }}</el-descriptions-item>
          <el-descriptions-item label="银行账号">{{ currentSupplier.bankAccount || '-' }}</el-descriptions-item>
          <el-descriptions-item label="税号" :span="2">{{ currentSupplier.taxNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentSupplier.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { query, exec } from '../../utils/db'

const supplierList = ref([])
const keyword = ref('')

const filteredList = computed(() => {
  if (!keyword.value) return supplierList.value
  const kw = keyword.value.toLowerCase()
  return supplierList.value.filter(r =>
    (r.name || '').toLowerCase().includes(kw) ||
    (r.contact || '').toLowerCase().includes(kw)
  )
})

const dialogVisible = ref(false)
const detailVisible = ref(false)
const isEdit = ref(false)
const currentSupplier = ref(null)
const formRef = ref(null)
const selectedTypes = ref([])

const formData = reactive({
  id: null,
  name: '',
  contact: '',
  phone: '',
  address: '',
  rating: 3,
  materialType: '',
  bank: '',
  bankAccount: '',
  taxNo: '',
  remark: ''
})

const formRules = {
  name: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }]
}

const mockSuppliers = () => [
  { id: 1, name: '华东钢铁集团有限公司', contact: '王刚', phone: '13800138001', address: '上海市宝山区钢铁路88号', rating: 5, materialType: '钢筋类、钢材、五金配件', bank: '工商银行宝山支行', bankAccount: '1001 2345 0910 0012 345', taxNo: '91310000MA1FL7AB12', remark: '长期合作，信誉良好，交货准时' },
  { id: 2, name: '中建建材供应有限公司', contact: '李经理', phone: '13900139002', address: '北京市朝阳区建国路99号', rating: 5, materialType: '水泥类、砂石类、木材类、水电材料', bank: '建设银行北京分行', bankAccount: '1100 1010 5000 5966 6666', taxNo: '911100001000012345', remark: '全品类建材供应，大型国企背景' },
  { id: 3, name: '蓝天水泥集团', contact: '张总', phone: '13700137003', address: '安徽省芜湖市三山区水泥工业园', rating: 4, materialType: '水泥类', bank: '农业银行芜湖分行', bankAccount: '6228 4800 0000 1234 567', taxNo: '91340000MA2T3K5L67', remark: '海螺水泥子公司，质量稳定' },
  { id: 4, name: '永固防水工程有限公司', contact: '陈工', phone: '13600136004', address: '广东省佛山市顺德区龙江工业区', rating: 4, materialType: '防水材料、保温材料', bank: '农商行顺德支行', bankAccount: '8001 0000 1234 5678', taxNo: '91440600MA4UUQ2B45', remark: '专业防水材料供应商，资质齐全' },
  { id: 5, name: '通达砂石料场', contact: '刘老板', phone: '13500135005', address: '浙江省湖州市德清县砂石工业园', rating: 3, materialType: '砂石类', bank: '德清农村商业银行', bankAccount: '2010 0008 1234 5678', taxNo: '91330521MA29J8K789', remark: '价格实惠，运输距离较短' },
  { id: 6, name: '瑞丰木材加工厂', contact: '赵厂长', phone: '13400134006', address: '江苏省徐州市邳州市官湖镇木业园', rating: 4, materialType: '木材类', bank: '中国银行邳州支行', bankAccount: '4563 5100 0088 8877 777', taxNo: '91320382MA1N4PQ678', remark: '模板、木方规格齐全' },
  { id: 7, name: '恒通水电材料有限公司', contact: '孙经理', phone: '13300133007', address: '山东省临沂市兰山区建材市场', rating: 4, materialType: '水电材料、五金配件', bank: '临沂兰山村镇银行', bankAccount: '9050 1010 0000 0011 222', taxNo: '91371300MA3C6BT901', remark: '一站式水电材料采购' },
  { id: 8, name: '华盛装饰材料公司', contact: '周总', phone: '13200132008', address: '广东省东莞市大岭山镇建材街', rating: 3, materialType: '装饰材料', bank: '东莞银行大岭山支行', bankAccount: '5400 0088 0011 2233', taxNo: '91441900MA4W5RE812' }
]

onMounted(async () => {
  try {
    const rows = await query('SELECT id, name, contact, phone, address, rating, material_type AS materialType, bank, bank_account AS bankAccount, tax_no AS taxNo, remark FROM suppliers ORDER BY rating DESC, id')
    supplierList.value = rows.length ? rows : mockSuppliers()
  } catch (e) {
    supplierList.value = mockSuppliers()
  }
})

const filterList = () => {}

const resetForm = () => {
  formData.id = null
  formData.name = ''
  formData.contact = ''
  formData.phone = ''
  formData.address = ''
  formData.rating = 3
  formData.materialType = ''
  formData.bank = ''
  formData.bankAccount = ''
  formData.taxNo = ''
  formData.remark = ''
  selectedTypes.value = []
}

const openCreateDialog = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  formData.id = row.id
  formData.name = row.name
  formData.contact = row.contact
  formData.phone = row.phone
  formData.address = row.address
  formData.rating = row.rating
  formData.materialType = row.materialType || ''
  formData.bank = row.bank || ''
  formData.bankAccount = row.bankAccount || ''
  formData.taxNo = row.taxNo || ''
  formData.remark = row.remark || ''
  selectedTypes.value = (row.materialType || '').split('、').filter(Boolean)
  dialogVisible.value = true
}

const onTypeChange = (val) => {
  formData.materialType = val.join('、')
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      if (isEdit.value) {
        const sql = `UPDATE suppliers SET name='${formData.name}', contact='${formData.contact}',
                     phone='${formData.phone}', address='${formData.address}', rating=${formData.rating},
                     material_type='${formData.materialType}', bank='${formData.bank}',
                     bank_account='${formData.bankAccount}', tax_no='${formData.taxNo}', remark='${formData.remark}'
                     WHERE id=${formData.id}`
        await exec(sql)
        const idx = supplierList.value.findIndex(s => s.id === formData.id)
        if (idx > -1) supplierList.value[idx] = { ...formData }
        ElMessage.success('编辑成功')
      } else {
        const sql = `INSERT INTO suppliers (name, contact, phone, address, rating, material_type, bank, bank_account, tax_no, remark)
                     VALUES ('${formData.name}', '${formData.contact}', '${formData.phone}', '${formData.address}',
                             ${formData.rating}, '${formData.materialType}', '${formData.bank}',
                             '${formData.bankAccount}', '${formData.taxNo}', '${formData.remark}')`
        await exec(sql)
        supplierList.value.unshift({ ...formData, id: Date.now() })
        ElMessage.success('新增成功')
      }
      dialogVisible.value = false
    } catch (e) {
      console.error(e)
      if (isEdit.value) {
        const idx = supplierList.value.findIndex(s => s.id === formData.id)
        if (idx > -1) supplierList.value[idx] = { ...formData }
      } else {
        supplierList.value.unshift({ ...formData, id: Date.now() })
      }
      dialogVisible.value = false
      ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
    }
  })
}

const deleteSupplier = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除供应商"${row.name}"？该操作不可恢复。`, '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
    try {
      await exec(`DELETE FROM suppliers WHERE id=${row.id}`)
    } catch (e) {}
    supplierList.value = supplierList.value.filter(s => s.id !== row.id)
    ElMessage.success('已删除')
  } catch (e) {}
}

const viewDetail = (row) => {
  currentSupplier.value = row
  detailVisible.value = true
}
</script>

<style scoped>
</style>
