import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { query } from '../utils/db.js'

/**
 * 项目状态管理 Store
 * 负责项目的增删改查操作
 */
export const useProjectStore = defineStore('project', () => {
  // 项目列表
  const projects = ref([])
  // 当前选中的项目
  const currentProject = ref(null)
  // 加载状态
  const loading = ref(false)

  // 已完成项目数量
  const completedCount = computed(() => {
    return projects.value.filter(p => p.status === 'completed').length
  })

  // 进行中项目数量
  const inProgressCount = computed(() => {
    return projects.value.filter(p => p.status === 'in_progress').length
  })

  /**
   * 获取所有项目列表
   */
  async function fetchProjects() {
    loading.value = true
    try {
      const sql = `
        SELECT p.*, 
               (SELECT COUNT(*) FROM construction_tasks t WHERE t.project_id = p.id) as task_count,
               (SELECT COUNT(*) FROM construction_tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_task_count
        FROM projects p
        ORDER BY p.created_at DESC
      `
      projects.value = await query(sql)
      return projects.value
    } catch (error) {
      console.error('获取项目列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 根据ID获取单个项目详情
   * @param {Number} id - 项目ID
   */
  async function fetchProject(id) {
    loading.value = true
    try {
      const sql = `
        SELECT p.*, 
               (SELECT COUNT(*) FROM construction_tasks t WHERE t.project_id = p.id) as task_count,
               (SELECT COUNT(*) FROM construction_tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_task_count
        FROM projects p
        WHERE p.id = ?
      `
      const result = await query(sql, [id])
      currentProject.value = result[0] || null
      return currentProject.value
    } catch (error) {
      console.error('获取项目详情失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新项目
   * @param {Object} data - 项目数据 { name, description, location, start_date, end_date, budget, status, manager }
   */
  async function createProject(data) {
    loading.value = true
    try {
      const sql = `
        INSERT INTO projects (name, description, location, start_date, end_date, budget, status, manager, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
      const params = [
        data.name,
        data.description || '',
        data.location || '',
        data.start_date || null,
        data.end_date || null,
        data.budget || 0,
        data.status || 'planning',
        data.manager || ''
      ]
      const result = await query(sql, params)
      const newProjectId = result.insertId || result.lastID

      // 重新获取项目列表
      await fetchProjects()

      // 返回新创建的项目
      return await fetchProject(newProjectId)
    } catch (error) {
      console.error('创建项目失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新项目信息
   * @param {Number} id - 项目ID
   * @param {Object} data - 要更新的项目数据
   */
  async function updateProject(id, data) {
    loading.value = true
    try {
      // 获取当前项目数据用于合并
      const current = await fetchProject(id)
      if (!current) {
        throw new Error('项目不存在')
      }

      const merged = { ...current, ...data }

      const sql = `
        UPDATE projects 
        SET name = ?, description = ?, location = ?, start_date = ?, end_date = ?, 
            budget = ?, status = ?, manager = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      const params = [
        merged.name,
        merged.description || '',
        merged.location || '',
        merged.start_date || null,
        merged.end_date || null,
        merged.budget || 0,
        merged.status || 'planning',
        merged.manager || '',
        id
      ]
      await query(sql, params)

      // 重新获取项目列表和当前项目
      await fetchProjects()
      return await fetchProject(id)
    } catch (error) {
      console.error('更新项目失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除项目
   * @param {Number} id - 项目ID
   */
  async function deleteProject(id) {
    loading.value = true
    try {
      const sql = 'DELETE FROM projects WHERE id = ?'
      await query(sql, [id])

      // 清空当前项目（如果删除的是当前选中的）
      if (currentProject.value && currentProject.value.id === id) {
        currentProject.value = null
      }

      // 重新获取项目列表
      await fetchProjects()
      return true
    } catch (error) {
      console.error('删除项目失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空当前选中的项目
   */
  function clearCurrentProject() {
    currentProject.value = null
  }

  return {
    // 状态
    projects,
    currentProject,
    loading,
    // 计算属性
    completedCount,
    inProgressCount,
    // 方法
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    clearCurrentProject
  }
})
