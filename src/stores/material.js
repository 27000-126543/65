import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { query, transaction } from '../utils/db.js'

/**
 * 材料管理状态 Store
 * 负责材料、供应商、采购订单的管理
 * 使用事务确保订单和条目的数据一致性
 */
export const useMaterialStore = defineStore('material', () => {
  // 材料列表
  const materials = ref([])
  // 供应商列表
  const suppliers = ref([])
  // 采购订单列表
  const purchaseOrders = ref([])
  // 加载状态
  const loading = ref(false)

  // 库存不足的材料（库存低于安全库存）
  const lowStockMaterials = computed(() => {
    return materials.value.filter(m => {
      const stock = m.current_stock || 0
      const safety = m.safety_stock || 0
      return stock < safety
    })
  })

  // 待处理的采购订单数量
  const pendingOrderCount = computed(() => {
    return purchaseOrders.value.filter(o => o.status === 'pending').length
  })

  /**
   * 获取所有材料列表
   */
  async function fetchMaterials() {
    loading.value = true
    try {
      const sql = `
        SELECT m.*, 
               (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.material_id = m.id) as order_count
        FROM materials m
        ORDER BY m.name
      `
      materials.value = await query(sql)
      return materials.value
    } catch (error) {
      console.error('获取材料列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 根据ID获取材料详情
   * @param {Number} id - 材料ID
   */
  async function fetchMaterial(id) {
    loading.value = true
    try {
      const sql = 'SELECT * FROM materials WHERE id = ?'
      const result = await query(sql, [id])
      return result[0] || null
    } catch (error) {
      console.error('获取材料详情失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新材料
   * @param {Object} data - 材料数据
   * { name, code, specification, unit, category, current_stock, safety_stock, unit_price, description }
   */
  async function createMaterial(data) {
    loading.value = true
    try {
      const sql = `
        INSERT INTO materials 
          (name, code, specification, unit, category, current_stock, safety_stock, 
           unit_price, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
      const params = [
        data.name,
        data.code || '',
        data.specification || '',
        data.unit || '',
        data.category || '',
        data.current_stock || 0,
        data.safety_stock || 0,
        data.unit_price || 0,
        data.description || ''
      ]
      const result = await query(sql, params)
      const materialId = result.insertId || result.lastID

      // 重新获取材料列表
      await fetchMaterials()

      // 返回新创建的材料
      const newMaterials = await query('SELECT * FROM materials WHERE id = ?', [materialId])
      return newMaterials[0]
    } catch (error) {
      console.error('创建材料失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新材料信息
   * @param {Number} id - 材料ID
   * @param {Object} data - 要更新的材料数据
   */
  async function updateMaterial(id, data) {
    loading.value = true
    try {
      const current = await fetchMaterial(id)
      if (!current) {
        throw new Error('材料不存在')
      }
      const merged = { ...current, ...data }

      const sql = `
        UPDATE materials 
        SET name = ?, code = ?, specification = ?, unit = ?, category = ?,
            current_stock = ?, safety_stock = ?, unit_price = ?, description = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `
      const params = [
        merged.name,
        merged.code || '',
        merged.specification || '',
        merged.unit || '',
        merged.category || '',
        merged.current_stock || 0,
        merged.safety_stock || 0,
        merged.unit_price || 0,
        merged.description || '',
        id
      ]
      await query(sql, params)

      // 重新获取材料列表
      await fetchMaterials()

      // 返回更新后的材料
      const updated = await query('SELECT * FROM materials WHERE id = ?', [id])
      return updated[0]
    } catch (error) {
      console.error('更新材料失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取所有供应商列表
   */
  async function fetchSuppliers() {
    loading.value = true
    try {
      const sql = `
        SELECT s.*,
               (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) as order_count
        FROM suppliers s
        ORDER BY s.name
      `
      suppliers.value = await query(sql)
      return suppliers.value
    } catch (error) {
      console.error('获取供应商列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新供应商
   * @param {Object} data - 供应商数据
   * { name, contact_person, phone, email, address, remark }
   */
  async function createSupplier(data) {
    loading.value = true
    try {
      const sql = `
        INSERT INTO suppliers 
          (name, contact_person, phone, email, address, remark, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
      const params = [
        data.name,
        data.contact_person || '',
        data.phone || '',
        data.email || '',
        data.address || '',
        data.remark || ''
      ]
      const result = await query(sql, params)
      const supplierId = result.insertId || result.lastID

      // 重新获取供应商列表
      await fetchSuppliers()

      // 返回新创建的供应商
      const newSuppliers = await query('SELECT * FROM suppliers WHERE id = ?', [supplierId])
      return newSuppliers[0]
    } catch (error) {
      console.error('创建供应商失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取所有采购订单（包含订单条目）
   */
  async function fetchPurchaseOrders() {
    loading.value = true
    try {
      // 先获取订单列表
      const sql = `
        SELECT po.*, s.name as supplier_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON s.id = po.supplier_id
        ORDER BY po.created_at DESC
      `
      const orders = await query(sql)

      // 为每个订单获取条目
      for (const order of orders) {
        const itemsSql = `
          SELECT poi.*, m.name as material_name, m.code as material_code, 
                 m.specification as material_specification, m.unit as material_unit
          FROM purchase_order_items poi
          LEFT JOIN materials m ON m.id = poi.material_id
          WHERE poi.purchase_order_id = ?
        `
        order.items = await query(itemsSql, [order.id])

        // 计算订单总金额
        order.total_amount = order.items.reduce((sum, item) => {
          return sum + (item.quantity * item.unit_price)
        }, 0)
      }

      purchaseOrders.value = orders
      return purchaseOrders.value
    } catch (error) {
      console.error('获取采购订单列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 根据ID获取采购订单详情（包含条目）
   * @param {Number} id - 订单ID
   */
  async function fetchPurchaseOrder(id) {
    loading.value = true
    try {
      const orderSql = `
        SELECT po.*, s.name as supplier_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.id = ?
      `
      const orderResult = await query(orderSql, [id])
      if (!orderResult || orderResult.length === 0) {
        return null
      }

      const order = orderResult[0]

      const itemsSql = `
        SELECT poi.*, m.name as material_name, m.code as material_code, 
               m.specification as material_specification, m.unit as material_unit
        FROM purchase_order_items poi
        LEFT JOIN materials m ON m.id = poi.material_id
        WHERE poi.purchase_order_id = ?
      `
      order.items = await query(itemsSql, [id])

      order.total_amount = order.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price)
      }, 0)

      return order
    } catch (error) {
      console.error('获取采购订单详情失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建采购订单（使用事务确保订单和条目数据一致）
   * @param {Object} data - 订单数据
   * { supplier_id, project_id, order_no, expected_date, status, remark }
   * @param {Array} items - 订单条目数组
   * [{ material_id, quantity, unit_price, remark }]
   */
  async function createPurchaseOrder(data, items) {
    loading.value = true
    try {
      if (!items || items.length === 0) {
        throw new Error('采购订单必须包含至少一个条目')
      }

      // 构建事务语句
      const statements = []

      // 1. 插入采购订单主表
      statements.push({
        sql: `
          INSERT INTO purchase_orders 
            (supplier_id, project_id, order_no, order_date, expected_date, 
             status, remark, created_at, updated_at)
          VALUES (?, ?, ?, date('now'), ?, ?, ?, datetime('now'), datetime('now'))
        `,
        params: [
          data.supplier_id || null,
          data.project_id || null,
          data.order_no || '',
          data.expected_date || null,
          data.status || 'pending',
          data.remark || ''
        ]
      })

      // 2. 获取新创建的订单ID（SQLite last_insert_rowid()）
      // 在事务中，我们需要单独获取ID，但由于transaction是批量执行，
      // 我们改用另一种方式：先插入订单，获取ID后再插入条目
      // 所以这里我们分步执行，使用手动事务管理

      // 先插入订单
      const insertOrderSql = `
        INSERT INTO purchase_orders 
          (supplier_id, project_id, order_no, order_date, expected_date, 
           status, remark, created_at, updated_at)
        VALUES (?, ?, ?, date('now'), ?, ?, ?, datetime('now'), datetime('now'))
      `
      const orderParams = [
        data.supplier_id || null,
        data.project_id || null,
        data.order_no || '',
        data.expected_date || null,
        data.status || 'pending',
        data.remark || ''
      ]
      const orderResult = await query(insertOrderSql, orderParams)
      const orderId = orderResult.insertId || orderResult.lastID

      if (!orderId) {
        throw new Error('创建采购订单失败')
      }

      // 构建完整事务（包含订单条目）
      const transactionStatements = []

      // 添加所有订单条目
      items.forEach((item, index) => {
        transactionStatements.push({
          sql: `
            INSERT INTO purchase_order_items 
              (purchase_order_id, material_id, quantity, unit_price, remark, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          params: [
            orderId,
            item.material_id,
            item.quantity || 0,
            item.unit_price || 0,
            item.remark || '',
            index
          ]
        })
      })

      // 执行事务插入条目
      if (transactionStatements.length > 0) {
        await transaction(transactionStatements)
      }

      // 重新获取订单列表
      await fetchPurchaseOrders()

      // 返回新创建的完整订单
      return await fetchPurchaseOrder(orderId)
    } catch (error) {
      console.error('创建采购订单失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新采购订单状态
   * @param {Number} id - 订单ID
   * @param {String} status - 新状态 (pending, approved, shipped, received, cancelled)
   */
  async function updatePurchaseOrderStatus(id, status) {
    loading.value = true
    try {
      const sql = `
        UPDATE purchase_orders 
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      await query(sql, [status, id])

      // 如果是已收货状态，需要增加材料库存
      if (status === 'received') {
        // 获取订单条目
        const itemsSql = `
          SELECT material_id, quantity FROM purchase_order_items WHERE purchase_order_id = ?
        `
        const items = await query(itemsSql, [id])

        // 使用事务批量更新库存
        const updateStatements = items.map(item => ({
          sql: 'UPDATE materials SET current_stock = current_stock + ?, updated_at = datetime(\'now\') WHERE id = ?',
          params: [item.quantity, item.material_id]
        }))

        if (updateStatements.length > 0) {
          await transaction(updateStatements)
        }

        // 刷新材料列表
        await fetchMaterials()
      }

      // 重新获取订单列表
      await fetchPurchaseOrders()

      return true
    } catch (error) {
      console.error('更新采购订单状态失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 清空材料相关数据
   */
  function clearMaterials() {
    materials.value = []
    suppliers.value = []
    purchaseOrders.value = []
  }

  return {
    // 状态
    materials,
    suppliers,
    purchaseOrders,
    loading,
    // 计算属性
    lowStockMaterials,
    pendingOrderCount,
    // 方法
    fetchMaterials,
    fetchMaterial,
    createMaterial,
    updateMaterial,
    fetchSuppliers,
    createSupplier,
    fetchPurchaseOrders,
    fetchPurchaseOrder,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    clearMaterials
  }
})
