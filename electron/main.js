const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

let mainWindow
let db

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    title: '建筑工程综合管理与智能调度系统',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'construction.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initTables()
  initSeedData()
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      total_investment REAL NOT NULL,
      contract_days INTEGER NOT NULL,
      start_date TEXT,
      end_date TEXT,
      participants TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS construction_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      section TEXT,
      duration INTEGER NOT NULL,
      start_date TEXT,
      end_date TEXT,
      predecessors TEXT,
      resources TEXT,
      early_start INTEGER,
      early_finish INTEGER,
      late_start INTEGER,
      late_finish INTEGER,
      total_float INTEGER,
      free_float INTEGER,
      is_critical INTEGER DEFAULT 0,
      progress REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      ref_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      applicant TEXT,
      applicant_role TEXT,
      approver TEXT,
      approver_role TEXT,
      status TEXT DEFAULT 'pending',
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT,
      phone TEXT,
      address TEXT,
      rating INTEGER DEFAULT 3,
      material_types TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      unit TEXT,
      unit_price REAL,
      stock REAL DEFAULT 0,
      safety_stock REAL DEFAULT 0,
      category TEXT,
      spec TEXT
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      project_id INTEGER,
      supplier_id INTEGER,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      required_date TEXT,
      budget_ok INTEGER DEFAULT 0,
      budget_comment TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      amount REAL NOT NULL,
      received_qty REAL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS material_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      material_id INTEGER,
      batch_no TEXT NOT NULL,
      quantity REAL NOT NULL,
      inspector TEXT,
      quality_status TEXT DEFAULT 'pending',
      quality_comment TEXT,
      received_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT,
      model TEXT,
      project_id INTEGER,
      section TEXT,
      status TEXT DEFAULT 'standby',
      last_maintenance TEXT,
      next_maintenance TEXT,
      maintenance_cycle_days INTEGER DEFAULT 30,
      operator TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS equipment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      remark TEXT,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS safety_inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      area TEXT NOT NULL,
      risk_level TEXT DEFAULT 'medium',
      title TEXT NOT NULL,
      inspector TEXT,
      inspect_date TEXT,
      result TEXT DEFAULT 'normal',
      rectification_required INTEGER DEFAULT 0,
      responsible_person TEXT,
      deadline TEXT,
      rectification_status TEXT DEFAULT 'none',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      recipient TEXT,
      priority TEXT DEFAULT 'normal',
      is_read INTEGER DEFAULT 0,
      related_id INTEGER,
      related_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS construction_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      zone_code TEXT NOT NULL,
      zone_name TEXT NOT NULL,
      pos_x REAL,
      pos_y REAL,
      width REAL,
      height REAL,
      progress REAL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monthly_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      section TEXT,
      year INTEGER,
      month INTEGER,
      completed_value REAL DEFAULT 0,
      planned_value REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      quality_pass_rate REAL DEFAULT 100,
      safety_incidents INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS rectifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id INTEGER,
      inspection_code TEXT,
      inspection_title TEXT,
      risk_level TEXT,
      requirement TEXT,
      responsible_person TEXT,
      deadline TEXT,
      status TEXT DEFAULT 'pending',
      submit_measures TEXT,
      submit_description TEXT,
      submitter TEXT,
      submitted_at TEXT,
      verify_result TEXT,
      verify_opinion TEXT,
      supervisor TEXT,
      completed_at TEXT,
      upgraded INTEGER DEFAULT 0,
      timeline TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inspection_id) REFERENCES safety_inspections(id)
    );

    CREATE TABLE IF NOT EXISTS task_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      FOREIGN KEY (task_id) REFERENCES construction_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );
  `)
}

function initSeedData() {
  const supCount = db.prepare('SELECT COUNT(*) as cnt FROM suppliers').get().cnt
  if (supCount === 0) {
    const stmt = db.prepare(`INSERT INTO suppliers (name, contact, phone, address, rating, material_types) VALUES (?, ?, ?, ?, ?, ?)`)
    stmt.run('华东建材集团', '张经理', '13800138001', '上海市浦东新区张江路100号', 5, '水泥,钢筋,砂石')
    stmt.run('中建钢材有限公司', '李总', '13900139002', '江苏省南京市建邺区奥体大街', 4, '钢筋,型钢,钢板')
    stmt.run('绿源混凝土公司', '王工', '13700137003', '浙江省杭州市余杭区良渚镇', 4, '商品混凝土,砂浆')
  }

  const matCount = db.prepare('SELECT COUNT(*) as cnt FROM materials').get().cnt
  if (matCount === 0) {
    const stmt = db.prepare(`INSERT INTO materials (code, name, unit, unit_price, stock, safety_stock, category, spec) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    stmt.run('MAT-001', 'P.O 42.5普通硅酸盐水泥', '吨', 480, 500, 200, '水泥', 'P.O 42.5')
    stmt.run('MAT-002', 'HRB400E三级螺纹钢', '吨', 4200, 300, 150, '钢筋', 'Φ25')
    stmt.run('MAT-003', 'C30商品混凝土', '立方米', 420, 0, 100, '混凝土', 'C30')
    stmt.run('MAT-004', '机制砂', '立方米', 95, 800, 300, '砂石', '中砂')
    stmt.run('MAT-005', '5-25mm碎石', '立方米', 85, 600, 200, '砂石', '5-25mm')
  }

  const projCount = db.prepare('SELECT COUNT(*) as cnt FROM projects').get().cnt
  if (projCount === 0) {
    const proj = db.prepare(`INSERT INTO projects (name, type, total_investment, contract_days, start_date, end_date, participants, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      '滨江CBD商业综合体',
      '商业综合体',
      1850000000,
      720,
      '2026-01-15',
      '2027-12-31',
      JSON.stringify([
        { name: '中国建筑第三工程局', role: '总承包' },
        { name: '上海现代建筑设计集团', role: '设计' },
        { name: '华建监理有限公司', role: '监理' },
        { name: '中南建筑设计院', role: '勘察' }
      ]),
      'approved'
    )
    const projId = proj.lastInsertRowid

    const zones = db.prepare(`INSERT INTO construction_zones (project_id, zone_code, zone_name, pos_x, pos_y, width, height, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    zones.run(projId, 'A-01', 'A区-地下车库', 5, 5, 30, 40, 85)
    zones.run(projId, 'A-02', 'A区-主楼基础', 35, 5, 25, 40, 60)
    zones.run(projId, 'B-01', 'B区-商业裙楼', 5, 45, 35, 35, 40)
    zones.run(projId, 'B-02', 'B区-景观广场', 40, 45, 25, 35, 10)
    zones.run(projId, 'C-01', 'C区-附属设施', 10, 80, 45, 15, 5)

    const equips = db.prepare(`INSERT INTO equipment (code, name, type, model, project_id, section, status, last_maintenance, next_maintenance, maintenance_cycle_days, operator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    equips.run('EQ-001', '1#塔吊', '塔吊', 'QTZ80', projId, 'A区', 'working', '2026-05-20', '2026-06-19', 30, '陈师傅')
    equips.run('EQ-002', '2#塔吊', '塔吊', 'QTZ125', projId, 'B区', 'working', '2026-05-10', '2026-06-09', 30, '刘师傅')
    equips.run('EQ-003', '3#挖掘机', '挖掘机', 'CAT336', projId, 'C区', 'standby', '2026-05-28', '2026-06-27', 30, '赵师傅')
    equips.run('EQ-004', '4#混凝土泵车', '泵车', 'SY5419', projId, 'A区', 'maintenance', '2026-03-15', '2026-06-05', 90, '孙师傅')
    equips.run('EQ-005', '5#施工升降机', '升降机', 'SC200', projId, 'B区', 'working', '2026-06-01', '2026-07-01', 30, '周师傅')
    equips.run('EQ-006', '6#塔吊', '塔吊', 'QTZ63', projId, 'C区', 'fault', '2026-02-10', '2026-05-12', 90, '吴师傅')
    equips.run('EQ-007', '7#挖掘机', '挖掘机', 'PC220', projId, 'A区', 'standby', '2026-05-25', '2026-06-24', 30, '郑师傅')

    const tasks = db.prepare(`INSERT INTO construction_tasks (project_id, name, section, duration, start_date, end_date, predecessors, resources, early_start, early_finish, late_start, late_finish, total_float, free_float, is_critical, progress, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const t1 = tasks.run(projId, '土方开挖', 'A区', 20, '2026-03-01', '2026-03-20', '', '', 0, 20, 0, 20, 0, 0, 1, 100, 'completed').lastInsertRowid
    const t2 = tasks.run(projId, '基础垫层', 'A区', 5, '2026-03-21', '2026-03-25', JSON.stringify([t1]), '', 20, 25, 20, 25, 0, 0, 1, 100, 'completed').lastInsertRowid
    const t3 = tasks.run(projId, '地下结构施工', 'A区', 60, '2026-03-26', '2026-05-24', JSON.stringify([t2]), '', 25, 85, 25, 85, 0, 0, 1, 85, 'in_progress').lastInsertRowid
    const t4 = tasks.run(projId, '裙楼主体结构', 'B区', 90, '2026-05-25', '2026-08-22', JSON.stringify([t3]), '', 85, 175, 90, 180, 5, 5, 0, 40, 'in_progress').lastInsertRowid
    const t5 = tasks.run(projId, '主楼主体结构', 'A区', 180, '2026-05-25', '2026-11-20', JSON.stringify([t3]), '', 85, 265, 85, 265, 0, 0, 1, 20, 'in_progress').lastInsertRowid
    const t6 = tasks.run(projId, '景观广场施工', 'B区', 45, '2026-08-23', '2026-10-06', JSON.stringify([t4]), '', 175, 220, 185, 230, 10, 10, 0, 5, 'pending').lastInsertRowid

    const taskMat = db.prepare(`INSERT INTO task_materials (task_id, material_id, quantity) VALUES (?, ?, ?)`)
    taskMat.run(t3, 1, 400)
    taskMat.run(t3, 2, 180)
    taskMat.run(t3, 3, 600)
    taskMat.run(t3, 4, 350)
    taskMat.run(t3, 5, 450)
    taskMat.run(t4, 1, 500)
    taskMat.run(t4, 2, 250)
    taskMat.run(t4, 3, 800)
    taskMat.run(t4, 4, 400)
    taskMat.run(t4, 5, 500)
    taskMat.run(t5, 1, 1200)
    taskMat.run(t5, 2, 800)
    taskMat.run(t5, 3, 2500)
    taskMat.run(t5, 4, 1500)
    taskMat.run(t5, 5, 2000)
    taskMat.run(t6, 1, 150)
    taskMat.run(t6, 4, 800)
    taskMat.run(t6, 5, 600)

    const poStmt = db.prepare(`INSERT INTO purchase_orders (order_no, project_id, supplier_id, total_amount, status, required_date, budget_ok, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const poiStmt = db.prepare(`INSERT INTO purchase_order_items (order_id, material_id, quantity, unit_price, amount, received_qty) VALUES (?, ?, ?, ?, ?, ?)`)

    const po1 = poStmt.run('PO-20260601-001', projId, 1, 285600, 'in_transit', '2026-06-10', 1, '采购部-王经理', '2026-06-01 10:30:00').lastInsertRowid
    poiStmt.run(po1, 1, 200, 480, 96000, 0)
    poiStmt.run(po1, 4, 500, 95, 47500, 0)
    poiStmt.run(po1, 5, 600, 85, 51000, 0)

    const po2 = poStmt.run('PO-20260528-008', projId, 2, 378000, 'budget_review', '2026-06-15', 0, '采购部-李主管', '2026-05-28 15:20:00').lastInsertRowid
    poiStmt.run(po2, 2, 90, 4200, 378000, 0)

    const po3 = poStmt.run('PO-20260520-004', projId, 1, 428000, 'completed', '2026-05-25', 1, '采购部-王经理', '2026-05-20 14:05:00').lastInsertRowid
    poiStmt.run(po3, 3, 800, 420, 336000, 800)
    poiStmt.run(po3, 1, 200, 460, 92000, 200)

    const receiptStmt = db.prepare(`INSERT INTO material_receipts (order_id, material_id, batch_no, quantity, inspector, quality_status, quality_comment, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    receiptStmt.run(po3, 3, 'B20260525-C30-001', 800, '质检-张工', 'qualified', '混凝土强度达标，配合比符合要求', '2026-05-25 09:10:00')
    receiptStmt.run(po3, 1, 'B20260525-PO425-001', 200, '质检-张工', 'qualified', '水泥安定性检测合格，3d强度满足要求', '2026-05-25 14:30:00')

    const siStmt = db.prepare(`INSERT INTO safety_inspections (project_id, area, risk_level, title, inspector, inspect_date, result, rectification_required, responsible_person, deadline, rectification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const si1 = siStmt.run(projId, 'A区-基坑', 'high', '基坑临边防护栏杆缺失', '安全-赵监督员', '2026-06-03', 'abnormal', 1, '刘工头', '2026-06-05', 'pending').lastInsertRowid
    const si2 = siStmt.run(projId, 'B区-脚手架', 'high', '脚手架连墙件设置不足', '安全-钱监督员', '2026-06-02', 'abnormal', 1, '陈班长', '2026-06-06', 'pending').lastInsertRowid
    const si3 = siStmt.run(projId, 'A区-塔吊', 'high', '2#塔吊力矩限制器失灵', '安全-孙监督员', '2026-05-30', 'abnormal', 1, '设备组王工', '2026-06-03', 'pending').lastInsertRowid
    const si4 = siStmt.run(projId, 'C区-用电', 'medium', '临时用电私拉乱接', '安全-周监督员', '2026-06-01', 'abnormal', 1, '电工李师傅', '2026-06-04', 'completed').lastInsertRowid
    const si5 = siStmt.run(projId, '材料堆放区', 'medium', '消防通道被材料占用', '安全-吴监督员', '2026-06-04', 'normal', 0, '', '', 'none').lastInsertRowid

    const rectStmt = db.prepare(`INSERT INTO rectifications (inspection_id, inspection_code, inspection_title, risk_level, requirement, responsible_person, deadline, status, submit_measures, submit_description, submitter, submitted_at, verify_result, verify_opinion, supervisor, completed_at, upgraded, timeline, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const daysAgo = (d) => {
      const dt = new Date()
      dt.setDate(dt.getDate() + d)
      return dt.toISOString().slice(0, 10)
    }
    rectStmt.run(si1, 'XJ-20260603-001', '基坑临边防护栏杆缺失', 'high', '立即补装所有缺失的临边防护栏杆，并设置红白警示标识', '刘工头', daysAgo(-2), 'overdue', '', '', '', '', '', '', '', '', 0, '[]', '2026-06-03 10:00:00')
    rectStmt.run(si2, 'XJ-20260602-002', '脚手架连墙件设置不足', 'high', '按JGJ130规范要求补设连墙件，两步三跨布置', '陈班长', daysAgo(0), 'pending', '', '', '', '', '', '', '', '', 0, '[]', '2026-06-02 14:20:00')
    rectStmt.run(si3, 'XJ-20260530-003', '2#塔吊力矩限制器失灵', 'high', '立即停机检修，更换力矩限制器传感器并重新标定', '设备组王工', daysAgo(-4), 'overdue', '已联系厂家技术人员到场，正在更换传感器组件，预计明日完成', '力矩限制器故障已排查，系传感器老化导致', '设备组王工', daysAgo(-1).replace(/^/,'') + ' 09:30:00', '', '', '', '', 0, '[]', '2026-05-30 09:15:00')
    rectStmt.run(si4, 'XJ-20260601-004', '临时用电私拉乱接', 'medium', '拆除违规接线，按TN-S系统重新规范布线，加装漏电保护器', '电工李师傅', daysAgo(-1), 'completed', '已拆除所有私拉乱接线路，按规范重新布设三级配电二级保护，所有开关箱均加装合格漏电保护器', '整改完成，已组织现场电工培训', '电工李师傅', daysAgo(-1).replace(/^/,'') + ' 16:00:00', 'pass', '现场核查整改到位，线路规范，漏保测试合格，同意关闭', '监理-张工', daysAgo(0).replace(/^/,'') + ' 10:00:00', 0, '[]', '2026-06-01 11:30:00')

    const notifStmt = db.prepare(`INSERT INTO notifications (type, title, content, recipient, priority, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    notifStmt.run('info', '采购订单待预算审核', '订单【PO-20260528-008】已提交预算审核，请造价工程师及时处理', 'cost_engineer', 'normal', 0, po2, 'purchase_order', '2026-05-28 15:25:00')
    notifStmt.run('warning', '设备维保预警', '4#混凝土泵车已超期2天未维保，请尽快安排', 'equipment_manager', 'high', 0, 4, 'equipment', '2026-06-07 08:00:00')
    notifStmt.run('warning', '设备维保预警', '6#塔吊已超期26天未维保，请立即停机', 'equipment_manager', 'high', 0, 6, 'equipment', '2026-06-07 08:00:00')
    notifStmt.run('info', '采购订单已发货', '订单【PO-20260601-001】供应商已确认发货', 'warehouse', 'normal', 0, po1, 'purchase_order', '2026-06-03 16:00:00')
    notifStmt.run('success', '安全整改完成', '【临时用电私拉乱接】整改已通过监理验证并关闭', 'safety_officer', 'normal', 1, si4, 'inspection', '2026-06-06 10:10:00')

    const msStmt = db.prepare(`INSERT INTO monthly_stats (project_id, section, year, month, completed_value, planned_value, actual_cost, quality_pass_rate, safety_incidents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    msStmt.run(projId, 'A区', 2026, 3, 12500000, 12000000, 11800000, 98.5, 0, '2026-04-01 00:00:00')
    msStmt.run(projId, 'B区', 2026, 3, 8200000, 8000000, 8100000, 99.2, 0, '2026-04-01 00:00:00')
    msStmt.run(projId, 'A区', 2026, 4, 18500000, 18000000, 19200000, 97.8, 1, '2026-05-01 00:00:00')
    msStmt.run(projId, 'B区', 2026, 4, 12000000, 12500000, 11800000, 98.1, 0, '2026-05-01 00:00:00')
    msStmt.run(projId, 'A区', 2026, 5, 22000000, 21500000, 22800000, 97.5, 1, '2026-06-01 00:00:00')
    msStmt.run(projId, 'B区', 2026, 5, 15000000, 15500000, 14800000, 98.8, 0, '2026-06-01 00:00:00')
    msStmt.run(projId, 'C区', 2026, 5, 3500000, 4000000, 3600000, 99.5, 0, '2026-06-01 00:00:00')
  }
}

function registerIpcHandlers() {
  ipcMain.handle('db:query', (_, sql, params = []) => {
    try {
      const stmt = db.prepare(sql)
      if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
        return { success: true, data: stmt.all(...params) }
      }
      const info = stmt.run(...params)
      return { success: true, data: { lastInsertRowid: info.lastInsertRowid, changes: info.changes } }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:exec', (_, sql, params = []) => {
    try {
      if (params.length > 0) {
        db.prepare(sql).run(...params)
      } else {
        db.exec(sql)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db:transaction', (_, statements) => {
    try {
      const tx = db.transaction(() => {
        for (const { sql, params } of statements) {
          db.prepare(sql).run(...(params || []))
        }
      })
      tx()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('app:showSaveDialog', async (_, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options)
    return result
  })

  ipcMain.handle('app:writeFile', async (_, filePath, data, options = {}) => {
    try {
      if (options.encoding === 'buffer' || options.buffer) {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
        fs.writeFileSync(filePath, buffer)
      } else {
        fs.writeFileSync(filePath, data, options.encoding || 'utf-8')
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (db) db.close()
  if (process.platform !== 'darwin') app.quit()
})
