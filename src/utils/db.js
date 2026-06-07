import dayjs from 'dayjs'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI
const HTTP_BASE = 'http://localhost:3099'

let httpAvailable = null
async function checkHttp() {
  if (httpAvailable !== null) return httpAvailable
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1500)
    const r = await fetch(HTTP_BASE + '/health', { signal: ctrl.signal })
    clearTimeout(t)
    httpAvailable = r.ok
  } catch (e) {
    httpAvailable = false
  }
  return httpAvailable
}

async function httpCall(endpoint, sql, params) {
  try {
    const r = await fetch(HTTP_BASE + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    })
    return await r.json()
  } catch (e) {
    return { ok: 0, error: e.message }
  }
}

let mockDb = null

function initMockDb() {
  if (mockDb) return mockDb
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  mockDb = {
    projects: [
      {
        id: 1,
        name: '滨江CBD商业综合体',
        type: '商业综合体',
        total_investment: 1850000000,
        contract_days: 720,
        start_date: '2026-01-15',
        end_date: '2027-12-31',
        participants: JSON.stringify([
          { name: '中国建筑第三工程局', role: '总承包' },
          { name: '上海现代建筑设计集团', role: '设计' },
          { name: '华建监理有限公司', role: '监理' },
          { name: '中南建筑设计院', role: '勘察' }
        ]),
        status: 'approved',
        created_at: '2026-01-10 09:00:00',
        updated_at: now
      },
      {
        id: 2,
        name: '绿城·春江明月住宅小区',
        type: '住宅',
        total_investment: 680000000,
        contract_days: 540,
        start_date: '2026-03-01',
        end_date: '2027-08-22',
        participants: JSON.stringify([
          { name: '浙江建工集团', role: '总承包' },
          { name: '绿城设计', role: '设计' }
        ]),
        status: 'in_progress',
        created_at: '2026-02-20 10:30:00',
        updated_at: now
      },
      {
        id: 3,
        name: '城市轨道交通4号线一期',
        type: '市政工程',
        total_investment: 5200000000,
        contract_days: 1080,
        start_date: '2026-06-01',
        end_date: '2029-05-16',
        participants: JSON.stringify([
          { name: '中铁建设集团', role: '总承包' }
        ]),
        status: 'draft',
        created_at: '2026-05-28 14:20:00',
        updated_at: now
      }
    ],
    construction_tasks: [],
    approvals: [
      {
        id: 1,
        type: 'project',
        ref_id: 3,
        title: '城市轨道交通4号线一期立项审批',
        applicant: '李工',
        applicant_role: '项目经理',
        approver: null,
        approver_role: '项目总监',
        status: 'pending',
        comment: null,
        created_at: '2026-05-28 14:25:00',
        approved_at: null
      }
    ],
    suppliers: [
      { id: 1, name: '华东建材集团', contact: '张经理', phone: '13800138001', address: '上海市浦东新区张江路100号', rating: 5, material_types: '水泥,钢筋,砂石', created_at: '2026-01-01' },
      { id: 2, name: '中建钢材有限公司', contact: '李总', phone: '13900139002', address: '江苏省南京市建邺区奥体大街', rating: 4, material_types: '钢筋,型钢,钢板', created_at: '2026-01-05' },
      { id: 3, name: '绿源混凝土公司', contact: '王工', phone: '13700137003', address: '浙江省杭州市余杭区良渚镇', rating: 4, material_types: '商品混凝土,砂浆', created_at: '2026-01-08' },
      { id: 4, name: '天成机械租赁', contact: '刘主任', phone: '13600136004', address: '杭州市萧山区', rating: 3, material_types: '设备租赁', created_at: '2026-02-01' }
    ],
    materials: [
      { id: 1, code: 'MAT-001', name: 'P.O 42.5普通硅酸盐水泥', unit: '吨', unit_price: 480, stock: 500, safety_stock: 200, category: '水泥', spec: 'P.O 42.5' },
      { id: 2, code: 'MAT-002', name: 'HRB400E三级螺纹钢', unit: '吨', unit_price: 4200, stock: 300, safety_stock: 150, category: '钢筋', spec: 'Φ25' },
      { id: 3, code: 'MAT-003', name: 'C30商品混凝土', unit: '立方米', unit_price: 420, stock: 0, safety_stock: 100, category: '混凝土', spec: 'C30' },
      { id: 4, code: 'MAT-004', name: '机制砂', unit: '立方米', unit_price: 95, stock: 800, safety_stock: 300, category: '砂石', spec: '中砂' },
      { id: 5, code: 'MAT-005', name: '5-25mm碎石', unit: '立方米', unit_price: 85, stock: 600, safety_stock: 200, category: '砂石', spec: '5-25mm' },
      { id: 6, code: 'MAT-006', name: 'HRB400E三级螺纹钢Φ20', unit: '吨', unit_price: 4150, stock: 120, safety_stock: 100, category: '钢筋', spec: 'Φ20' }
    ],
    purchase_orders: [
      { id: 1, order_no: 'PO-202606011000-001', project_id: 1, supplier_id: 1, total_amount: 240000, status: 'approved', required_date: '2026-06-10', budget_ok: 1, budget_comment: '预算审核通过', created_by: '采购部-王经理', created_at: '2026-06-01 10:00:00' },
      { id: 2, order_no: 'PO-202606031430-002', project_id: 1, supplier_id: 2, total_amount: 840000, status: 'in_transit', required_date: '2026-06-08', budget_ok: 1, budget_comment: '在预算内', created_by: '采购部-王经理', created_at: '2026-06-03 14:30:00' },
      { id: 3, order_no: 'PO-202606050915-003', project_id: 2, supplier_id: 3, total_amount: 126000, status: 'pending_approval', required_date: '2026-06-15', budget_ok: 1, budget_comment: '', created_by: '采购部-李主管', created_at: '2026-06-05 09:15:00' }
    ],
    purchase_order_items: [
      { id: 1, order_id: 1, material_id: 1, quantity: 500, unit_price: 480, amount: 240000, received_qty: 0 },
      { id: 2, order_id: 2, material_id: 2, quantity: 200, unit_price: 4200, amount: 840000, received_qty: 0 },
      { id: 3, order_id: 3, material_id: 3, quantity: 300, unit_price: 420, amount: 126000, received_qty: 0 }
    ],
    material_receipts: [],
    equipment: [
      { id: 1, code: 'EQ-001', name: '1#塔吊', type: '塔吊', model: 'QTZ80', project_id: 1, section: 'A区', status: 'working', last_maintenance: '2026-05-20', next_maintenance: '2026-06-19', maintenance_cycle_days: 30, operator: '陈师傅', created_at: now },
      { id: 2, code: 'EQ-002', name: '2#塔吊', type: '塔吊', model: 'QTZ125', project_id: 1, section: 'B区', status: 'working', last_maintenance: '2026-05-10', next_maintenance: '2026-06-09', maintenance_cycle_days: 30, operator: '刘师傅', created_at: now },
      { id: 3, code: 'EQ-003', name: '3#挖掘机', type: '挖掘机', model: 'CAT336', project_id: 1, section: 'C区', status: 'standby', last_maintenance: '2026-05-28', next_maintenance: '2026-06-27', maintenance_cycle_days: 30, operator: '赵师傅', created_at: now },
      { id: 4, code: 'EQ-004', name: '4#混凝土泵车', type: '泵车', model: 'SY5419', project_id: 1, section: 'A区', status: 'maintenance', last_maintenance: '2026-03-15', next_maintenance: '2026-06-05', maintenance_cycle_days: 90, operator: '孙师傅', created_at: now },
      { id: 5, code: 'EQ-005', name: '5#施工升降机', type: '升降机', model: 'SC200', project_id: 1, section: 'B区', status: 'working', last_maintenance: '2026-06-01', next_maintenance: '2026-07-01', maintenance_cycle_days: 30, operator: '周师傅', created_at: now },
      { id: 6, code: 'EQ-006', name: '6#推土机', type: '挖掘机', model: 'SD22', project_id: 2, section: '东标段', status: 'working', last_maintenance: '2026-05-25', next_maintenance: '2026-06-24', maintenance_cycle_days: 30, operator: '吴师傅', created_at: now },
      { id: 7, code: 'EQ-007', name: '7#塔吊', type: '塔吊', model: 'QTZ80', project_id: 2, section: '西标段', status: 'fault', last_maintenance: '2026-04-10', next_maintenance: '2026-05-10', maintenance_cycle_days: 30, operator: '郑师傅', created_at: now }
    ],
    equipment_logs: [
      { id: 1, equipment_id: 1, status: 'working', start_time: '2026-06-07 08:00:00', end_time: null, location: 'A区作业面', remark: '主楼钢筋吊装' },
      { id: 2, equipment_id: 2, status: 'working', start_time: '2026-06-07 07:30:00', end_time: null, location: 'B区商业裙楼', remark: '模板吊运' },
      { id: 3, equipment_id: 4, status: 'maintenance', start_time: '2026-06-06 09:00:00', end_time: null, location: '维修车间', remark: '液压系统检修' }
    ],
    safety_inspections: [
      { id: 1, project_id: 1, area: 'A区-地下车库', risk_level: 'high', title: '深基坑支护安全检查', inspector: '安全监理-王工', inspect_date: '2026-06-05', result: 'abnormal', rectification_required: 1, responsible_person: 'A区工长-刘强', deadline: '2026-06-08', rectification_status: 'pending', created_at: '2026-06-05 15:30:00' },
      { id: 2, project_id: 1, area: 'B区-商业裙楼', risk_level: 'medium', title: '脚手架搭设质量检查', inspector: '安全监理-王工', inspect_date: '2026-06-06', result: 'normal', rectification_required: 0, responsible_person: null, deadline: null, rectification_status: 'none', created_at: '2026-06-06 10:00:00' },
      { id: 3, project_id: 1, area: '临时用电', risk_level: 'high', title: '施工现场临时用电专项检查', inspector: '安全员-李明', inspect_date: '2026-06-07', result: 'abnormal', rectification_required: 1, responsible_person: '临电工长-张电', deadline: '2026-06-07', rectification_status: 'in_progress', created_at: '2026-06-07 09:00:00' },
      { id: 4, project_id: 2, area: '西标段-基坑', risk_level: 'medium', title: '基坑降水运行检查', inspector: '安全员-赵磊', inspect_date: '2026-06-06', result: 'normal', rectification_required: 0, responsible_person: null, deadline: null, rectification_status: 'none', created_at: '2026-06-06 14:00:00' }
    ],
    notifications: [
      { id: 1, type: 'approval', title: '新立项审批待处理', content: '城市轨道交通4号线一期项目已提交立项审批，请尽快处理', recipient: '项目总监', priority: 'high', is_read: 0, related_id: 1, related_type: 'approval', created_at: '2026-06-07 08:30:00' },
      { id: 2, type: 'equipment', title: '设备维保超期预警', content: '4#混凝土泵车已超期2天未进行维保，请立即安排', recipient: '设备主管', priority: 'high', is_read: 0, related_id: 4, related_type: 'equipment', created_at: '2026-06-07 07:00:00' },
      { id: 3, type: 'material', title: '采购订单待审批', content: '绿城·春江明月项目混凝土采购单(PO-202606050915-003)待主管审批', recipient: '采购主管', priority: 'normal', is_read: 0, related_id: 3, related_type: 'purchase', created_at: '2026-06-05 09:20:00' },
      { id: 4, type: 'safety', title: '安全整改超期风险', content: '深基坑支护安全整改仅剩1天期限，请尽快完成', recipient: 'A区工长-刘强', priority: 'high', is_read: 0, related_id: 1, related_type: 'rectification', created_at: '2026-06-07 08:00:00' },
      { id: 5, type: 'material', title: '库存预警：C30混凝土', content: 'C30商品混凝土当前库存为0，低于安全库存100立方米', recipient: '仓库管理员', priority: 'normal', is_read: 1, related_id: 3, related_type: 'material', created_at: '2026-06-06 16:00:00' }
    ],
    construction_zones: [
      { id: 1, project_id: 1, zone_code: 'A-01', zone_name: 'A区-地下车库', pos_x: 5, pos_y: 5, width: 30, height: 40, progress: 85 },
      { id: 2, project_id: 1, zone_code: 'A-02', zone_name: 'A区-主楼基础', pos_x: 35, pos_y: 5, width: 25, height: 40, progress: 60 },
      { id: 3, project_id: 1, zone_code: 'B-01', zone_name: 'B区-商业裙楼', pos_x: 5, pos_y: 45, width: 35, height: 35, progress: 40 },
      { id: 4, project_id: 1, zone_code: 'B-02', zone_name: 'B区-景观广场', pos_x: 40, pos_y: 45, width: 25, height: 35, progress: 10 },
      { id: 5, project_id: 1, zone_code: 'C-01', zone_name: 'C区-附属设施', pos_x: 10, pos_y: 80, width: 45, height: 15, progress: 5 },
      { id: 6, project_id: 2, zone_code: 'D-01', zone_name: '东标段-1号楼', pos_x: 5, pos_y: 5, width: 25, height: 40, progress: 35 },
      { id: 7, project_id: 2, zone_code: 'D-02', zone_name: '西标段-2号楼', pos_x: 35, pos_y: 5, width: 25, height: 40, progress: 20 },
      { id: 8, project_id: 2, zone_code: 'D-03', zone_name: '中央地库', pos_x: 5, pos_y: 50, width: 55, height: 35, progress: 55 }
    ],
    monthly_stats: [
      { id: 1, project_id: 1, section: 'A区', year: 2026, month: 5, completed_value: 48000000, planned_value: 50000000, actual_cost: 47200000, quality_pass_rate: 97.8, safety_incidents: 0 },
      { id: 2, project_id: 1, section: 'B区', year: 2026, month: 5, completed_value: 32000000, planned_value: 35000000, actual_cost: 31500000, quality_pass_rate: 96.5, safety_incidents: 1 },
      { id: 3, project_id: 1, section: 'C区', year: 2026, month: 5, completed_value: 8000000, planned_value: 10000000, actual_cost: 8300000, quality_pass_rate: 99.0, safety_incidents: 0 },
      { id: 4, project_id: 1, section: 'A区', year: 2026, month: 6, completed_value: 18500000, planned_value: 55000000, actual_cost: 18200000, quality_pass_rate: 98.2, safety_incidents: 0 },
      { id: 5, project_id: 1, section: 'B区', year: 2026, month: 6, completed_value: 12000000, planned_value: 38000000, actual_cost: 11800000, quality_pass_rate: 97.0, safety_incidents: 0 },
      { id: 6, project_id: 2, section: '东标段', year: 2026, month: 5, completed_value: 22000000, planned_value: 25000000, actual_cost: 21500000, quality_pass_rate: 98.5, safety_incidents: 0 },
      { id: 7, project_id: 2, section: '西标段', year: 2026, month: 5, completed_value: 15000000, planned_value: 18000000, actual_cost: 14800000, quality_pass_rate: 97.2, safety_incidents: 1 }
    ],
    construction_tasks: [
      { id: 1, project_id: 1, name: '土方开挖', section: 'A区', duration: 20, start_date: '2026-03-01', end_date: '2026-03-20', predecessors: '[]', resources: '', early_start: 0, early_finish: 20, late_start: 0, late_finish: 20, total_float: 0, free_float: 0, is_critical: 1, progress: 100, status: 'completed' },
      { id: 2, project_id: 1, name: '基础垫层', section: 'A区', duration: 5, start_date: '2026-03-21', end_date: '2026-03-25', predecessors: '[1]', resources: '', early_start: 20, early_finish: 25, late_start: 20, late_finish: 25, total_float: 0, free_float: 0, is_critical: 1, progress: 100, status: 'completed' },
      { id: 3, project_id: 1, name: '地下结构施工', section: 'A区', duration: 60, start_date: '2026-03-26', end_date: '2026-05-24', predecessors: '[2]', resources: '', early_start: 25, early_finish: 85, late_start: 25, late_finish: 85, total_float: 0, free_float: 0, is_critical: 1, progress: 85, status: 'in_progress' },
      { id: 4, project_id: 1, name: '裙楼主体结构', section: 'B区', duration: 90, start_date: '2026-05-25', end_date: '2026-08-22', predecessors: '[3]', resources: '', early_start: 85, early_finish: 175, late_start: 90, late_finish: 180, total_float: 5, free_float: 5, is_critical: 0, progress: 40, status: 'in_progress' },
      { id: 5, project_id: 1, name: '主楼主体结构', section: 'A区', duration: 180, start_date: '2026-05-25', end_date: '2026-11-20', predecessors: '[3]', resources: '', early_start: 85, early_finish: 265, late_start: 85, late_finish: 265, total_float: 0, free_float: 0, is_critical: 1, progress: 20, status: 'in_progress' },
      { id: 6, project_id: 1, name: '景观广场施工', section: 'B区', duration: 45, start_date: '2026-08-23', end_date: '2026-10-06', predecessors: '[4]', resources: '', early_start: 175, early_finish: 220, late_start: 185, late_finish: 230, total_float: 10, free_float: 10, is_critical: 0, progress: 5, status: 'pending' }
    ],
    task_materials: [
      { id: 1, task_id: 3, material_id: 1, quantity: 400 },
      { id: 2, task_id: 3, material_id: 2, quantity: 180 },
      { id: 3, task_id: 3, material_id: 3, quantity: 600 },
      { id: 4, task_id: 3, material_id: 4, quantity: 350 },
      { id: 5, task_id: 3, material_id: 5, quantity: 450 },
      { id: 6, task_id: 4, material_id: 1, quantity: 500 },
      { id: 7, task_id: 4, material_id: 2, quantity: 250 },
      { id: 8, task_id: 4, material_id: 3, quantity: 800 },
      { id: 9, task_id: 4, material_id: 4, quantity: 400 },
      { id: 10, task_id: 4, material_id: 5, quantity: 500 },
      { id: 11, task_id: 5, material_id: 1, quantity: 1200 },
      { id: 12, task_id: 5, material_id: 2, quantity: 800 },
      { id: 13, task_id: 5, material_id: 3, quantity: 2500 },
      { id: 14, task_id: 5, material_id: 4, quantity: 1500 },
      { id: 15, task_id: 5, material_id: 5, quantity: 2000 },
      { id: 16, task_id: 6, material_id: 1, quantity: 150 },
      { id: 17, task_id: 6, material_id: 4, quantity: 800 },
      { id: 18, task_id: 6, material_id: 5, quantity: 600 }
    ],
    rectifications: (function() {
      const d = (off) => { const dt = new Date(); dt.setDate(dt.getDate() + off); return dt.toISOString().slice(0,10) }
      const dt = (off) => { const dt2 = new Date(); dt2.setDate(dt2.getDate() + off); return dt2.toISOString().slice(0,10) + ' 10:00:00' }
      return [
        { id: 1, inspection_id: 1, inspection_code: 'XJ-20260603-001', inspection_title: '基坑临边防护栏杆缺失', risk_level: 'high', requirement: '立即补装所有缺失的临边防护栏杆，并设置红白警示标识', responsible_person: '刘工头', deadline: d(-2), status: 'overdue', submit_measures: '', submit_description: '', submitter: '', submitted_at: '', verify_result: '', verify_opinion: '', supervisor: '', completed_at: '', upgraded: 0, timeline: '[]', created_at: '2026-06-03 10:00:00' },
        { id: 2, inspection_id: 2, inspection_code: 'XJ-20260602-002', inspection_title: '脚手架连墙件设置不足', risk_level: 'high', requirement: '按JGJ130规范要求补设连墙件，两步三跨布置', responsible_person: '陈班长', deadline: d(0), status: 'pending', submit_measures: '', submit_description: '', submitter: '', submitted_at: '', verify_result: '', verify_opinion: '', supervisor: '', completed_at: '', upgraded: 0, timeline: '[]', created_at: '2026-06-02 14:20:00' },
        { id: 3, inspection_id: 3, inspection_code: 'XJ-20260530-003', inspection_title: '2#塔吊力矩限制器失灵', risk_level: 'high', requirement: '立即停机检修，更换力矩限制器传感器并重新标定', responsible_person: '设备组王工', deadline: d(-4), status: 'overdue', submit_measures: '已联系厂家技术人员到场，正在更换传感器组件，预计明日完成', submit_description: '力矩限制器故障已排查，系传感器老化导致', submitter: '设备组王工', submitted_at: dt(-1), verify_result: '', verify_opinion: '', supervisor: '', completed_at: '', upgraded: 0, timeline: '[]', created_at: '2026-05-30 09:15:00' },
        { id: 4, inspection_id: 4, inspection_code: 'XJ-20260601-004', inspection_title: '临时用电私拉乱接', risk_level: 'medium', requirement: '拆除违规接线，按TN-S系统重新规范布线，加装漏电保护器', responsible_person: '电工李师傅', deadline: d(-1), status: 'completed', submit_measures: '已拆除所有私拉乱接线路，按规范重新布设三级配电二级保护，所有开关箱均加装合格漏电保护器', submit_description: '整改完成，已组织现场电工培训', submitter: '电工李师傅', submitted_at: dt(-1), verify_result: 'pass', verify_opinion: '现场核查整改到位，线路规范，漏保测试合格，同意关闭', supervisor: '监理-张工', completed_at: dt(0), upgraded: 0, timeline: '[]', created_at: '2026-06-01 11:30:00' }
      ]
    })()
  }

  Object.keys(mockDb).forEach(k => {
    mockDb['__id_' + k] = mockDb[k].length > 0 ? Math.max(...mockDb[k].map(r => r.id)) + 1 : 1
  })

  return mockDb
}

