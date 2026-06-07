<template>
  <div class="visual-monitor">
    <div class="page-card mb-16">
      <div class="page-header">
        <h2>可视化监控 - 平面图热力图</h2>
        <el-button type="primary" :icon="Refresh" @click="loadData" :loading="loading">实时刷新</el-button>
      </div>
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="选择项目">
          <el-select v-model="filters.projectId" placeholder="请选择项目" style="width: 300px" @change="loadData">
            <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <el-row :gutter="16">
      <el-col :span="18">
        <div class="page-card map-container">
          <div class="section-title">施工区进度热力图 & 设备分布</div>
          <div ref="mapChartRef" class="map-chart"></div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="page-card legend-card mb-16">
          <div class="section-title">图例说明</div>
          <div class="legend-group">
            <div class="legend-title">进度热力</div>
            <div class="heatmap-legend">
              <div class="heatmap-bar"></div>
              <div class="heatmap-labels">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
          <div class="legend-group">
            <div class="legend-title">设备状态</div>
            <div class="legend-item">
              <span class="dot dot-working"></span>
              <span>运行中 (working)</span>
            </div>
            <div class="legend-item">
              <span class="dot dot-standby"></span>
              <span>待机 (standby)</span>
            </div>
            <div class="legend-item">
              <span class="dot dot-maintenance"></span>
              <span>维修中 (maintenance)</span>
            </div>
          </div>
        </div>

        <div class="page-card zone-card mb-16">
          <div class="section-title">施工区列表</div>
          <div class="zone-list" v-loading="loading">
            <div v-for="zone in zones" :key="zone.id" class="zone-item">
              <div class="zone-header">
                <span class="zone-code">{{ zone.zone_code }}</span>
                <span class="zone-progress">{{ Number(zone.progress).toFixed(1) }}%</span>
              </div>
              <div class="zone-name">{{ zone.zone_name }}</div>
              <el-progress :percentage="Number(zone.progress)" :stroke-width="6" :color="progressColor(zone.progress)" />
            </div>
            <el-empty v-if="zones.length === 0" description="暂无施工区数据" :image-size="60" />
          </div>
        </div>

        <div class="page-card equip-card">
          <div class="section-title">设备列表</div>
          <div class="equip-list" v-loading="loading">
            <div v-for="eq in equipment" :key="eq.id" class="equip-item">
              <div class="equip-info">
                <span class="equip-code">{{ eq.code }}</span>
                <span class="equip-name">{{ eq.name }}</span>
              </div>
              <el-tag size="small" :type="equipStatusType(eq.status)" effect="light">
                {{ equipStatusText(eq.status) }}
              </el-tag>
            </div>
            <el-empty v-if="equipment.length === 0" description="暂无设备数据" :image-size="60" />
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useStatsStore } from '../../stores/stats'

const statsStore = useStatsStore()

const loading = ref(false)
const projectList = ref([])
const zones = ref([])
const equipment = ref([])

const filters = reactive({
  projectId: null
})

const mapChartRef = ref(null)
let mapChart = null

const progressColor = (p) => {
  const progress = Number(p) || 0
  if (progress >= 80) return '#67c23a'
  if (progress >= 50) return '#e6a23c'
  return '#f56c6c'
}

const equipStatusText = (s) => ({
  working: '运行中',
  standby: '待机',
  maintenance: '维修中',
  idle: '待机',
  running: '运行中',
  repair: '维修中',
  fault: '故障'
}[s] || s)

const equipStatusType = (s) => ({
  working: 'success',
  running: 'success',
  standby: 'info',
  idle: 'info',
  maintenance: 'warning',
  repair: 'warning',
  fault: 'danger'
}[s] || '')

const loadProjects = async () => {
  projectList.value = await statsStore.fetchProjects()
  if (projectList.value.length > 0 && !filters.projectId) {
    filters.projectId = projectList.value[0].id
  }
}

