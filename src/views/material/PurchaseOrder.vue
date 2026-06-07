<template>
  <div class="purchase-order">
    <div class="page-card mb-16">
      <div class="page-header">
        <h2>采购订单</h2>
        <div>
          <el-select v-model="selectedProject" placeholder="选择项目生成采购建议" style="width: 240px; margin-right: 10px">
            <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <el-button type="warning" :icon="Lightning" @click="generateSuggestion">自动生成采购建议</el-button>
          <el-button type="primary" :icon="Plus" style="margin-left: 10px" @click="openCreateDialog">新建订单</el-button>
        </div>
      </div>
      <el-form :inline="true" :model="filterForm" class="mb-12">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 160px">
            <el-option label="草稿" value="draft" />
            <el-option label="预算审核中" value="budget_review" />
            <el-option label="待审批" value="pending_approval" />
            <el-option label="已批准" value="approved" />
            <el-option label="运输中" value="in_transit" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="filterForm.keyword" placeholder="订单号/项目/供应商" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchList">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="filteredOrders" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="orderNo" label="订单号" width="200" />
        <el-table-column prop="projectName" label="项目" min-width="180" />
        <el-table-column prop="supplierName" label="供应商" min-width="180" />
        <el-table-column label="总金额" width="130" align="right">
          <template #default="{ row }">{{ formatMoney(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" effect="dark">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160" />
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewOrder(row)">查看</el-button>
            <el-button v-if="row.status === 'draft'" link type="warning" size="small" @click="submitBudgetReview(row)">提交预算审核</el-button>
            <el-button v-if="row.status === 'budget_review'" link type="warning" size="small" @click="budgetApprove(row)">造价审核</el-button>
            <el-button v-if="row.status === 'pending_approval'" link type="success" size="small" @click="approveOrder(row)">主管审批</el-button>
            <el-button v-if="row.status === 'approved'" link type="primary" size="small" @click="markInTransit(row)">确认发货</el-button>
            <el-button v-if="row.status === 'in_transit'" link type="success" size="small" @click="markCompleted(row)">确认到货</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="createVisible" title="新建采购订单" width="900px" top="6vh">
      <el-form :model="orderForm" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="订单号">
              <el-input v-model="orderForm.orderNo" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属项目" required>
              <el-select v-model="orderForm.projectId" placeholder="请选择项目" style="width: 100%">
                <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" required>
              <el-select v-model="orderForm.supplierId" placeholder="请选择供应商" style="width: 100%" @change="onSupplierChange">
                <el-option v-for="s in supplierList" :key="s.id" :label="`${s.name}（${s.rating}星）`" :value="s.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="要求到货日">
              <el-date-picker v-model="orderForm.dueDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="物料明细">
          <el-table :data="orderForm.items" border size="small" style="width: 100%">
            <el-table-column label="物料" min-width="220">
              <template #default="{ row }">
                <el-select v-model="row.materialId" placeholder="选择物料" filterable style="width: 100%" size="small" @change="onMaterialChange(row)">
                  <el-option v-for="m in materialOptions" :key="m.id" :label="`${m.code} ${m.name} ${m.spec}`" :value="m.id" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="单价" width="110">
              <template #default="{ row }">
                <el-input-number v-model="row.unitPrice" :min="0" :precision="2" size="small" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="数量" width="110">
              <template #default="{ row }">
                <el-input-number v-model="row.quantity" :min="1" size="small" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="单位" width="80">
              <template #default="{ row }">{{ row.unit || '-' }}</template>
            </el-table-column>
            <el-table-column label="小计" width="120" align="right">
              <template #default="{ row }">{{ formatMoney((row.unitPrice || 0) * (row.quantity || 0)) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center">
              <template #default="{ $index }">
                <el-button link type="danger" size="small" @click="removeItem($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="mt-12" style="text-align: right">
            <el-button type="primary" size="small" plain :icon="Plus" @click="addItem">添加物料行</el-button>
          </div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="备注">
              <el-input v-model="orderForm.remark" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <div class="order-total">
              <div>合计金额：<b style="font-size:20px;color:#f56c6c">{{ formatMoney(orderTotal) }}</b></div>
            </div>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="saveOrder('draft')">保存草稿</el-button>
        <el-button type="success" @click="saveOrder('budget_review')">提交审核</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewVisible" title="订单详情" width="860px" top="6vh">
      <div v-if="currentOrder">
        <el-descriptions :column="2" border class="mb-12">
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTag(currentOrder.status)" effect="dark">{{ statusLabel(currentOrder.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="所属项目">{{ currentOrder.projectName }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ currentOrder.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentOrder.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="总金额">{{ formatMoney(currentOrder.totalAmount) }}</el-descriptions-item>
        </el-descriptions>
        <div class="section-title">物料明细</div>
        <el-table :data="currentOrder.items || demoItems" border size="small" style="width: 100%">
          <el-table-column type="index" label="序号" width="50" />
          <el-table-column prop="materialCode" label="物料编码" width="130" />
          <el-table-column prop="materialName" label="名称" min-width="160" />
          <el-table-column prop="spec" label="规格" width="140" />
          <el-table-column prop="unit" label="单位" width="60" align="center" />
          <el-table-column prop="unitPrice" label="单价" width="100" align="right">
            <template #default="{ row }">{{ formatMoney(row.unitPrice) }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" align="right" />
          <el-table-column label="小计" width="110" align="right">
            <template #default="{ row }">{{ formatMoney(row.unitPrice * row.quantity) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="suggestionVisible" title="采购建议" width="900px" top="6vh">
      <div class="mb-12">
        系统根据进度计划、库存余量以及供应商评级，为您推荐以下采购方案：
      </div>
      <el-table :data="suggestionList" border stripe size="small" style="width: 100%">
        <el-table-column type="index" label="序号" width="50" />
        <el-table-column prop="materialCode" label="物料编码" width="130" />
        <el-table-column prop="materialName" label="名称" min-width="150" />
        <el-table-column prop="spec" label="规格" width="130" />
        <el-table-column prop="currentStock" label="当前库存" width="90" align="right" />
        <el-table-column prop="requiredQty" label="需用量" width="80" align="right" />
        <el-table-column prop="suggestQty" label="建议采购" width="90" align="right">
          <template #default="{ row }">
            <b style="color:#e6a23c">{{ row.suggestQty }}</b>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="recommendSupplier" label="推荐供应商" min-width="180">
          <template #default="{ row }">
            <span>{{ row.recommendSupplier }}</span>
            <el-rate :model-value="row.supplierRating" disabled size="small" style="margin-left:6px;vertical-align:middle" />
          </template>
        </el-table-column>
        <el-table-column label="预估单价" width="100" align="right">
          <template #default="{ row }">{{ formatMoney(row.estimatedPrice) }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="suggestionVisible = false">关闭</el-button>
        <el-button type="primary" @click="applySuggestion">一键生成采购订单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Lightning } from '@element-plus/icons-vue'
