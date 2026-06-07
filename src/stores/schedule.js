import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { query, transaction } from '../utils/db.js'
import { generateSchedule } from '../utils/scheduler.js'

/**
 * 进度计划状态管理 Store
 * 负责施工任务的管理及关键路径算法调度
 */
export const useScheduleStore = defineStore('schedule', () => {
  // 任务列表
  const tasks = ref([])
  // 关键路径任务ID列表
  const criticalPath = ref([])
  // 项目总工期（天）
  const totalDuration = ref(0)
  // 项目计划开始日期
  const scheduleStartDate = ref('')
  // 项目计划完成日期
  const scheduleFinishDate = ref('')
  // 加载状态
  const loading = ref(false)

  // 关键路径任务详情
  const criticalTasks = computed(() => {
    return tasks.value.filter(t => t.is_critical === 1 || t.isCritical)
  })

  // 按状态分组的任务统计
  const taskStats = computed(() => {
    const stats = {
      total: tasks.value.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
      delayed: 0
    }
    tasks.value.forEach(t => {
      const status = t.status || 'pending'
      if (stats[status] !== undefined) {
        stats[status]++
      }
    })
    return stats
  })

  /**
   * 获取指定项目的所有任务
   * @param {Number} projectId - 项目ID
   */
  async function fetchTasks(projectId) {
    loading.value = true
    try {
      const sql = `
        SELECT t.*
        FROM construction_tasks t
        WHERE t.project_id = ?
        ORDER BY t.es, t.id
      `
      tasks.value = await query(sql, [projectId])
      return tasks.value
    } catch (error) {
      console.error('获取任务列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建单个任务
   * @param {Object} data - 任务数据
   * { project_id, name, description, duration, predecessors: [], status, assignee, resource_requirements }
   */
  async function createTask(data) {
    loading.value = true
    try {
      const predecessorsJson = data.predecessors
        ? JSON.stringify(data.predecessors)
        : '[]'

      const sql = `
        INSERT INTO construction_tasks 
          (project_id, name, description, duration, predecessors, status, 
           assignee, resource_requirements, es, ef, ls, lf, 
           total_float, free_float, is_critical, start_date, finish_date, 
           created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, 0, 0, 0, ?, ?, datetime('now'), datetime('now'))
      `
      const params = [
        data.project_id,
        data.name,
        data.description || '',
        data.duration || 0,
        predecessorsJson,
        data.status || 'pending',
        data.assignee || '',
        data.resource_requirements || '',
        data.duration || 0,
        data.duration || 0,
        data.start_date || null,
        data.finish_date || null
      ]
      const result = await query(sql, params)
      const taskId = result.insertId || result.lastID

      // 重新获取任务列表
      await fetchTasks(data.project_id)

      // 返回新创建的任务
      const newTasks = await query('SELECT * FROM construction_tasks WHERE id = ?', [taskId])
      return newTasks[0]
    } catch (error) {
      console.error('创建任务失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新任务信息
   * @param {Number} id - 任务ID
   * @param {Object} data - 要更新的任务数据
   */
  async function updateTask(id, data) {
    loading.value = true
    try {
      // 获取当前任务
      const currentResult = await query('SELECT * FROM construction_tasks WHERE id = ?', [id])
      if (!currentResult || currentResult.length === 0) {
        throw new Error('任务不存在')
      }
      const current = currentResult[0]
      const merged = { ...current, ...data }

      const predecessorsJson = merged.predecessors
        ? (typeof merged.predecessors === 'string' ? merged.predecessors : JSON.stringify(merged.predecessors))
        : '[]'

      const sql = `
        UPDATE construction_tasks 
        SET name = ?, description = ?, duration = ?, predecessors = ?, 
            status = ?, assignee = ?, resource_requirements = ?,
            es = ?, ef = ?, ls = ?, lf = ?, total_float = ?, free_float = ?,
            is_critical = ?, start_date = ?, finish_date = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      const params = [
        merged.name,
        merged.description || '',
        merged.duration || 0,
        predecessorsJson,
        merged.status || 'pending',
        merged.assignee || '',
        merged.resource_requirements || '',
        merged.es || 0,
        merged.ef || 0,
        merged.ls || 0,
        merged.lf || 0,
        merged.total_float || 0,
        merged.free_float || 0,
        merged.is_critical || merged.isCritical ? 1 : 0,
        merged.start_date || merged.startDate || null,
        merged.finish_date || merged.finishDate || null,
        id
      ]
      await query(sql, params)

      // 重新获取任务列表
      if (merged.project_id) {
        await fetchTasks(merged.project_id)
      }

      // 返回更新后的任务
      const updated = await query('SELECT * FROM construction_tasks WHERE id = ?', [id])
      return updated[0]
    } catch (error) {
      console.error('更新任务失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除任务
   * @param {Number} id - 任务ID
   * @param {Number} projectId - 项目ID（用于刷新列表）
   */
  async function deleteTask(id, projectId) {
    loading.value = true
    try {
      const sql = 'DELETE FROM construction_tasks WHERE id = ?'
      await query(sql, [id])

      // 重新获取任务列表
      if (projectId) {
        await fetchTasks(projectId)
      }
      return true
    } catch (error) {
      console.error('删除任务失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 使用关键路径算法生成进度计划并保存到数据库
   * @param {Number} projectId - 项目ID
   * @param {Array} tasks - 任务数组 [{id, name, duration, predecessors:[id,...]}]
   * @param {String|Date} startDate - 项目开始日期
   */
  async function generateAndSaveSchedule(projectId, tasks, startDate) {
    loading.value = true
    try {
      // 调用关键路径算法
      const scheduleResult = generateSchedule(tasks, startDate)

      // 保存计算结果
      criticalPath.value = scheduleResult.criticalPath
      totalDuration.value = scheduleResult.totalDuration
      scheduleStartDate.value = scheduleResult.startDate
      scheduleFinishDate.value = scheduleResult.finishDate

      // 构建事务语句，批量更新所有任务
      const statements = []

      // 先删除该项目原有的所有任务
      statements.push({
        sql: 'DELETE FROM construction_tasks WHERE project_id = ?',
        params: [projectId]
      })

      // 插入新的任务数据（包含所有计算字段）
      scheduleResult.tasks.forEach(task => {
        const predecessorsJson = task.predecessors
          ? JSON.stringify(task.predecessors)
          : '[]'

        statements.push({
          sql: `
            INSERT INTO construction_tasks 
              (project_id, name, description, duration, predecessors, status,
               assignee, resource_requirements, es, ef, ls, lf,
               total_float, free_float, is_critical, start_date, finish_date,
               late_start_date, late_finish_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `,
          params: [
            projectId,
            task.name,
            task.description || '',
            task.duration,
            predecessorsJson,
            task.status || 'pending',
            task.assignee || '',
            task.resource_requirements || '',
            task.es,
            task.ef,
            task.ls,
            task.lf,
            task.totalFloat,
            task.freeFloat,
            task.isCritical ? 1 : 0,
            task.startDate,
            task.finishDate,
            task.lateStartDate,
            task.lateFinishDate
          ]
        })
      })

      // 更新项目的开始和结束日期
      statements.push({
        sql: `
          UPDATE projects 
          SET start_date = ?, end_date = ?, updated_at = datetime('now')
          WHERE id = ?
        `,
        params: [scheduleResult.startDate, scheduleResult.finishDate, projectId]
      })

      // 执行事务
      await transaction(statements)

      // 重新加载任务列表
      await fetchTasks(projectId)

      return scheduleResult
    } catch (error) {
      console.error('生成进度计划失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新任务进度
   * @param {Number} taskId - 任务ID
   * @param {String} status - 新状态 (pending, in_progress, completed)
   * @param {Number} projectId - 项目ID
   */
  async function updateTaskStatus(taskId, status, projectId) {
    loading.value = true
    try {
      const sql = `
        UPDATE construction_tasks 
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      await query(sql, [status, taskId])

      // 重新获取任务列表
      if (projectId) {
        await fetchTasks(projectId)
      }
      return true
    } catch (error) {
      console.error('更新任务状态失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空当前进度计划数据
   */
  function clearSchedule() {
    tasks.value = []
    criticalPath.value = []
    totalDuration.value = 0
    scheduleStartDate.value = ''
    scheduleFinishDate.value = ''
  }

  return {
    // 状态
    tasks,
    criticalPath,
    totalDuration,
    scheduleStartDate,
    scheduleFinishDate,
    loading,
    // 计算属性
    criticalTasks,
    taskStats,
    // 方法
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    generateAndSaveSchedule,
    updateTaskStatus,
    clearSchedule
  }
})