const loadData = async () => {
  if (!filters.projectId) {
    zones.value = []
    equipment.value = []
    initMapChart()
    return
  }
  loading.value = true
  try {
    const [z, e] = await Promise.all([
      statsStore.fetchConstructionZones(filters.projectId),
      statsStore.fetchEquipmentByProject(filters.projectId)
    ])
    zones.value = z
    equipment.value = e
    await nextTick()
    initMapChart()
  } catch (err) {
    console.error(err)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const progressToColor = (progress) => {
  const p = Math.max(0, Math.min(100, Number(progress) || 0))
  if (p >= 100) return 'rgba(103, 194, 58, 0.85)'
  if (p >= 80) return 'rgba(103, 194, 58, 0.75)'
  if (p >= 60) return 'rgba(186, 204, 77, 0.75)'
  if (p >= 40) return 'rgba(230, 162, 60, 0.75)'
  if (p >= 20) return 'rgba(245, 108, 108, 0.7)'
  return 'rgba(245, 108, 108, 0.85)'
}

const equipToColor = (status) => ({
  working: '#67c23a',
  running: '#67c23a',
  standby: '#909399',
  idle: '#909399',
  maintenance: '#f56c6c',
  repair: '#f56c6c',
  fault: '#f56c6c'
}[status] || '#909399')

const initMapChart = () => {
  if (!mapChartRef.value) return
  if (!mapChart) mapChart = echarts.init(mapChartRef.value)

  let maxX = 100
  let maxY = 100
  if (zones.value.length > 0) {
    zones.value.forEach(z => {
      const right = (z.pos_x || 0) + (z.width || 0)
      const bottom = (z.pos_y || 0) + (z.height || 0)
      if (right > maxX) maxX = right + 10
      if (bottom > maxY) maxY = bottom + 10
    })
  }

  const zoneRects = zones.value.map(zone => {
    const zx = zone.pos_x || 0
    const zy = zone.pos_y || 0
    const zw = zone.width || 20
    const zh = zone.height || 20
    const zoneEquips = equipment.value.filter(eq => {
      if (eq.section) {
        return zone.zone_name.includes(eq.section) || eq.section.includes(zone.zone_code)
      }
      const ex = zx + zw / 2 + (Math.random() - 0.5) * zw * 0.6
      const ey = zy + zh / 2 + (Math.random() - 0.5) * zh * 0.6
      return ex >= zx && ex <= zx + zw && ey >= zy && ey <= zy + zh
    })
    return {
      type: 'rect',
      left: zx,
      top: zy,
      shape: { width: zw, height: zh },
      style: {
        fill: progressToColor(zone.progress),
        stroke: '#fff',
        lineWidth: 2,
        shadowBlur: 4,
        shadowColor: 'rgba(0,0,0,0.15)'
      },
      emphasis: {
        style: {
          shadowBlur: 10,
          shadowColor: 'rgba(64,158,255,0.5)',
          lineWidth: 3,
          stroke: '#409eff'
        }
      },
      info: {
        name: zone.zone_name,
        code: zone.zone_code,
        progress: zone.progress,
        equipment: zoneEquips
      }
    }
  })

  const zoneLabels = zones.value.map(zone => {
    const zx = zone.pos_x || 0
    const zy = zone.pos_y || 0
    const zw = zone.width || 20
    const zh = zone.height || 20
    return {
      type: 'text',
      left: zx + zw / 2,
      top: zy + zh / 2,
      style: {
        text: `${zone.zone_code}\n${Number(zone.progress).toFixed(0)}%`,
        fill: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        textVerticalAlign: 'middle',
        lineHeight: 16,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowBlur: 3
      },
      silent: true
    }
  })

  const equipDots = []
  equipment.value.forEach(eq => {
    let ex, ey
    const matchedZone = zones.value.find(z => {
      if (eq.section) {
        return z.zone_name.includes(eq.section) || eq.section.includes(z.zone_code)
      }
      return false
    })
    if (matchedZone) {
      const zx = matchedZone.pos_x || 0
      const zy = matchedZone.pos_y || 0
      const zw = matchedZone.width || 20
      const zh = matchedZone.height || 20
      const existingInZone = equipDots.filter(d => {
        const mz = zones.value.find(z => z.id === matchedZone.id)
        if (!mz) return false
        return d.x >= zx && d.x <= zx + zw && d.y >= zy && d.y <= zy + zh
      }).length
      const cols = Math.ceil(Math.sqrt(existingInZone + 1))
      const col = existingInZone % cols
      const row = Math.floor(existingInZone / cols)
      ex = zx + 4 + (zw - 8) * (col + 0.5) / Math.max(cols, 1)
      ey = zy + 4 + (zh - 8) * (row + 0.5) / Math.max(cols, 1)
    } else {
      ex = 5 + Math.random() * (maxX - 10)
      ey = 5 + Math.random() * (maxY - 10)
    }
    equipDots.push({
      x: ex,
      y: ey,
      status: eq.status,
      code: eq.code,
      name: eq.name
    })
  })

  const equipCircles = equipDots.map(dot => ({
    type: 'circle',
    left: dot.x,
    top: dot.y,
    shape: { r: 5 },
    style: {
      fill: equipToColor(dot.status),
      stroke: '#fff',
      lineWidth: 2
    },
    emphasis: {
      style: {
        shadowBlur: 8,
        shadowColor: equipToColor(dot.status)
      }
    },
    info: {
      type: 'equipment',
      code: dot.code,
      name: dot.name,
      status: dot.status
    }
  }))

  const customData = zones.value.map(zone => {
    const zx = zone.pos_x || 0
    const zy = zone.pos_y || 0
    const zw = zone.width || 20
    const zh = zone.height || 20
    const zoneEquips = equipment.value.filter(eq => {
      if (eq.section) {
        return zone.zone_name.includes(eq.section) || eq.section.includes(zone.zone_code)
      }
      return false
    })
    return {
      value: [zx + zw / 2, zy + zh / 2, zone.progress],
      info: {
        name: zone.zone_name,
        code: zone.zone_code,
        progress: zone.progress,
        equipment: zoneEquips
      }
    }
  })

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const info = params.data?.info
        if (!info) return ''
        if (info.type === 'equipment') {
          return `<div style="font-weight:bold;margin-bottom:4px">${info.code} ${info.name}</div>
                  <div>状态: ${equipStatusText(info.status)}</div>`
        }
        const equipNames = (info.equipment || []).map(e => `${e.code} ${e.name}`).join('<br/>') || '无'
        return `<div style="font-weight:bold;margin-bottom:6px">${info.name} (${info.code})</div>
                <div style="margin-bottom:4px">进度: <b>${Number(info.progress).toFixed(1)}%</b></div>
                <div style="margin-bottom:4px">区域设备:</div>
                <div style="font-size:12px;color:#606266">${equipNames}</div>`
      }
    },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'value',
      min: 0,
      max: maxX,
      show: false
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: maxY,
      inverse: true,
      show: false
    },
    series: [
      {
        type: 'custom',
        renderItem: (params, api) => { return {} },
        data: customData,
        silent: false
      }
    ],
    graphic: [...zoneRects, ...zoneLabels, ...equipCircles]
  }

  mapChart.setOption(option, true)
}