import { formatMoney, formatDateTime, generateOrderNo, today } from '../../utils/helpers'
import { query, exec } from '../../utils/db'

const projectList = ref([])
const supplierList = ref([])
const materialOptions = ref([])
const orderList = ref([])
const selectedProject = ref(null)

const filterForm = reactive({ status: '', keyword: '' })

const createVisible = ref(false)
const viewVisible = ref(false)
const suggestionVisible = ref(false)
const currentOrder = ref(null)
const suggestionList = ref([])

const orderForm = reactive({
  orderNo: '',
  projectId: null,
  supplierId: null,
  dueDate: '',
  remark: '',
  items: []
})

const demoItems = [
  { materialCode: 'GJ-HRB400-16', materialName: '热轧带肋钢筋', spec: 'HRB400 Φ16mm', unit: '吨', unitPrice: 4720, quantity: 30 },
  { materialCode: 'SN-PO425', materialName: '硅酸盐水泥', spec: 'P·O 42.5', unit: '吨', unitPrice: 485, quantity: 100 },
  { materialCode: 'SS-5-25', materialName: '黄砂（中粗）', spec: '5-25mm', unit: '立方米', unitPrice: 125, quantity: 200 }
]

const statusLabel = (s) => ({
  draft: '草稿',
  budget_review: '预算审核中',
  pending_approval: '待审批',
  approved: '已批准',
  in_transit: '运输中',
  completed: '已完成'
}[s] || s)

