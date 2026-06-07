<template>
  <div class="material-inventory">
    <el-row :gutter="16" class="mb-16">
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #409eff">
          <div class="stat-label">物料总数</div>
          <div class="stat-value" style="color:#409eff">{{ stats.total }}</div>
          <div class="stat-sub">SKU 种类</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #67c23a">
          <div class="stat-label">库存总值</div>
          <div class="stat-value" style="color:#67c23a">{{ formatMoney(stats.totalValue) }}</div>
          <div class="stat-sub">当前库存估价</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #e6a23c">
          <div class="stat-label">预警物料数</div>
          <div class="stat-value" style="color:#e6a23c">{{ stats.warning }}</div>
          <div class="stat-sub">接近安全库存</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #f56c6c">
          <div class="stat-label">库存不足</div>
          <div class="stat-value" style="color:#f56c6c">{{ stats.shortage }}</div>
          <div class="stat-sub">低于安全库存</div>
        </div>
      </el-col>
    </el-row>

    <div class="page-card">
      <div class="page-header">
        <h2>库存管理</h2>
      </div>
      <el-form :inline="true" :model="filterForm" class="mb-12">
        <el-form-item label="分类">
          <el-select v-model="filterForm.category" placeholder="全部分类" clearable style="width: 160px">
            <el-option label="钢筋类" value="钢筋类" />
            <el-option label="水泥类" value="水泥类" />
            <el-option label="砂石类" value="砂石类" />
            <el-option label="木材类" value="木材类" />
            <el-option label="防水材料" value="防水材料" />
            <el-option label="五金配件" value="五金配件" />
            <el-option label="水电材料" value="水电材料" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 160px">
            <el-option label="正常" value="normal" />
            <el-option label="预警" value="warning" />
            <el-option label="不足" value="shortage" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="filterForm.keyword" placeholder="物料编码/名称" clearable style="width: 200px" @input="filterList" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="filterList">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="filteredList" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="code" label="物料编码" width="140" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="spec" label="规格" width="140" />
        <el-table-column prop="category" label="分类" width="110" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column label="单价" width="110">
          <template #default="{ row }">{{ formatMoney(row.unitPrice) }}</template>
        </el-table-column>
        <el-table-column prop="currentStock" label="当前库存" width="110" align="right" />
        <el-table-column prop="safetyStock" label="安全库存" width="110" align="right" />
        <el-table-column label="库存状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'normal'" type="success" effect="dark">正常</el-tag>
            <el-tag v-else-if="row.status === 'warning'" type="warning" effect="dark">预警</el-tag>
            <el-tag v-else type="danger" effect="dark">不足</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="库存金额" width="130" align="right">
          <template #default="{ row }">{{ formatMoney(row.currentStock * row.unitPrice) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="adjustStock(row)">调整库存</el-button>
            <el-button link type="success" size="small" @click="viewRecords(row)">出入库记录</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="adjustVisible" title="调整库存" width="460px">
      <div v-if="currentMaterial" class="mb-12">
        <div>物料：<b>{{ currentMaterial.name }}</b>（{{ currentMaterial.code }}）</div>
        <div>规格：{{ currentMaterial.spec }}，当前库存：<b style="color:#409eff">{{ currentMaterial.currentStock }}</b> {{ currentMaterial.unit }}</div>
      </div>
      <el-form :model="adjustForm" label-width="90px">
        <el-form-item label="调整类型">
          <el-radio-group v-model="adjustForm.type">
            <el-radio-button value="in">入库</el-radio-button>
            <el-radio-button value="out">出库</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="adjustForm.quantity" :min="1" :max="adjustForm.type === 'out' ? currentMaterial?.currentStock : 99999" />
        </el-form-item>
        <el-form-item label="关联单号">
          <el-input v-model="adjustForm.orderNo" placeholder="采购单号/领料单号" />
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="adjustForm.operator" placeholder="请输入操作人姓名" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="adjustForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAdjust">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="recordsVisible" title="出入库记录" width="820px">
      <div v-if="currentMaterial" class="mb-12">
        物料：<b>{{ currentMaterial.name }}</b>（{{ currentMaterial.code }}），当前库存：<b style="color:#409eff">{{ currentMaterial.currentStock }}</b> {{ currentMaterial.unit }}
      </div>
      <el-table :data="recordList" border stripe size="small" style="width: 100%">
        <el-table-column type="index" label="序号" width="50" />
        <el-table-column prop="type" label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'in'" type="success" size="small">入库</el-tag>
            <el-tag v-else type="danger" size="small">出库</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="90" align="right" />
        <el-table-column prop="orderNo" label="关联单号" width="160" />
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="remark" label="备注" min-width="150" />
        <el-table-column prop="createdAt" label="操作时间" width="160" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { formatMoney, formatDateTime, now } from '../../utils/helpers'
