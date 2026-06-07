import dayjs from 'dayjs'

/**
 * 关键路径算法 (CPM - Critical Path Method) 实现
 * 计算每个任务的：
 * - ES: 最早开始时间 (Earliest Start)
 * - EF: 最早完成时间 (Earliest Finish)
 * - LS: 最晚开始时间 (Latest Start)
 * - LF: 最晚完成时间 (Latest Finish)
 * - Total Float: 总时差 (不影响总工期的前提下可延迟的天数)
 * - Free Float: 自由时差 (不影响后续任务最早开始的前提下可延迟的天数)
 */

/**
 * 生成进度计划
 * @param {Array} tasks - 任务列表 [{id, name, duration, predecessors:[id,...]}]
 * @param {String|Date} startDate - 项目开始日期
 * @returns {Object} { tasks: 计算后的任务数组, criticalPath: 关键路径任务ID列表, totalDuration: 总工期(天) }
 */
export function generateSchedule(tasks, startDate) {
  if (!tasks || tasks.length === 0) {
    return { tasks: [], criticalPath: [], totalDuration: 0 }
  }

  const start = dayjs(startDate)
  const taskMap = new Map()

  // 初始化任务对象，复制原始数据并添加计算字段
  tasks.forEach(task => {
    taskMap.set(task.id, {
      ...task,
      es: 0,
      ef: 0,
      ls: 0,
      lf: 0,
      totalFloat: 0,
      freeFloat: 0,
      isCritical: false,
      successors: []
    })
  })

  // 构建后继任务关系
  taskMap.forEach(task => {
    if (task.predecessors && task.predecessors.length > 0) {
      task.predecessors.forEach(predId => {
        const pred = taskMap.get(predId)
        if (pred) {
          pred.successors.push(task.id)
        }
      })
    }
  })

  // === 第一步：正向遍历计算 ES 和 EF ===
  // 拓扑排序：按依赖顺序处理
  const sorted = topologicalSort(taskMap)

  sorted.forEach(taskId => {
    const task = taskMap.get(taskId)
    const predecessors = task.predecessors || []

    if (predecessors.length === 0) {
      // 没有前置任务，ES 从 0 开始
      task.es = 0
    } else {
      // ES = max(所有前置任务的 EF)
      task.es = Math.max(...predecessors.map(pid => {
        const pred = taskMap.get(pid)
        return pred ? pred.ef : 0
      }))
    }
    // EF = ES + duration
    task.ef = task.es + task.duration
  })

  // 项目总工期 = 所有任务 EF 的最大值
  const totalDuration = Math.max(...Array.from(taskMap.values()).map(t => t.ef))

  // === 第二步：反向遍历计算 LS 和 LF ===
  const reversedSorted = [...sorted].reverse()

  reversedSorted.forEach(taskId => {
    const task = taskMap.get(taskId)
    const successors = task.successors || []

    if (successors.length === 0) {
      // 没有后继任务，LF = 项目总工期
      task.lf = totalDuration
    } else {
      // LF = min(所有后继任务的 LS)
      task.lf = Math.min(...successors.map(sid => {
        const succ = taskMap.get(sid)
        return succ ? succ.ls : totalDuration
      }))
    }
    // LS = LF - duration
    task.ls = task.lf - task.duration
  })

  // === 第三步：计算时差 ===
  taskMap.forEach(task => {
    // 总时差 = LS - ES (或 LF - EF)
    task.totalFloat = task.ls - task.es

    // 自由时差 = min(后继任务的 ES) - 当前任务的 EF
    if (task.successors.length === 0) {
      task.freeFloat = 0
    } else {
      const minSuccessorEs = Math.min(...task.successors.map(sid => {
        const succ = taskMap.get(sid)
        return succ ? succ.es : totalDuration
      }))
      task.freeFloat = minSuccessorEs - task.ef
    }

    // 总时差为 0 的任务是关键路径任务
    task.isCritical = task.totalFloat === 0
  })

  // === 第四步：转换为日期格式并组装结果 ===
  const resultTasks = Array.from(taskMap.values()).map(task => ({
    ...task,
    startDate: start.add(task.es, 'day').format('YYYY-MM-DD'),
    finishDate: start.add(task.ef, 'day').format('YYYY-MM-DD'),
    lateStartDate: start.add(task.ls, 'day').format('YYYY-MM-DD'),
    lateFinishDate: start.add(task.lf, 'day').format('YYYY-MM-DD')
  }))

  // 提取关键路径任务ID
  const criticalPath = resultTasks
    .filter(t => t.isCritical)
    .map(t => t.id)

  return {
    tasks: resultTasks,
    criticalPath,
    totalDuration,
    startDate: start.format('YYYY-MM-DD'),
    finishDate: start.add(totalDuration, 'day').format('YYYY-MM-DD')
  }
}

/**
 * 拓扑排序 (Kahn 算法)
 * 确保任务按依赖顺序排列，用于 CPM 的正向遍历
 * @param {Map} taskMap - 任务映射表
 * @returns {Array} 排序后的任务ID数组
 */
function topologicalSort(taskMap) {
  const inDegree = new Map()
  const result = []
  const queue = []

  // 初始化入度
  taskMap.forEach((task, id) => {
    const predCount = (task.predecessors && task.predecessors.length) || 0
    inDegree.set(id, predCount)
    if (predCount === 0) {
      queue.push(id)
    }
  })

  while (queue.length > 0) {
    const current = queue.shift()
    result.push(current)

    const task = taskMap.get(current)
    if (task && task.successors) {
      task.successors.forEach(succId => {
        const newDegree = inDegree.get(succId) - 1
        inDegree.set(succId, newDegree)
        if (newDegree === 0) {
          queue.push(succId)
        }
      })
    }
  }

  // 检查是否存在环
  if (result.length !== taskMap.size) {
    throw new Error('任务依赖关系中存在循环，无法生成进度计划')
  }

  return result
}

export default {
  generateSchedule
}