const statusTag = (s) => ({
  draft: 'info',
  budget_review: 'warning',
  pending_approval: 'warning',
  approved: 'primary',
  in_transit: 'primary',
  completed: 'success'
}[s] || 'info')

const filteredOrders = computed(() => {
  let list = [...orderList.value]
  if (filterForm.status) list = list.filter(r => r.status === filterForm.status)
  if (filterForm.keyword) {
    const kw = filterForm.keyword.toLowerCase()
    list = list.filter(r => r.orderNo.toLowerCase().includes(kw) ||
      (r.projectName || '').toLowerCase().includes(kw) ||
      (r.supplierName || '').toLowerCase().includes(kw))
  }
  return list
})

const orderTotal = computed(() => {
  return orderForm.items.reduce((s, r) => s + (r.unitPrice || 0) * (r.quantity || 0), 0)
})

const mockOrders = () => [
  { id: 1, orderNo: 'PO-20240601103012-001', projectName: 'CBD中心大厦A座项目', supplierName: '华东钢铁集团有限公司', totalAmount: 285600, status: 'draft', createdAt: '2024-06-01 10:30:12', items: demoItems },
  { id: 2, orderNo: 'PO-20240528152030-008', projectName: '滨江住宅小区', supplierName: '中建建材供应有限公司', totalAmount: 128500, status: 'budget_review', createdAt: '2024-05-28 15:20:30' },
  { id: 3, orderNo: 'PO-20240525091522-006', projectName: '地铁10号线3标段', supplierName: '蓝天水泥集团', totalAmount: 486000, status: 'pending_approval', createdAt: '2024-05-25 09:15:22' },
  { id: 4, orderNo: 'PO-20240520140508-004', projectName: 'CBD中心大厦A座项目', supplierName: '华东钢铁集团有限公司', totalAmount: 562400, status: 'approved', createdAt: '2024-05-20 14:05:08' },
  { id: 5, orderNo: 'PO-20240515112217-003', projectName: '滨江住宅小区', supplierName: '永固防水工程有限公司', totalAmount: 68400, status: 'in_transit', createdAt: '2024-05-15 11:22:17' },
  { id: 6, orderNo: 'PO-20240510084533-002', projectName: '科技产业园一期', supplierName: '中建建材供应有限公司', totalAmount: 325800, status: 'completed', createdAt: '2024-05-10 08:45:33' }
]

onMounted(async () => {
  try {
    const projects = await query('SELECT id, name FROM projects ORDER BY id DESC')
    projectList.value = projects.length ? projects : [{ id: 1, name: 'CBD中心大厦A座项目' }, { id: 2, name: '滨江住宅小区' }, { id: 3, name: '地铁10号线3标段' }]
  } catch (e) {
    projectList.value = [{ id: 1, name: 'CBD中心大厦A座项目' }, { id: 2, name: '滨江住宅小区' }, { id: 3, name: '地铁10号线3标段' }]
  }
  try {
    const suppliers = await query('SELECT id, name, rating FROM suppliers ORDER BY id')
    supplierList.value = suppliers.length ? suppliers : getMockSuppliers()
  } catch (e) {
    supplierList.value = getMockSuppliers()
  }
  materialOptions.value = [
    { id: 1, code: 'GJ-HRB400-12', name: '热轧带肋钢筋', spec: 'HRB400 Φ12mm', unit: '吨', unitPrice: 4850 },
    { id: 2, code: 'GJ-HRB400-16', name: '热轧带肋钢筋', spec: 'HRB400 Φ16mm', unit: '吨', unitPrice: 4720 },
    { id: 3, code: 'GJ-HRB400-25', name: '热轧带肋钢筋', spec: 'HRB400 Φ25mm', unit: '吨', unitPrice: 4680 },
    { id: 4, code: 'SN-PO425', name: '硅酸盐水泥', spec: 'P·O 42.5', unit: '吨', unitPrice: 485 },
    { id: 5, code: 'SN-PO525', name: '硅酸盐水泥', spec: 'P·O 52.5', unit: '吨', unitPrice: 560 },
    { id: 6, code: 'SS-5-25', name: '黄砂（中粗）', spec: '5-25mm', unit: '立方米', unitPrice: 125 },
    { id: 7, code: 'SS-G1-3', name: '碎石', spec: '1-3cm', unit: '立方米', unitPrice: 98 },
    { id: 8, code: 'FS-SBS-3mm', name: 'SBS防水卷材', spec: '3mm厚聚酯胎', unit: '卷', unitPrice: 165 }
  ]
  fetchList()
})

