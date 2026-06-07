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