const handleResize = () => {
  mapChart?.resize()
  setTimeout(() => initMapChart(), 100)
}

onMounted(async () => {
  await loadProjects()
  await loadData()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  mapChart?.dispose()
})
</script>

<style scoped>
.visual-monitor {
  width: 100%;
}
.filter-form {
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
}
.map-container {
  min-height: 600px;
}
.map-chart {
  width: 100%;
  height: 560px;
  background: linear-gradient(135deg, #f0f4f8 0%, #e4ebf2 100%);
  border-radius: 6px;
  position: relative;
}
.legend-card { }
.legend-group {
  margin-bottom: 16px;
}
.legend-group:last-child {
  margin-bottom: 0;
}
.legend-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}
.heatmap-legend { }
.heatmap-bar {
  height: 16px;
  border-radius: 3px;
  background: linear-gradient(to right,
    rgba(245, 108, 108, 0.85) 0%,
    rgba(230, 162, 60, 0.75) 50%,
    rgba(103, 194, 58, 0.85) 100%);
  margin-bottom: 4px;
}
.heatmap-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #6b7280;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  color: #374151;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 2px rgba(0,0,0,0.2);
}
.dot-working { background: #67c23a; }
.dot-standby { background: #909399; }
.dot-maintenance { background: #f56c6c; }
.zone-card { }
.zone-list {
  max-height: 260px;
  overflow-y: auto;
}
.zone-item {
  padding: 10px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.zone-item:last-child { border-bottom: none; }
.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.zone-code {
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
}
.zone-progress {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
}
.zone-name {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}
.equip-card { }
.equip-list {
  max-height: 240px;
  overflow-y: auto;
}
.equip-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.equip-item:last-child { border-bottom: none; }
.equip-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.equip-code {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
.equip-name {
  font-size: 11px;
  color: #6b7280;
}
</style>
