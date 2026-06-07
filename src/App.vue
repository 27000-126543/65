<template>
  <el-container class="app-container">
    <el-aside width="230px" class="app-aside">
      <div class="logo">
        <el-icon :size="28" color="#67c23a"><OfficeBuilding /></el-icon>
        <span>工程管理平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#001529"
        text-color="#c9d1d9"
        active-text-color="#67c23a"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>综合驾驶舱</span>
        </el-menu-item>
        <el-sub-menu index="project">
          <template #title>
            <el-icon><Notebook /></el-icon>
            <span>项目管理</span>
          </template>
          <el-menu-item index="/project/list">项目列表</el-menu-item>
          <el-menu-item index="/project/register">立项登记</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="schedule">
          <template #title>
            <el-icon><Calendar /></el-icon>
            <span>进度计划</span>
          </template>
          <el-menu-item index="/schedule/plan">施工进度计划</el-menu-item>
          <el-menu-item index="/schedule/approval">计划审批</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="material">
          <template #title>
            <el-icon><Goods /></el-icon>
            <span>材料管理</span>
          </template>
          <el-menu-item index="/material/inventory">库存管理</el-menu-item>
          <el-menu-item index="/material/purchase">采购订单</el-menu-item>
          <el-menu-item index="/material/receipt">材料签收</el-menu-item>
          <el-menu-item index="/material/supplier">供应商管理</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="equipment">
          <template #title>
            <el-icon><Tools /></el-icon>
            <span>设备管理</span>
          </template>
          <el-menu-item index="/equipment/list">设备台账</el-menu-item>
          <el-menu-item index="/equipment/status">实时状态监控</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="safety">
          <template #title>
            <el-icon><Warning /></el-icon>
            <span>安全管理</span>
          </template>
          <el-menu-item index="/safety/inspection">安全巡检</el-menu-item>
          <el-menu-item index="/safety/rectification">整改管理</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="stats">
          <template #title>
            <el-icon><PieChart /></el-icon>
            <span>统计报表</span>
          </template>
          <el-menu-item index="/stats/monthly">月度综合报表</el-menu-item>
          <el-menu-item index="/stats/analysis">投资偏差分析</el-menu-item>
          <el-menu-item index="/stats/visual">可视化监控</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <div class="header-title">{{ pageTitle }}</div>
        <div class="header-right">
          <el-badge :value="unreadCount" :max="99" class="notice-badge">
            <el-button circle :icon="Bell" />
          </el-badge>
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="32" style="background:#67c23a">张</el-avatar>
              <span style="margin-left:8px">张总监</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人中心</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import { useNotificationStore } from './stores/notification'

const route = useRoute()
const notificationStore = useNotificationStore()
const unreadCount = ref(0)

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta?.title || '建筑工程综合管理系统')

onMounted(() => {
  notificationStore.fetchUnreadCount().then(n => unreadCount.value = n)
})
</script>

<style scoped>
.app-container {
  height: 100vh;
}
.app-aside {
  background: #001529;
  overflow-y: auto;
}
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #1f2937;
  gap: 8px;
}
.logo span {
  background: linear-gradient(90deg, #67c23a, #409eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
:deep(.el-menu) {
  border-right: none;
}
:deep(.el-sub-menu__title:hover),
:deep(.el-menu-item:hover) {
  background: rgba(103, 194, 58, 0.1) !important;
}
.app-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}
.notice-badge {
  margin-right: 8px;
}
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.app-main {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