function findWhere(table, condition) {
  const data = initMockDb()[table] || []
  return data.filter(row => {
    return Object.keys(condition).every(k => {
      const op = condition[k]
      if (op && typeof op === 'object' && op.$like !== undefined) {
        const pattern = op.$like.replace(/%/g, '.*')
        return new RegExp(pattern, 'i').test(String(row[k]))
      }
      if (op && typeof op === 'object' && op.$gt !== undefined) return row[k] > op.$gt
      if (op && typeof op === 'object' && op.$gte !== undefined) return row[k] >= op.$gte
      if (op && typeof op === 'object' && op.$lt !== undefined) return row[k] < op.$lt
      if (op && typeof op === 'object' && op.$lte !== undefined) return row[k] <= op.$lte
      if (op && typeof op === 'object' && op.$in !== undefined) return op.$in.includes(row[k])
      if (op && typeof op === 'object' && op.$ne !== undefined) return row[k] !== op.$ne
      return row[k] === op
    })
  })
}

function parseSQL(sql, params = []) {
  let i = 0
  const normalized = sql.replace(/\?/g, () => {
    const val = params[i++]
    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
    if (val === null || val === undefined) return 'NULL'
    return val
  }).trim()

  const selectMatch = normalized.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/is)
  if (selectMatch) {
    const [, fields, table, where, orderBy, limit] = selectMatch
    return { type: 'SELECT', table, fields, where: where || '', orderBy: orderBy || '', limit: limit ? parseInt(limit) : null }
  }

  const insertMatch = normalized.match(/^INSERT\s+INTO\s+(\w+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)$/is)
  if (insertMatch) {
    const [, table, colsStr, valsStr] = insertMatch
    const cols = colsStr.split(',').map(c => c.trim())
    const vals = parseValues(valsStr)
    return { type: 'INSERT', table, cols, vals }
  }

  const updateMatch = normalized.match(/^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/is)
  if (updateMatch) {
    const [, table, setStr, where] = updateMatch
    return { type: 'UPDATE', table, setStr: setStr || '', where: where || '' }
  }

  const deleteMatch = normalized.match(/^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/is)
  if (deleteMatch) {
    const [, table, where] = deleteMatch
    return { type: 'DELETE', table, where: where || '' }
  }

  return { type: 'UNKNOWN', raw: normalized }
}