import { query, exec } from '../../utils/db'

const materialList = ref([])
const filterForm = reactive({ category: '', status: '', keyword: '' })

const stats = computed(() => {
  const list = materialList.value
  return {
    total: list.length,
    totalValue: list.reduce((s, r) => s + r.currentStock * r.unitPrice, 0),
    warning: list.filter(r => r.status === 'warning').length,
    shortage: list.filter(r => r.status === 'shortage').length
  }
})

const filteredList = computed(() => {
  let list = [...materialList.value]
  if (filterForm.category) list = list.filter(r => r.category === filterForm.category)
  if (filterForm.status) list = list.filter(r => r.status === filterForm.status)
  if (filterForm.keyword) {
    const kw = filterForm.keyword.toLowerCase()
    list = list.filter(r => r.code.toLowerCase().includes(kw) || r.name.toLowerCase().includes(kw))
  }
  return list
})

const getStatus = (current, safety) => {
  if (current <= 0) return 'shortage'
  if (current < safety) return 'shortage'
  if (current < safety * 1.5) return 'warning'
  return 'normal'
}

const mockData = () => [
  { id: 1, code: 'GJ-HRB400-12', name: '热轧带肋钢筋', spec: 'HRB400 Φ12mm', category: '钢筋类', unit: '吨', unitPrice: 4850, currentStock: 85, safetyStock: 50 },
  { id: 2, code: 'GJ-HRB400-16', name: '热轧带肋钢筋', spec: 'HRB400 Φ16mm', category: '钢筋类', unit: '吨', unitPrice: 4720, currentStock: 42, safetyStock: 50 },
  { id: 3, code: 'GJ-HRB400-25', name: '热轧带肋钢筋', spec: 'HRB400 Φ25mm', category: '钢筋类', unit: '吨', unitPrice: 4680, currentStock: 18, safetyStock: 40 },
  { id: 4, code: 'SN-PO425', name: '硅酸盐水泥', spec: 'P·O 42.5', category: '水泥类', unit: '吨', unitPrice: 485, currentStock: 320, safetyStock: 200 },
  { id: 5, code: 'SN-PO525', name: '硅酸盐水泥', spec: 'P·O 52.5', category: '水泥类', unit: '吨', unitPrice: 560, currentStock: 65, safetyStock: 100 },
  { id: 6, code: 'SS-5-25', name: '黄砂（中粗）', spec: '5-25mm', category: '砂石类', unit: '立方米', unitPrice: 125, currentStock: 800, safetyStock: 500 },
  { id: 7, code: 'SS-G1-3', name: '碎石', spec: '1-3cm', category: '砂石类', unit: '立方米', unitPrice: 98, currentStock: 280, safetyStock: 400 },
  { id: 8, code: 'MC-PINE', name: '松木模板', spec: '1830×915×15mm', category: '木材类', unit: '张', unitPrice: 85, currentStock: 1200, safetyStock: 800 },
  { id: 9, code: 'MC-SCAFFOLD', name: '脚手架木方', spec: '40×80×4000mm', category: '木材类', unit: '根', unitPrice: 28, currentStock: 35, safetyStock: 200 },
  { id: 10, code: 'FS-SBS-3mm', name: 'SBS防水卷材', spec: '3mm厚聚酯胎', category: '防水材料', unit: '卷', unitPrice: 165, currentStock: 260, safetyStock: 150 },
  { id: 11, code: 'FS-PU-20kg', name: '聚氨酯防水涂料', spec: '20kg/桶', category: '防水材料', unit: '桶', unitPrice: 380, currentStock: 45, safetyStock: 30 },
  { id: 12, code: 'HW-EXP-M12', name: '膨胀螺栓', spec: 'M12×100mm', category: '五金配件', unit: '个', unitPrice: 1.2, currentStock: 2800, safetyStock: 1000 },
  { id: 13, code: 'HW-NAIL-50', name: '铁钉', spec: '50mm', category: '五金配件', unit: '公斤', unitPrice: 8.5, currentStock: 120, safetyStock: 50 },
  { id: 14, code: 'EL-WIRE-BV2.5', name: '铜芯聚氯乙烯绝缘电线', spec: 'BV-2.5mm²', category: '水电材料', unit: '米', unitPrice: 2.4, currentStock: 5500, safetyStock: 3000 },
  { id: 15, code: 'EL-PIPE-PPR32', name: 'PPR给水管', spec: 'De32×4.4mm', category: '水电材料', unit: '米', unitPrice: 12.8, currentStock: 480, safetyStock: 300 },
  { id: 16, code: 'PL-PVC-U110', name: 'PVC-U排水管', spec: 'De110×3.2mm', category: '水电材料', unit: '米', unitPrice: 18.5, currentStock: 85, safetyStock: 200 }
]

