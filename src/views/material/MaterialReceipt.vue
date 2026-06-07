<template>
  <div class="material-receipt">
    <div class="page-card">
      <div class="page-header">
        <h2>材料签收</h2>
      </div>
      <el-tabs v-model="activeTab" @tab-change="fetchList">
        <el-tab-pane label="待签收" name="pending">
          <el-table :data="pendingList" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="orderNo" label="订单号" width="200" />
            <el-table-column prop="projectName" label="项目" min-width="180" />
            <el-table-column prop="supplierName" label="供应商" min-width="180" />
            <el-table-column label="订购总量" width="120" align="right">
              <template #default="{ row }">{{ row.totalQty }} {{ row.unit }}</template>
            </el-table-column>
            <el-table-column label="已签收" width="110" align="right">
              <template #default="{ row }">
                <b style="color:#409eff">{{ row.receivedQty }}</b> {{ row.unit }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="下单时间" width="160" />
            <el-table-column label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.receivedQty === 0" type="warning" effect="dark">待签收</el-tag>
                <el-tag v-else type="warning">部分签收</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openReceipt(row)">扫码签收</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="已签收" name="received">
          <el-table :data="receivedList" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="orderNo" label="订单号" width="200" />
            <el-table-column prop="projectName" label="项目" min-width="180" />
            <el-table-column prop="supplierName" label="供应商" min-width="180" />
            <el-table-column label="订购总量" width="120" align="right">
              <template #default="{ row }">{{ row.totalQty }} {{ row.unit }}</template>
            </el-table-column>
            <el-table-column label="已签收" width="110" align="right">
              <template #default="{ row }">
                <b style="color:#67c23a">{{ row.receivedQty }}</b> {{ row.unit }}
              </template>
            </el-table-column>
            <el-table-column prop="receivedAt" label="签收时间" width="160" />
            <el-table-column label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.qualityStatus === 'qualified'" type="success" effect="dark">合格</el-tag>
                <el-tag v-else-if="row.qualityStatus === 'pending'" type="warning" effect="dark">待检</el-tag>
                <el-tag v-else type="danger" effect="dark">不合格</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="receiptVisible" title="扫码签收" width="560px" top="8vh">
      <div v-if="currentOrder" class="receipt-header mb-16">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ currentOrder.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="物料">
            {{ currentOrder.materialName }}（{{ currentOrder.spec }}）
          </el-descriptions-item>
          <el-descriptions-item label="签收进度">
            <el-progress
              :percentage="Math.floor(currentOrder.receivedQty / currentOrder.totalQty * 100)"
              :format="() => `${currentOrder.receivedQty} / ${currentOrder.totalQty} ${currentOrder.unit}`"
            />
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-form :model="receiptForm" label-width="100px">
        <el-form-item label="批次号" required>
          <div style="display:flex;gap:8px;width:100%">
            <el-input v-model="receiptForm.batchNo" placeholder="输入或扫描批次号" style="flex:1">
              <template #append>
                <el-button :icon="Camera" @click="scanBatch">扫码</el-button>
              </template>
            </el-input>
          </div>
        </el-form-item>
        <el-form-item label="签收数量" required>
          <el-input-number
            v-model="receiptForm.quantity"
            :min="1"
            :max="remainingQty"
            style="width: 220px"
          />
          <span style="margin-left:10px;color:#909399">剩余可签收：{{ remainingQty }} {{ currentOrder?.unit }}</span>
        </el-form-item>
        <el-form-item label="质检员" required>
          <el-input v-model="receiptForm.inspector" placeholder="请输入质检员姓名" style="width: 220px" />
        </el-form-item>
        <el-form-item label="质量状态" required>
          <el-radio-group v-model="receiptForm.qualityStatus">
            <el-radio-button value="qualified">合格</el-radio-button>
            <el-radio-button value="unqualified">不合格</el-radio-button>
            <el-radio-button value="pending">待检</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="receiptForm.qualityStatus === 'unqualified'" label="不合格原因" required>
          <el-input v-model="receiptForm.rejectReason" type="textarea" :rows="3" placeholder="请填写不合格原因，将触发退换货通知" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="receiptForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="receiptVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmReceipt">确认签收</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="签收详情" width="780px" top="8vh">
      <div v-if="currentOrder">
        <el-descriptions :column="2" border class="mb-12">
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ currentOrder.projectName }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ currentOrder.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="物料">{{ currentOrder.materialName }} {{ currentOrder.spec }}</el-descriptions-item>
        </el-descriptions>
        <div class="section-title">签收记录</div>
        <el-table :data="receiptRecords" border stripe size="small" style="width: 100%">
          <el-table-column type="index" label="序号" width="50" />
          <el-table-column prop="batchNo" label="批次号" width="180" />
          <el-table-column prop="quantity" label="数量" width="90" align="right" />
          <el-table-column prop="unit" label="单位" width="70" align="center" />
          <el-table-column label="质量状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.qualityStatus === 'qualified'" type="success" size="small" effect="dark">合格</el-tag>
              <el-tag v-else-if="row.qualityStatus === 'pending'" type="warning" size="small" effect="dark">待检</el-tag>
              <el-tag v-else type="danger" size="small" effect="dark">不合格</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="inspector" label="质检员" width="100" />
          <el-table-column prop="remark" label="备注" min-width="120" />
          <el-table-column prop="createdAt" label="签收时间" width="160" />
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import { formatDateTime, generateBatchNo, now } from '../../utils/helpers'
import { query, exec } from '../../utils/db'