const getMockSuppliers = () => [
  { id: 1, name: '华东钢铁集团有限公司', rating: 5 },
  { id: 2, name: '中建建材供应有限公司', rating: 5 },
  { id: 3, name: '蓝天水泥集团', rating: 4 },
  { id: 4, name: '永固防水工程有限公司', rating: 4 },
  { id: 5, name: '通达砂石料场', rating: 3 }
]

const fetchList = async () => {
  try {
    const rows = await query(`
      SELECT po.id, po.order_no AS orderNo, po.project_id AS projectId, po.supplier_id AS supplierId,
             po.total_amount AS totalAmount, po.status, po.created_at AS createdAt,
             p.name AS projectName, s.name AS supplierName
      FROM purchase_orders po
      LEFT JOIN projects p ON po.project_id = p.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
    `)
    orderList.value = rows.length ? rows : mockOrders()
  } catch (e) {
    orderList.value = mockOrders()
  }
}

const resetFilter = () => {
  filterForm.status = ''
  filterForm.keyword = ''
  fetchList()
}

const openCreateDialog = () => {
  orderForm.orderNo = generateOrderNo('PO')
  orderForm.projectId = null
  orderForm.supplierId = null
  orderForm.dueDate = ''
  orderForm.remark = ''
  orderForm.items = [{ materialId: null, unitPrice: 0, quantity: 1, unit: '' }]
  createVisible.value = true
}

const addItem = () => {
  orderForm.items.push({ materialId: null, unitPrice: 0, quantity: 1, unit: '' })
}

const removeItem = (index) => {
  if (orderForm.items.length <= 1) {
    ElMessage.warning('至少保留一行物料')
    return
  }
  orderForm.items.splice(index, 1)
}

const onMaterialChange = (row) => {
  const m = materialOptions.value.find(x => x.id === row.materialId)
  if (m) {
    row.unitPrice = m.unitPrice
    row.unit = m.unit
  }
}

const onSupplierChange = () => {}

const saveOrder = async (status) => {
  if (!orderForm.projectId) return ElMessage.warning('请选择项目')
  if (!orderForm.supplierId) return ElMessage.warning('请选择供应商')
  if (!orderForm.items.some(i => i.materialId && i.quantity > 0)) return ElMessage.warning('请添加有效物料')
  const total = orderTotal.value
  const supplier = supplierList.value.find(s => s.id === orderForm.supplierId)
  const project = projectList.value.find(p => p.id === orderForm.projectId)
  const order = {
    id: Date.now(),
    orderNo: orderForm.orderNo,
    projectId: orderForm.projectId,
    projectName: project?.name,
    supplierId: orderForm.supplierId,
    supplierName: supplier?.name,
    totalAmount: total,
    status,
    createdAt: formatDateTime(new Date())
  }
  try {
    const sql = `INSERT INTO purchase_orders (order_no, project_id, supplier_id, total_amount, status, due_date, remark, created_at)
                 VALUES ('${orderForm.orderNo}', ${orderForm.projectId}, ${orderForm.supplierId}, ${total}, '${status}', '${orderForm.dueDate}', '${orderForm.remark}', datetime('now'))`
    await exec(sql)
  } catch (e) {}
  orderList.value.unshift(order)
  createVisible.value = false
  ElMessage.success(status === 'draft' ? '草稿已保存' : '已提交预算审核')
}

const viewOrder = (row) => {
  currentOrder.value = row
  viewVisible.value = true
}

