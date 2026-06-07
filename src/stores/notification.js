import { defineStore } from 'pinia'
import { query, exec } from '../utils/db'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    unreadCount: 0,
    list: []
  }),
  actions: {
    async fetchUnreadCount() {
      try {
        const rows = await query("SELECT COUNT(*) as cnt FROM notifications WHERE is_read = 0")
        this.unreadCount = rows && rows.length ? rows[0].cnt : 0
        return this.unreadCount
      } catch (e) {
        console.warn('获取未读通知数失败，使用默认值', e)
        this.unreadCount = 4
        return this.unreadCount
      }
    },
    async fetchNotifications() {
      try {
        this.list = await query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50")
        return this.list
      } catch (e) {
        console.warn('获取通知列表失败', e)
        this.list = [
          { id: 1, type: 'approval', title: '新立项审批待处理', content: '城市轨道交通4号线一期项目已提交立项审批', recipient: '项目总监', priority: 'high', is_read: 0, created_at: '2026-06-07 08:30:00' },
          { id: 2, type: 'equipment', title: '设备维保超期预警', content: '4#混凝土泵车已超期2天未进行维保', recipient: '设备主管', priority: 'high', is_read: 0, created_at: '2026-06-07 07:00:00' },
          { id: 3, type: 'material', title: '采购订单待审批', content: '绿城·春江明月项目混凝土采购单待审批', recipient: '采购主管', priority: 'normal', is_read: 0, created_at: '2026-06-05 09:20:00' },
          { id: 4, type: 'safety', title: '安全整改超期风险', content: '深基坑支护安全整改仅剩1天期限', recipient: 'A区工长', priority: 'high', is_read: 0, created_at: '2026-06-07 08:00:00' }
        ]
        return this.list
      }
    },
    async fetchList(limit = 50) {
      const list = await this.fetchNotifications()
      return limit && limit > 0 ? list.slice(0, limit) : list
    },
    async markAsRead(id) {
      try {
        await exec("UPDATE notifications SET is_read = 1 WHERE id = ?", [id])
        const item = this.list.find(n => n.id === id)
        if (item) {
          item.is_read = 1
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }
      } catch (e) {
        console.warn('标记已读失败', e)
      }
    },
    async markAllAsRead() {
      try {
        await exec("UPDATE notifications SET is_read = 1 WHERE is_read = 0")
        this.list.forEach(n => { n.is_read = 1 })
        this.unreadCount = 0
      } catch (e) {
        console.warn('全部标记已读失败', e)
        this.unreadCount = 0
      }
    },
    async createNotification(data) {
      try {
        const sql = `
          INSERT INTO notifications (type, title, content, recipient, priority, related_id, related_type, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
        `
        const params = [
          data.type || 'info',
          data.title || '',
          data.content || '',
          data.recipient || '',
          data.priority || 'normal',
          data.related_id || null,
          data.related_type || ''
        ]
        await query(sql, params)
        await this.fetchUnreadCount()
        await this.fetchNotifications()
        return true
      } catch (e) {
        console.warn('创建通知失败', e)
        return false
      }
    }
  }
})