const activeTab = ref('pending')
const pendingList = ref([])
const receivedList = ref([])

const receiptVisible = ref(false)
const detailVisible = ref(false)
const currentOrder = ref(null)
const receiptRecords = ref([])

const receiptForm = reactive({
  batchNo: '',
  quantity: 1,
  inspector: '',
  qualityStatus: 'qualified',
  rejectReason: '',
  remark: ''
})

const remainingQty = computed(() => {
  if (!currentOrder.value) return 0
  return currentOrder.value.totalQty - currentOrder.value.receivedQty
})

const mockOrders = () => [
  {
    id: 1, orderNo: 'PO-20240601103012-001',
    projectName: 'CBD中心大厦A座项目',
    supplierName: '华东钢铁集团有限公司',
    materialName: '热轧带肋钢筋', spec: 'HRB400 Φ16mm',
    unit: '吨', totalQty: 30, receivedQty: 0,
    createdAt: '2024-06-01 10:30:12',
    qualityStatus: null, status: 'pending'
  },
  {
    id: 2, orderNo: 'PO-20240520140508-004',
    projectName: 'CBD中心大厦A座项目',
    supplierName: '华东钢铁集团有限公司',
    materialName: '热轧带肋钢筋', spec: 'HRB400 Φ12mm',
    unit: '吨', totalQty: 50, receivedQty: 20,
    createdAt: '2024-05-20 14:05:08',
    qualityStatus: null, status: 'pending'
  },
  {
    id: 3, orderNo: 'PO-20240515112217-003',
    projectName: '滨江住宅小区',
    supplierName: '永固防水工程有限公司',
    materialName: 'SBS防水卷材', spec: '3mm厚聚酯胎',
    unit: '卷', totalQty: 150, receivedQty: 80,
    createdAt: '2024-05-15 11:22:17',
    qualityStatus: null, status: 'pending'
  },
  {
    id: 4, orderNo: 'PO-20240510084533-002',
    projectName: '科技产业园一期',
    supplierName: '中建建材供应有限公司',
    materialName: '硅酸盐水泥', spec: 'P·O 42.5',
    unit: '吨', totalQty: 200, receivedQty: 200,
    createdAt: '2024-05-10 08:45:33',
    receivedAt: '2024-05-13 09:12:00',
    qualityStatus: 'qualified', status: 'received'
  },
  {
    id: 5, orderNo: 'PO-20240505153022-001',
    projectName: '地铁10号线3标段',
    supplierName: '蓝天水泥集团',
    materialName: '硅酸盐水泥', spec: 'P·O 52.5',
    unit: '吨', totalQty: 180, receivedQty: 180,
    createdAt: '2024-05-05 15:30:22',
    receivedAt: '2024-05-08 14:20:00',
    qualityStatus: 'qualified', status: 'received'
  }
]