const pushNotification = async (title, content, role) => {
  try {
    await exec(`INSERT INTO notifications (title, content, type, target_role, created_at)
                VALUES ('${title}', '${content}', 'info', '${role}', datetime('now'))`)
  } catch (e) {}
}

const updateStatus = async (row, newStatus, actionLabel) => {
  try {
    await ElMessageBox.confirm(`确认${actionLabel}订单【${row.orderNo}】？`, '操作确认', { type: 'warning' })
    try {
      await exec(`UPDATE purchase_orders SET status='${newStatus}' WHERE id=${row.id}`)
    } catch (e) {}
    row.status = newStatus
    ElMessage.success(`已${actionLabel}`)
    const statusMap = {
      budget_review: { title: '采购订单待预算审核', role: 'cost_engineer' },
      pending_approval: { title: '采购订单待主管审批', role: 'manager' },
      approved: { title: '采购订单已批准', role: 'purchaser' },
      in_transit: { title: '采购订单已发货', role: 'warehouse' },
      completed: { title: '采购订单已到货完成', role: 'project_manager' }
    }
    if (statusMap[newStatus]) {
      await pushNotification(statusMap[newStatus].title, `订单【${row.orderNo}】${actionLabel}`, statusMap[newStatus].role)
    }
  } catch (e) {}
}

const submitBudgetReview = (row) => updateStatus(row, 'budget_review', '提交预算审核')
const budgetApprove = (row) => updateStatus(row, 'pending_approval', '通过造价审核')
const approveOrder = (row) => updateStatus(row, 'approved', '审批通过')
const markInTransit = (row) => updateStatus(row, 'in_transit', '确认发货')
const markCompleted = (row) => updateStatus(row, 'completed', '确认到货完成')

const generateSuggestion = async () => {
  if (!selectedProject.value) return ElMessage.warning('请先选择项目')
  suggestionList.value = [
    { materialCode: 'GJ-HRB400-16', materialName: '热轧带肋钢筋', spec: 'HRB400 Φ16mm', currentStock: 42, requiredQty: 120, suggestQty: 80, unit: '吨', recommendSupplier: '华东钢铁集团有限公司', supplierRating: 5, estimatedPrice: 4720 },
    { materialCode: 'GJ-HRB400-25', materialName: '热轧带肋钢筋', spec: 'HRB400 Φ25mm', currentStock: 18, requiredQty: 60, suggestQty: 45, unit: '吨', recommendSupplier: '华东钢铁集团有限公司', supplierRating: 5, estimatedPrice: 4680 },
    { materialCode: 'SN-PO425', materialName: '硅酸盐水泥', spec: 'P·O 42.5', currentStock: 320, requiredQty: 500, suggestQty: 200, unit: '吨', recommendSupplier: '蓝天水泥集团', supplierRating: 4, estimatedPrice: 485 },
    { materialCode: 'SS-G1-3', materialName: '碎石', spec: '1-3cm', currentStock: 280, requiredQty: 900, suggestQty: 650, unit: '立方米', recommendSupplier: '通达砂石料场', supplierRating: 3, estimatedPrice: 98 },
    { materialCode: 'MC-SCAFFOLD', materialName: '脚手架木方', spec: '40×80×4000mm', currentStock: 35, requiredQty: 300, suggestQty: 280, unit: '根', recommendSupplier: '中建建材供应有限公司', supplierRating: 5, estimatedPrice: 28 }
  ]
  suggestionVisible.value = true
}

const applySuggestion = () => {
  openCreateDialog()
  if (selectedProject.value) orderForm.projectId = selectedProject.value
  orderForm.items = suggestionList.value.map(s => {
    const m = materialOptions.value.find(x => x.code === s.materialCode)
    return {
      materialId: m?.id || null,
      unitPrice: s.estimatedPrice,
      quantity: s.suggestQty,
      unit: s.unit
    }
  })
  suggestionVisible.value = false
  ElMessage.success('已根据采购建议生成订单，请确认后提交')
}
</script>

<style scoped>
.order-total {
  text-align: right;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}
</style>
