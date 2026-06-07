import dayjs from 'dayjs'

export function formatDate(date, fmt = 'YYYY-MM-DD') {
  if (!date) return ''
  return dayjs(date).format(fmt)
}

export function formatDateTime(date) {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

export function formatMoney(num) {
  if (num === null || num === undefined) return '¥0.00'
  return '¥' + Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPercent(num) {
  if (num === null || num === undefined) return '0%'
  return (Number(num) * 100).toFixed(1) + '%'
}

export function addDays(date, days) {
  return dayjs(date).add(days, 'day').format('YYYY-MM-DD')
}

export function diffDays(date1, date2) {
  return dayjs(date1).diff(dayjs(date2), 'day')
}

export function today() {
  return dayjs().format('YYYY-MM-DD')
}

export function now() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss')
}

export function generateOrderNo(prefix = 'PO') {
  const t = dayjs().format('YYYYMMDDHHmmss')
  const r = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${t}-${r}`
}

export function generateBatchNo() {
  const t = dayjs().format('YYYYMMDDHHmm')
  const r = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  return `B${t}${r}`
}
