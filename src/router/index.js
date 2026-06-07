import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '综合驾驶舱' } },
  { path: '/project/list', component: () => import('../views/project/ProjectList.vue'), meta: { title: '项目列表' } },
  { path: '/project/register', component: () => import('../views/project/ProjectRegister.vue'), meta: { title: '立项登记' } },
  { path: '/project/detail/:id', component: () => import('../views/project/ProjectDetail.vue'), meta: { title: '项目详情' } },
  { path: '/schedule/plan', component: () => import('../views/schedule/SchedulePlan.vue'), meta: { title: '施工进度计划' } },
  { path: '/schedule/approval', component: () => import('../views/schedule/ScheduleApproval.vue'), meta: { title: '计划审批' } },
  { path: '/material/inventory', component: () => import('../views/material/MaterialInventory.vue'), meta: { title: '库存管理' } },
  { path: '/material/purchase', component: () => import('../views/material/PurchaseOrder.vue'), meta: { title: '采购订单' } },
  { path: '/material/receipt', component: () => import('../views/material/MaterialReceipt.vue'), meta: { title: '材料签收' } },
  { path: '/material/supplier', component: () => import('../views/material/SupplierList.vue'), meta: { title: '供应商管理' } },
  { path: '/equipment/list', component: () => import('../views/equipment/EquipmentList.vue'), meta: { title: '设备台账' } },
  { path: '/equipment/status', component: () => import('../views/equipment/EquipmentStatus.vue'), meta: { title: '实时状态监控' } },
  { path: '/safety/inspection', component: () => import('../views/safety/SafetyInspection.vue'), meta: { title: '安全巡检' } },
  { path: '/safety/rectification', component: () => import('../views/safety/Rectification.vue'), meta: { title: '整改管理' } },
  { path: '/stats/monthly', component: () => import('../views/stats/MonthlyReport.vue'), meta: { title: '月度综合报表' } },
  { path: '/stats/analysis', component: () => import('../views/stats/InvestmentAnalysis.vue'), meta: { title: '投资偏差分析' } },
  { path: '/stats/visual', component: () => import('../views/stats/VisualMonitor.vue'), meta: { title: '可视化监控' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