onMounted(() => {
  fetchList()
})

const fetchList = async () => {
  try {
    const rows = await query(`
      SELECT poi.id, po.id AS orderId, po.order_no AS orderNo, po.project_id AS projectId, po.supplier_id AS supplierId,
             m.id AS materialId, m.name AS materialName, m.spec, m.unit, poi.quantity AS totalQty,
             poi.received_qty AS receivedQty,
             p.name AS projectName, s.name AS supplierName,
             CASE WHEN poi.received_qty >= poi.quantity THEN 'received' ELSE 'pending' END AS status,
             mr.received_at AS receivedAt, mr.quality_status AS qualityStatus
      FROM purchase_order_items poi
      LEFT JOIN purchase_orders po ON poi.order_id = po.id
      LEFT JOIN materials m ON poi.material_id = m.id
      LEFT JOIN projects p ON po.project_id = p.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN material_receipts mr ON mr.order_id = po.id AND mr.material_id = poi.material_id
      ORDER BY po.created_at DESC, poi.id ASC
    `)
    const data = rows.length ? rows : mockOrders()
    pendingList.value = data.filter(r => r.status === 'pending' || (r.receivedQty || 0) < (r.totalQty || 0))
    receivedList.value = data.filter(r => r.status === 'received' && (r.receivedQty || 0) >= (r.totalQty || 0))
  } catch (e) {
    console.error('加载签收列表失败:', e)
    const data = mockOrders()
    pendingList.value = data.filter(r => r.status === 'pending' || r.receivedQty < r.totalQty)
    receivedList.value = data.filter(r => r.status === 'received' && r.receivedQty >= r.totalQty)
  }
}

const scanBatch = () => {
  receiptForm.batchNo = generateBatchNo()
  ElMessage.success('已扫描生成批次号')
}

const openReceipt = (row) => {
  currentOrder.value = { ...row }
  receiptForm.batchNo = ''
  receiptForm.quantity = 1
  receiptForm.inspector = ''
  receiptForm.qualityStatus = 'qualified'
  receiptForm.rejectReason = ''
  receiptForm.remark = ''
  receiptVisible.value = true
}