onMounted(async () => {
  try {
    const rows = await query('SELECT * FROM materials ORDER BY id DESC')
    if (rows && rows.length) {
      materialList.value = rows.map(r => ({
        ...r,
        unitPrice: r.unit_price,
        currentStock: r.current_stock,
        safetyStock: r.safety_stock,
        status: getStatus(r.current_stock, r.safety_stock)
      }))
    } else {
      materialList.value = mockData().map(r => ({ ...r, status: getStatus(r.currentStock, r.safetyStock) }))
    }
  } catch (e) {
    materialList.value = mockData().map(r => ({ ...r, status: getStatus(r.currentStock, r.safetyStock) }))
  }
})

const filterList = () => {}

const resetFilter = () => {
  filterForm.category = ''
  filterForm.status = ''
  filterForm.keyword = ''
}

const adjustVisible = ref(false)
const currentMaterial = ref(null)
const adjustForm = reactive({ type: 'in', quantity: 1, orderNo: '', operator: '', remark: '' })

const adjustStock = (row) => {
  currentMaterial.value = row
  adjustForm.type = 'in'
  adjustForm.quantity = 1
  adjustForm.orderNo = ''
  adjustForm.operator = ''
  adjustForm.remark = ''
  adjustVisible.value = true
}

const confirmAdjust = async () => {
  if (!adjustForm.quantity || adjustForm.quantity < 1) {
    ElMessage.warning('请输入有效的数量')
    return
  }
  if (!adjustForm.operator.trim()) {
    ElMessage.warning('请输入操作人')
    return
  }
  const mat = currentMaterial.value
  const delta = adjustForm.type === 'in' ? adjustForm.quantity : -adjustForm.quantity
  if (adjustForm.type === 'out' && adjustForm.quantity > mat.currentStock) {
    ElMessage.error('出库数量不能超过当前库存')
    return
  }
  try {
    const newStock = mat.currentStock + delta
    const sql = `UPDATE materials SET current_stock=${newStock} WHERE id=${mat.id}`
    await exec(sql)
  } catch (e) {}
  mat.currentStock += delta
  mat.status = getStatus(mat.currentStock, mat.safetyStock)
  ElMessage.success(`库存已${adjustForm.type === 'in' ? '增加' : '减少'} ${adjustForm.quantity} ${mat.unit}`)
  adjustVisible.value = false
}

const recordsVisible = ref(false)
const recordList = ref([])

const viewRecords = (row) => {
  currentMaterial.value = row
  const records = []
  for (let i = 0; i < 8; i++) {
    const isIn = Math.random() > 0.4
    records.push({
      type: isIn ? 'in' : 'out',
      quantity: Math.floor(Math.random() * 30) + 5,
      orderNo: isIn ? `PO-20240${5 + (i % 4)}${(i + 10).toString().padStart(2, '0')}` : `LL-20240${5 + (i % 4)}${(i + 15).toString().padStart(2, '0')}`,
      operator: ['王仓库', '李库管', '张收货'][i % 3],
      remark: isIn ? '采购入库' : '现场领料',
      createdAt: formatDateTime(new Date(Date.now() - i * 86400000 * 2))
    })
  }
  recordList.value = records
  recordsVisible.value = true
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
</style>