function parseValues(str) {
  const result = []
  let current = ''
  let inQuote = false
  let depth = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === "'" && str[i - 1] !== '\\') inQuote = !inQuote
    else if (ch === '(' && !inQuote) depth++
    else if (ch === ')' && !inQuote) depth--
    else if (ch === ',' && !inQuote && depth === 0) {
      result.push(parseValue(current.trim()))
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) result.push(parseValue(current.trim()))
  return result
}

function parseValue(v) {
  if (v === 'NULL') return null
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1)
  const num = Number(v)
  if (!isNaN(num)) return num
  return v
}

function parseWhere(whereStr) {
  if (!whereStr || typeof whereStr !== 'string') return {}
  const condition = {}
  const parts = whereStr.split(/\s+AND\s+/i)
  if (!parts || !Array.isArray(parts) || parts.length === 0) return condition
  parts.forEach(part => {
    if (!part || typeof part !== 'string') return
    const like = part.match(/(\w+)\s+LIKE\s+'(.+?)'/i)
    if (like && like.length >= 3) { condition[like[1]] = { $like: like[2] }; return }
    const gt = part.match(/(\w+)\s*>\s*(\S+)/)
    if (gt && gt.length >= 3) { condition[gt[1]] = { $gt: parseValue(gt[2]) }; return }
    const gte = part.match(/(\w+)\s*>=\s*(\S+)/)
    if (gte && gte.length >= 3) { condition[gte[1]] = { $gte: parseValue(gte[2]) }; return }
    const lt = part.match(/(\w+)\s*<\s*(\S+)/)
    if (lt && lt.length >= 3) { condition[lt[1]] = { $lt: parseValue(lt[2]) }; return }
    const lte = part.match(/(\w+)\s*<=\s*(\S+)/)
    if (lte && lte.length >= 3) { condition[lte[1]] = { $lte: parseValue(lte[2]) }; return }
    const ne = part.match(/(\w+)\s*!=\s*(\S+)/)
    if (ne && ne.length >= 3) { condition[ne[1]] = { $ne: parseValue(ne[2]) }; return }
    const eq = part.match(/(\w+)\s*=\s*(\S+)/)
    if (eq && eq.length >= 3) condition[eq[1]] = parseValue(eq[2])
  })
  return condition
}