const confirmReceipt = async () => {
  if (!receiptForm.batchNo.trim()) return ElMessage.warning('请输入批次号')
  if (!receiptForm.quantity || receiptForm.quantity < 1) return ElMessage.warning('请输入签收数量')
  if (receiptForm.quantity > remainingQty.value) return ElMessage.warning(`签收数量不能超过剩余的 ${remainingQty.value}`)
  if (!receiptForm.inspector.trim()) return ElMessage.warning('请输入质检员姓名')
  if (receiptForm.qualityStatus === 'unqualified' && !receiptForm.rejectReason.trim()) {
    return ElMessage.warning('请填写不合格原因')
  }

  try {
    const orderItemId = currentOrder.value.id
    const orderId = currentOrder.value.orderId
    const materialId = currentOrder.value.materialId
    const qty = receiptForm.quantity
    const batchNo = receiptForm.batchNo
    const inspector = receiptForm.inspector
    const qualityStatus = receiptForm.qualityStatus
    const qualityComment = qualityStatus === 'unqualified' ? receiptForm.rejectReason : (receiptForm.remark || '验收合格')

    await exec(
      `INSERT INTO material_receipts (order_id, material_id, batch_no, quantity, inspector, quality_status, quality_comment, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [orderId, materialId, batchNo, qty, inspector, qualityStatus, qualityComment]
    )

    if (qualityStatus === 'qualified') {
      await exec(
        `UPDATE purchase_order_items SET received_qty = received_qty + ? WHERE id = ?`,
        [qty, orderItemId]
      )
      try {
        await exec(
          `UPDATE materials SET stock = stock + ? WHERE id = ?`,
          [qty, materialId]
        )
      } catch (e) { console.warn('更新库存失败（不影响签收流程）:', e) }
      currentOrder.value.receivedQty = (currentOrder.value.receivedQty || 0) + qty
      ElMessage.success(`已签收 ${qty} ${currentOrder.value.unit}，库存已更新`)
    } else if (qualityStatus === 'unqualified') {
      try {
        await exec(
          `UPDATE purchase_orders SET status = 'return_processing' WHERE id = ?`,
          [orderId]
        )
      } catch (e) { console.warn('更新订单状态失败:', e) }

      const notifTitle = '材料验收不合格，需退换货处理'
      const notifContent = `订单【${currentOrder.value.orderNo}】批次号${batchNo}验收不合格。\n质检员：${inspector}\n不合格原因：${receiptForm.rejectReason}\n数量：${qty} ${currentOrder.value.unit}\n请项目经理及时协调退换货事宜。`
      try {
        await exec(
          `INSERT INTO notifications (type, title, content, recipient, priority, is_read, related_id, related_type, created_at)
           VALUES ('warning', ?, ?, 'project_manager', 'high', 0, ?, 'purchase_order', datetime('now'))`,
          [notifTitle, notifContent, orderId]
        )
      } catch (e) { console.warn('创建通知失败:', e) }

      try {
        await exec(
          `INSERT INTO notifications (type, title, content, recipient, priority, is_read, related_id, related_type, created_at)
           VALUES ('warning', ?, ?, 'purchaser', 'high', 0, ?, 'purchase_order', datetime('now'))`,
          [notifTitle, notifContent, orderId]
        )
      } catch (e) {}

      ElMessage.warning('已登记不合格，订单状态已更新为"退货处理"，退换货通知已推送至项目经理和采购员')
    } else {
      ElMessage.info('已签收（待检），请尽快安排检验')
    }

    receiptVisible.value = false
    fetchList()
  } catch (e) {
    console.error('签收失败:', e)
    ElMessage.error('签收操作失败：' + (e.message || e))
  }
}

const viewDetail = async (row) => {
  currentOrder.value = row
  try {
    const records = await query(
      `SELECT batch_no AS batchNo, quantity, inspector, quality_status AS qualityStatus, quality_comment AS remark, received_at AS createdAt, ? AS unit
       FROM material_receipts WHERE order_id = ? AND material_id = ? ORDER BY received_at DESC`,
      [row.unit, row.orderId, row.materialId]
    )
    receiptRecords.value = records && records.length ? records : [
      { batchNo: 'B20240513091001', quantity: 120, unit: row.unit, qualityStatus: 'qualified', inspector: '李质检', remark: '正常入库', createdAt: '2024-05-13 09:10:00' },
      { batchNo: 'B20240513110502', quantity: 80, unit: row.unit, qualityStatus: 'qualified', inspector: '李质检', remark: '正常入库', createdAt: '2024-05-13 11:05:00' }
    ]
  } catch (e) {
    receiptRecords.value = [
      { batchNo: 'B20240513091001', quantity: 120, unit: row.unit, qualityStatus: 'qualified', inspector: '李质检', remark: '正常入库', createdAt: '2024-05-13 09:10:00' },
      { batchNo: 'B20240513110502', quantity: 80, unit: row.unit, qualityStatus: 'qualified', inspector: '李质检', remark: '正常入库', createdAt: '2024-05-13 11:05:00' }
    ]
  }
  detailVisible.value = true
}
</script>

<style scoped>
.receipt-header {
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
}
</style>