function extractTableNames(sql) {
  if (!sql || typeof sql !== 'string') return []
  const tables = []
  const fromRegex = /\bFROM\s+([`"\[]?[\w]+[`"\]]?)/gi
  const joinRegex = /\bJOIN\s+([`"\[]?[\w]+[`"\]]?)/gi
  let m
  while ((m = fromRegex.exec(sql)) !== null) {
    const t = m[1].replace(/[`"\[\]]/g, '')
    if (!tables.includes(t)) tables.push(t)
  }
  while ((m = joinRegex.exec(sql)) !== null) {
    const t = m[1].replace(/[`"\[\]]/g, '')
    if (!tables.includes(t)) tables.push(t)
  }
  return tables
}

function findFirstExistingTable(tables) {
  if (!tables || !Array.isArray(tables) || !mockDb) return null
  const aliasMap = {
    equipments: 'equipment',
    purchase_orders_items: 'purchase_order_items',
    construction_task: 'construction_tasks',
    notification: 'notifications',
    material: 'materials',
    supplier: 'suppliers',
    project: 'projects',
    safety_inspection: 'safety_inspections',
    equipment_log: 'equipment_logs',
    construction_zone: 'construction_zones',
    monthly_stat: 'monthly_stats',
    rectification: 'rectifications',
    task_material: 'task_materials'
  }
  for (const t of tables) {
    if (mockDb[t] && Array.isArray(mockDb[t])) return t
    const alias = aliasMap[t]
    if (alias && mockDb[alias] && Array.isArray(mockDb[alias])) return alias
  }
  return null
}

function isComplexSelect(sql, parsed) {
  if (!sql || typeof sql !== 'string') return false
  if (parsed && parsed.type === 'UNKNOWN') return true
  const upper = sql.toUpperCase()
  if (/\bJOIN\b/.test(upper)) return true
  if (/\bGROUP\s+BY\b/.test(upper)) return true
  if (/\bSUM\s*\(/.test(upper)) return true
  if (/\bAVG\s*\(/.test(upper)) return true
  if (/\bCOUNT\s*\(/.test(upper)) return true
  if (/\bDISTINCT\b/.test(upper)) return true
  const selectCount = (upper.match(/\bSELECT\b/g) || []).length
  if (selectCount > 1) return true
  return false
}

function generateAggregateMock(sql, tableName) {
  const upper = sql.toUpperCase()
  const row = {}
  if (/\bCOUNT\s*\(/.test(upper)) {
    row['COUNT(*)'] = (mockDb[tableName] || []).length
    row['count'] = (mockDb[tableName] || []).length
  }
  if (/\bSUM\s*\(/.test(upper)) {
    const data = mockDb[tableName] || []
    let total = 0
    data.forEach(r => {
      Object.values(r).forEach(v => {
        if (typeof v === 'number') total += v
      })
    })
    row['SUM'] = total
    row['sum'] = total
    row['total'] = total
  }
  if (/\bAVG\s*\(/.test(upper)) {
    const data = mockDb[tableName] || []
    let total = 0
    let cnt = 0
    data.forEach(r => {
      Object.values(r).forEach(v => {
        if (typeof v === 'number') { total += v; cnt++ }
      })
    })
    row['AVG'] = cnt > 0 ? total / cnt : 0
    row['avg'] = cnt > 0 ? total / cnt : 0
    row['average'] = cnt > 0 ? total / cnt : 0
  }
  if (Object.keys(row).length === 0) {
    row['result'] = 1
  }
  return [row]
}

function fillJoinFields(sql, tableName, data) {
  if (!data || !Array.isArray(data) || data.length === 0) return data
  const tables = extractTableNames(sql)
  if (tables.length < 2) return data
  const result = data.map(row => ({ ...row }))
  const relations = {
    purchase_orders: {
      suppliers: { key: 'supplier_id', fields: ['name', 'contact', 'phone', 'address'], prefix: 'supplier_' },
      projects: { key: 'project_id', fields: ['name', 'type', 'total_investment'], prefix: 'project_' }
    },
    purchase_order_items: {
      materials: { key: 'material_id', fields: ['name', 'code', 'unit', 'unit_price', 'category'], prefix: 'material_' },
      purchase_orders: { key: 'order_id', fields: ['order_no', 'status', 'total_amount'], prefix: 'order_' }
    },
    equipment: {
      projects: { key: 'project_id', fields: ['name', 'type'], prefix: 'project_' }
    },
    equipment_logs: {
      equipment: { key: 'equipment_id', fields: ['name', 'code', 'type'], prefix: 'equipment_' }
    },
    notifications: {
      approvals: { key: 'related_id', fields: ['title', 'status'], prefix: 'related_', condition: { related_type: 'approval' } }
    },
    material_receipts: {
      purchase_orders: { key: 'order_id', fields: ['order_no', 'status'], prefix: 'order_' },
      materials: { key: 'material_id', fields: ['name', 'code'], prefix: 'material_' }
    },
    safety_inspections: {
      projects: { key: 'project_id', fields: ['name'], prefix: 'project_' }
    },
    construction_zones: {
      projects: { key: 'project_id', fields: ['name'], prefix: 'project_' }
    },
    monthly_stats: {
      projects: { key: 'project_id', fields: ['name'], prefix: 'project_' }
    },
    approvals: {
      projects: { key: 'ref_id', fields: ['name', 'type'], prefix: 'ref_', condition: { type: 'project' } }
    }
  }
  const rel = relations[tableName]
  if (!rel) return result
  tables.forEach(joinTable => {
    if (joinTable === tableName) return
    const config = rel[joinTable]
    if (!config) return
    const joinData = mockDb[joinTable] || []
    const joinMap = {}
    joinData.forEach(r => { joinMap[r.id] = r })
    result.forEach(row => {
      if (config.condition) {
        let ok = true
        Object.keys(config.condition).forEach(k => {
          if (row[k] !== config.condition[k]) ok = false
        })
        if (!ok) return
      }
      const fk = row[config.key]
      const jr = joinMap[fk]
      if (jr) {
        config.fields.forEach(f => {
          row[config.prefix + f] = jr[f]
        })
      }
    })
  })
  return result
}

function smartFallback(sql) {
  const tables = extractTableNames(sql)
  const tableName = findFirstExistingTable(tables)
  if (!tableName) return { success: true, data: [] }
  const upper = sql.toUpperCase()
  const isAggregate = /\bSUM\s*\(|\bAVG\s*\(|\bCOUNT\s*\(|\bGROUP\s+BY\b/.test(upper)
  if (isAggregate) {
    return { success: true, data: generateAggregateMock(sql, tableName) }
  }
  let data = JSON.parse(JSON.stringify(mockDb[tableName] || []))
  if (/\bJOIN\b/.test(upper)) {
    data = fillJoinFields(sql, tableName, data)
  }
  return { success: true, data }
}

function mockQuery(sql, params = []) {
  try {
    initMockDb()
    const parsed = parseSQL(sql, params)

    if (isComplexSelect(sql, parsed)) {
      return smartFallback(sql)
    }

    if (parsed.type === 'SELECT') {
      let data = [...(mockDb[parsed.table] || [])]
      const condition = parseWhere(parsed.where)
      if (condition && Object.keys(condition).length > 0) {
        data = data.filter(row => Object.keys(condition).every(k => {
          const op = condition[k]
          if (op && typeof op === 'object' && op.$like !== undefined) {
            const pattern = op.$like.replace(/%/g, '.*')
            return new RegExp(pattern, 'i').test(String(row[k] || ''))
          }
          if (op && typeof op === 'object' && op.$gt !== undefined) return row[k] > op.$gt
          if (op && typeof op === 'object' && op.$gte !== undefined) return row[k] >= op.$gte
          if (op && typeof op === 'object' && op.$lt !== undefined) return row[k] < op.$lt
          if (op && typeof op === 'object' && op.$lte !== undefined) return row[k] <= op.$lte
          if (op && typeof op === 'object' && op.$in !== undefined) return op.$in.includes(row[k])
          if (op && typeof op === 'object' && op.$ne !== undefined) return row[k] !== op.$ne
          return row[k] === op
        }))
      }
      if (parsed.orderBy) {
        const parts = parsed.orderBy.split(',')
        parts.reverse().forEach(ob => {
          const [field, dir] = ob.trim().split(/\s+/)
          const asc = (dir || 'ASC').toUpperCase() === 'ASC'
          data.sort((a, b) => {
            if (a[field] < b[field]) return asc ? -1 : 1
            if (a[field] > b[field]) return asc ? 1 : -1
            return 0
          })
        })
      }
      if (parsed.limit !== null) data = data.slice(0, parsed.limit)
      return { success: true, data }
    }

    if (parsed.type === 'INSERT') {
      const table = parsed.table
      if (!mockDb[table]) mockDb[table] = []
      const row = {}
      if (parsed.cols && Array.isArray(parsed.cols)) {
        parsed.cols.forEach((col, idx) => {
          row[col] = parsed.vals && parsed.vals[idx] !== undefined ? parsed.vals[idx] : null
        })
      }
      const idKey = '__id_' + table
      if (!mockDb[idKey]) mockDb[idKey] = 1
      row.id = mockDb[idKey]++
      if (!row.created_at) row.created_at = dayjs().format('YYYY-MM-DD HH:mm:ss')
      mockDb[table].push(row)
      return { success: true, data: { lastInsertRowid: row.id, changes: 1 } }
    }

    if (parsed.type === 'UPDATE') {
      const tableData = mockDb[parsed.table] || []
      const condition = parseWhere(parsed.where)
      const setPairs = (parsed.setStr || '').split(',').map(s => {
        const [k, v] = s.trim().split('=')
        return [k && k.trim(), parseValue(v && v.trim())]
      })
      let count = 0
      tableData.forEach(row => {
        const match = !condition || Object.keys(condition).length === 0 || Object.keys(condition).every(k => row[k] === condition[k])
        if (match) {
          setPairs.forEach(([k, v]) => { if (k) row[k] = v })
          row.updated_at = dayjs().format('YYYY-MM-DD HH:mm:ss')
          count++
        }
      })
      return { success: true, data: { lastInsertRowid: 0, changes: count } }
    }

    if (parsed.type === 'DELETE') {
      const tableData = mockDb[parsed.table] || []
      const condition = parseWhere(parsed.where)
      const before = tableData.length
      mockDb[parsed.table] = tableData.filter(row => {
        return !condition || !Object.keys(condition).every(k => row[k] === condition[k])
      })
      return { success: true, data: { lastInsertRowid: 0, changes: before - (mockDb[parsed.table] || []).length } }
    }

    return smartFallback(sql)
  } catch (e) {
    console.warn('[mockQuery] catch error, fallback:', e && e.message)
    try {
      initMockDb()
      return smartFallback(sql)
    } catch (e2) {
      return { success: true, data: [] }
    }
  }
}

async function query(sql, params = []) {
  try {
    if (isElectron) {
      try {
        const res = await window.electronAPI.query(sql, params)
        if (!res.success) {
          console.error('SQL Error:', res.error, sql, params)
          throw new Error(res.error)
        }
        return res.data
      } catch (electronErr) {
        console.warn('[query] electron query failed, fallback:', electronErr && electronErr.message)
      }
    }
    const httpOk = await checkHttp()
    if (httpOk) {
      const res = await httpCall('/db/query', sql, params)
      if (res && res.ok) return res.data
      console.warn('[query] http failed, fallback to mock:', res && res.error)
    }
    const res = mockQuery(sql, params)
    return res && res.data ? res.data : []
  } catch (e) {
    console.warn('[query] catch error, safe fallback:', e && e.message, 'sql:', sql)
    try {
      initMockDb()
      return smartFallback(sql).data
    } catch (e2) {
      return []
    }
  }
}

async function exec(sql, params = []) {
  try {
    if (isElectron) {
      const res = await window.electronAPI.exec(sql, params)
      if (res && res.success) return true
      console.warn('[exec] electron failed, fallback:', res && res.error)
    }
    const httpOk = await checkHttp()
    if (httpOk) {
      const res = await httpCall('/db/exec', sql, params)
      if (res && res.ok) return true
      console.warn('[exec] http failed, fallback to mock:', res && res.error)
    }
    mockQuery(sql, params)
    return true
  } catch (e) {
    console.warn('[exec] catch error, fallback:', e && e.message)
    mockQuery(sql, params)
    return true
  }
}

async function transaction(statements) {
  try {
    if (isElectron) {
      const res = await window.electronAPI.transaction(statements)
      if (res && res.success) return true
      console.warn('[transaction] electron failed, fallback:', res && res.error)
    }
    const httpOk = await checkHttp()
    if (httpOk) {
      const res = await httpCall('/db/transaction', '', statements)
      if (res && res.ok) return true
      console.warn('[transaction] http failed, fallback to mock:', res && res.error)
    }
    for (const { sql, params } of statements) {
      mockQuery(sql, params || [])
    }
    return true
  } catch (e) {
    console.warn('[transaction] catch error, fallback:', e && e.message)
    for (const { sql, params } of (statements || [])) {
      mockQuery(sql, params || [])
    }
    return true
  }
}

async function showSaveDialog(options) {
  if (isElectron) return await window.electronAPI.showSaveDialog(options)
  return { canceled: false, filePath: options && options.defaultPath ? options.defaultPath : '/tmp/export.xlsx' }
}

async function writeFile(filePath, data, options) {
  if (isElectron) {
    const res = await window.electronAPI.writeFile(filePath, data, options)
    if (!res.success) throw new Error(res.error)
    return true
  }
  console.log('[Mock] writeFile to:', filePath, 'size:', data?.length || data?.byteLength || 'N/A')
  alert('浏览器模式：文件已准备好下载（桌面版中会保存到本地）\n路径: ' + filePath)
  return true
}

export { query, exec, transaction, showSaveDialog, writeFile, isElectron }
export default { query, exec, transaction, showSaveDialog, writeFile, isElectron }
