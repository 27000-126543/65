const http = require('http');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const PORT = 3099;
const dbPath = path.join(__dirname, '..', 'data', 'construction.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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

    CREATE TABLE IF NOT EXISTS task_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity REAL NOT NULL
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
      category TEXT,
      spec TEXT,
      unit TEXT,
      unit_price REAL DEFAULT 0,
      stock REAL DEFAULT 0,
      safety_stock REAL DEFAULT 10,
      supplier_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      model TEXT,
      status TEXT DEFAULT 'working',
      location TEXT,
      operator TEXT,
      last_maintenance TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS safety_inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      project_id INTEGER,
      title TEXT NOT NULL,
      location TEXT,
      inspector TEXT,
      inspect_date TEXT,
      risk_level TEXT DEFAULT 'medium',
      findings TEXT,
      rectification_required INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      project_id INTEGER,
      supplier_id INTEGER,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      ordered_date TEXT,
      expected_date TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL DEFAULT 0,
      received_qty REAL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS material_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      item_id INTEGER,
      material_id INTEGER,
      batch_no TEXT,
      quantity REAL NOT NULL,
      quality_status TEXT DEFAULT 'pending',
      inspector TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      content TEXT,
      recipient TEXT,
      priority TEXT DEFAULT 'normal',
      is_read INTEGER DEFAULT 0,
      related_id INTEGER,
      related_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monthly_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      output_value REAL DEFAULT 0,
      quality_pass_rate REAL DEFAULT 100,
      safety_incidents INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function initSeedData() {
  const count = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
  if (count > 0) return;

  const insertProject = db.prepare(
    `INSERT INTO projects (name, type, total_investment, contract_days, start_date, end_date, participants, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const projects = [
    ['城市轨道交通4号线一期', '市政工程', 5200000000, 1080, '2024-03-01', '2027-02-15', '中铁建设集团, 地铁运营公司, 市规划院', 'active'],
    ['绿城·春江明月住宅小区', '住宅', 680000000, 540, '2024-06-01', '2025-11-30', '绿城建筑, 安泰监理, 华汇设计院', 'active'],
    ['滨江225商业综合体', '商业综合体', 1850000000, 720, '2023-09-15', '2025-08-31', '万达商业, 中建三局, 同济设计院', 'active']
  ];
  const projectIds = projects.map(p => insertProject.run(...p).lastInsertRowid);

  const insertTask = db.prepare(
    `INSERT INTO construction_tasks (project_id, name, section, duration, start_date, end_date, predecessors, resources, early_start, early_finish, late_start, late_finish, total_float, free_float, is_critical, progress, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tasks = [
    [projectIds[0], '车站主体结构施工', 'T1标段-人民广场站', 180, '2026-01-10', '2026-07-08', '[]', '[\"HRB400E螺纹钢\",\"商品混凝土C35\",\"模板木方\"]', 0, 180, 0, 180, 0, 0, 1, 35, 'in_progress'],
    [projectIds[0], '盾构区间掘进', 'T1标段-人民广场~中山路', 240, '2026-03-01', '2026-10-27', '[1]', '[\"管片预制件\",\"防水卷材\",\"注浆材料\"]', 50, 290, 50, 290, 0, 0, 1, 12, 'in_progress'],
    [projectIds[0], '机电设备安装', 'T1标段-全线', 200, '2026-09-01', '2027-03-19', '[2]', '[\"电缆桥架\",\"配电箱\",\"通风管道\"]', 230, 430, 230, 430, 0, 0, 1, 0, 'pending'],
    [projectIds[1], '1#~5#楼主体施工', 'A区块', 300, '2025-11-01', '2026-08-28', '[]', '[\"HRB400E螺纹钢\",\"商品混凝土C30\",\"蒸压加气混凝土砌块\"]', 0, 300, 0, 300, 0, 0, 1, 58, 'in_progress'],
    [projectIds[1], '地下车库结构', 'B区块', 120, '2025-12-01', '2026-03-30', '[]', '[\"HRB400E螺纹钢\",\"商品混凝土C35\",\"防水卷材\"]', 0, 120, 0, 120, 0, 0, 1, 82, 'in_progress'],
    [projectIds[2], '地下室及基础工程', 'B1层~B3层', 150, '2025-08-15', '2026-01-11', '[]', '[\"HRB500E螺纹钢\",\"商品混凝土C40\",\"止水钢板\"]', 0, 150, 0, 150, 0, 0, 1, 100, 'completed']
  ];
  const taskIds = tasks.map(t => insertTask.run(...t).lastInsertRowid);

  const insertMaterial = db.prepare(
    `INSERT INTO materials (code, name, category, spec, unit, unit_price, stock, safety_stock, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const materials = [
    ['MAT-001', 'HRB400E螺纹钢', '钢筋', 'Φ16~Φ25', '吨', 4200, 120, 80, 1],
    ['MAT-002', '商品混凝土C30', '混凝土', 'C30', '立方米', 420, 500, 200, 2],
    ['MAT-003', '商品混凝土C35', '混凝土', 'C35', '立方米', 445, 300, 150, 2],
    ['MAT-004', '蒸压加气混凝土砌块', '砌体', '600×240×200', '立方米', 280, 80, 50, 3],
    ['MAT-005', '防水卷材', '防水材料', 'SBS 4mm', '平方米', 55, 2000, 800, 4],
    ['MAT-006', '模板木方', '周转材料', '50×100×4000', '根', 22, 800, 500, 5],
    ['MAT-007', '电缆桥架', '机电', '镀锌 200×100', '米', 145, 50, 30, 6],
    ['MAT-008', '配电箱', '机电', 'PZ30-24回路', '台', 680, 12, 8, 6],
    ['MAT-009', '管片预制件', '盾构构件', '内径6.2m', '环', 28000, 5, 3, 1],
    ['MAT-010', 'HRB500E螺纹钢', '钢筋', 'Φ20~Φ32', '吨', 4580, 30, 20, 1]
  ];
  const materialIds = materials.map(m => insertMaterial.run(...m).lastInsertRowid);

  const insertTaskMaterial = db.prepare(
    `INSERT INTO task_materials (task_id, material_id, quantity) VALUES (?, ?, ?)`
  );
  const taskMaterials = [
    [taskIds[0], materialIds[0], 320],
    [taskIds[0], materialIds[2], 1800],
    [taskIds[0], materialIds[5], 2400],
    [taskIds[1], materialIds[8], 580],
    [taskIds[1], materialIds[4], 12000],
    [taskIds[2], materialIds[6], 4500],
    [taskIds[2], materialIds[7], 280],
    [taskIds[3], materialIds[0], 480],
    [taskIds[3], materialIds[1], 6500],
    [taskIds[3], materialIds[3], 1200],
    [taskIds[4], materialIds[0], 150],
    [taskIds[4], materialIds[2], 2200],
    [taskIds[4], materialIds[4], 4800],
    [taskIds[5], materialIds[9], 520],
    [taskIds[5], materialIds[2], 3800],
    [taskIds[0], materialIds[4], 2400],
    [taskIds[3], materialIds[5], 1800],
    [taskIds[5], materialIds[4], 6000]
  ];
  taskMaterials.forEach(tm => insertTaskMaterial.run(...tm));

  const insertSupplier = db.prepare(
    `INSERT INTO suppliers (name, contact, phone, address, rating, material_types) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const suppliers = [
    ['宝钢钢铁股份有限公司', '李经理', '13800138001', '上海市宝山区', 5, '钢筋,螺纹钢,钢材,钢结构'],
    ['中建商砼有限公司', '王厂长', '13900139002', '杭州市余杭区', 4, '商品混凝土,混凝土,砂浆'],
    ['杭加新型建材', '张总', '13700137003', '杭州市萧山区', 4, '加气混凝土砌块,墙体材料,砌体'],
    ['东方雨虹防水', '赵工', '13600136004', '上海市浦东新区', 5, '防水卷材,防水涂料,防水材料'],
    ['方圆模板租赁', '孙经理', '13500135005', '杭州市拱墅区', 3, '模板,木方,脚手架,周转材料'],
    ['正泰电器成套', '钱经理', '13400134006', '温州市乐清市', 4, '配电箱,电缆,桥架,开关,电气']
  ];
  suppliers.forEach(s => insertSupplier.run(...s));

  const insertEquipment = db.prepare(
    `INSERT INTO equipment (code, name, model, status, location, operator, last_maintenance) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const equipments = [
    ['EQ-001', '塔式起重机', 'QTZ80', 'working', '绿城·春江明月A区', '刘师傅', '2026-05-20'],
    ['EQ-002', '混凝土泵车', 'SY5419THB 560C-8A', 'standby', '滨江225综合体', '陈师傅', '2026-06-01'],
    ['EQ-003', '盾构机', '中铁装备 ZTE6480', 'working', '地铁4号线T1标段', '盾构班组A', '2026-05-30'],
    ['EQ-004', '挖掘机', 'CAT 336D2', 'working', '绿城·春江明月B区', '赵师傅', '2026-05-15'],
    ['EQ-005', '施工升降机', 'SC200/200', 'maintenance', '滨江225综合体', '检修中', '2026-06-06'],
    ['EQ-006', '钢筋弯曲机', 'GW40B', 'working', '地铁4号线钢筋加工场', '钱师傅', '2026-05-10'],
    ['EQ-007', '装载机', 'ZL50GN', 'fault', '材料堆场', '孙师傅', '2026-06-03']
  ];
  equipments.forEach(e => insertEquipment.run(...e));

  const insertOrder = db.prepare(
    `INSERT INTO purchase_orders (code, project_id, supplier_id, total_amount, status, ordered_date, expected_date, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const orders = [
    ['PO-2026-0001', projectIds[1], 1, 1680000, 'in_transit', '2026-05-15', '2026-06-10', '春江明月1#~5#楼主体二期'],
    ['PO-2026-0002', projectIds[0], 2, 712000, 'approved', '2026-06-01', '2026-06-15', '地铁4号线车站主体结构'],
    ['PO-2026-0003', projectIds[2], 4, 330000, 'completed', '2026-04-20', '2026-05-10', '滨江225地下室防水']
  ];
  const orderIds = orders.map(o => insertOrder.run(...o).lastInsertRowid);

  const insertOrderItem = db.prepare(
    `INSERT INTO purchase_order_items (order_id, material_id, quantity, unit_price, received_qty) VALUES (?, ?, ?, ?, ?)`
  );
  const orderItems = [
    [orderIds[0], materialIds[0], 400, 4200, 150],
    [orderIds[0], materialIds[5], 1800, 22, 0],
    [orderIds[1], materialIds[2], 1600, 445, 400],
    [orderIds[2], materialIds[4], 6000, 55, 6000]
  ];
  orderItems.forEach(i => insertOrderItem.run(...i));

  const insertReceipt = db.prepare(
    `INSERT INTO material_receipts (order_id, item_id, material_id, batch_no, quantity, quality_status, inspector, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const receipts = [
    [orderIds[0], 1, materialIds[0], 'B20260601-A', 150, 'qualified', '质量部-王工', '初次到货验收合格'],
    [orderIds[1], 3, materialIds[2], 'C20260603-B', 400, 'qualified', '质量部-李工', '试块检测合格']
  ];
  receipts.forEach(r => insertReceipt.run(...r));

  const insertInspection = db.prepare(
    `INSERT INTO safety_inspections (code, project_id, title, location, inspector, inspect_date, risk_level, findings, rectification_required, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const inspections = [
    ['SI-2026-001', projectIds[1], '临边防护专项检查', '1#楼3F临边', '安全部-张工', '2026-05-20', 'high', '3处临边缺失防护栏杆', 1, 'rectifying'],
    ['SI-2026-002', projectIds[0], '盾构作业面瓦斯监测', '人民广场站盾构井', '安全部-李工', '2026-05-25', 'medium', '通风设备运行正常', 0, 'passed'],
    ['SI-2026-003', projectIds[1], '脚手架检查', '2#楼外架', '安全部-王工', '2026-05-10', 'high', '连墙件间距超标,剪刀撑缺失', 1, 'rectifying'],
    ['SI-2026-004', projectIds[2], '基坑支护监测', 'B2层深基坑', '安全部-赵工', '2026-05-05', 'high', '位移值接近预警阈值', 1, 'rectifying'],
    ['SI-2026-005', projectIds[0], '临时用电检查', 'T1标段总配电房', '安全部-钱工', '2026-05-18', 'medium', '接地电阻检测合格,部分开关箱未上锁', 1, 'rectifying']
  ];
  const inspectionIds = inspections.map(i => insertInspection.run(...i).lastInsertRowid);

  const today = '2026-06-07';
  const past = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };
  const insertRectification = db.prepare(
    `INSERT INTO rectifications (inspection_id, inspection_code, inspection_title, risk_level, requirement, responsible_person, deadline, status, submit_measures, submit_description, submitter, submitted_at, verify_result, verify_opinion, supervisor, completed_at, upgraded, timeline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const rectifications = [
    [inspectionIds[0], 'SI-2026-001', '临边防护专项检查', 'high', '72小时内完成所有临边防护栏杆搭设，并经验收合格', '施工队长-刘大', past(5), 'pending', '', '', '', '', '', '', '', '', 0, JSON.stringify([{time: past(5), action: '下发整改通知', user: '安全部-张工'}])],
    [inspectionIds[2], 'SI-2026-003', '脚手架检查', 'high', '10天内完成连墙件加固并补齐剪刀撑，附验收记录', '外架班长-陈二', past(2), 'in_progress', '已按方案加固连墙件36处', '剪刀撑还有2跨未完成，预计明天下午补齐', '施工员-小王', past(1), '', '', '', '', 0, JSON.stringify([{time: past(10), action: '下发整改通知', user: '安全部-王工'}, {time: past(1), action: '提交整改措施', user: '施工员-小王'}])],
    [inspectionIds[3], 'SI-2026-004', '基坑支护监测', 'high', '加密监测频率，制定应急处置预案并组织演练', '技术负责人-李总', '2026-06-20', 'in_progress', '已调整监测频率至2小时/次，应急预案已修订完成', '演练预计本周五组织', '技术部-小周', past(1), '', '', '', '', 0, JSON.stringify([{time: past(32), action: '下发整改通知', user: '安全部-赵工'}, {time: past(1), action: '提交整改措施', user: '技术部-小周'}])],
    [inspectionIds[4], 'SI-2026-005', '临时用电检查', 'medium', '3日内对所有开关箱上锁管理，巡查记录签字齐全', '电工班长-吴四', past(8), 'pending', '', '', '', '', '', '', '', '', 0, JSON.stringify([{time: past(20), action: '下发整改通知', user: '安全部-钱工'}])]
  ];
  rectifications.forEach(r => insertRectification.run(...r));

  const insertNotif = db.prepare(
    `INSERT INTO notifications (type, title, content, recipient, priority, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const notifs = [
    ['approval', '新项目立项审批', '滨江225商业综合体项目已提交立项，请审批', 'project_director', 'high', 0, projectIds[2], 'project', '2026-06-07 08:30:00'],
    ['equipment', '设备维保提醒', '施工升降机SC200已达保养周期，建议尽快安排', 'equipment_manager', 'normal', 0, 5, 'equipment', '2026-06-07 07:00:00'],
    ['material', '库存预警：商品混凝土C30', '当前库存500立方米，低于安全库存200立方米？请确认采购', 'purchaser', 'normal', 0, materialIds[1], 'material', '2026-06-06 16:00:00'],
    ['approval', '采购订单待审批', 'PO-2026-0002 商品混凝土采购申请待您审批', 'finance_manager', 'normal', 0, orderIds[1], 'purchase_order', '2026-06-05 09:20:00'],
    ['info', '整改催办通知', 'SI-2026-003整改任务距截止日还有2天', 'project_manager', 'normal', 0, 2, 'rectification', '2026-06-07 08:00:00']
  ];
  notifs.forEach(n => insertNotif.run(...n));

  const insertStat = db.prepare(
    `INSERT INTO monthly_stats (year, month, output_value, quality_pass_rate, safety_incidents, cost) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const stats = [
    [2026, 1, 185, 95.8, 0, 152],
    [2026, 2, 142, 96.5, 0, 118],
    [2026, 3, 228, 97.2, 1, 190],
    [2026, 4, 275, 98.1, 0, 228],
    [2026, 5, 293, 98.5, 0, 245],
    [2026, 6, 156, 98.8, 0, 130],
    [2026, 7, 0, 100, 0, 0]
  ];
  stats.forEach(s => insertStat.run(...s));

  console.log('✅ Seed data inserted');
}

initTables();
initSeedData();

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 200, { ok: 1 });
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: 1, dbPath });

  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { sql, params = [] } = JSON.parse(body || '{}');
        if (!sql) return send(res, 400, { error: 'sql required' });

        if (req.url === '/db/query') {
          const rows = db.prepare(sql).all(...params);
          return send(res, 200, { ok: 1, data: rows });
        }
        if (req.url === '/db/exec') {
          const info = db.prepare(sql).run(...params);
          return send(res, 200, { ok: 1, data: { changes: info.changes, lastInsertRowid: info.lastInsertRowid } });
        }
        if (req.url === '/db/transaction') {
          const statements = Array.isArray(params) && params.length && Array.isArray(params[0]) ? params : [{ sql, params }];
          const tx = db.transaction(queries => {
            const results = [];
            for (const q of queries) {
              const info = db.prepare(q.sql).run(...(q.params || []));
              results.push({ changes: info.changes, lastInsertRowid: info.lastInsertRowid });
            }
            return results;
          });
          const results = tx(statements);
          return send(res, 200, { ok: 1, data: results });
        }
        send(res, 404, { error: 'unknown endpoint' });
      } catch (e) {
        send(res, 500, { error: e.message, stack: e.stack });
      }
    });
  } else {
    send(res, 404, { error: 'not found' });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 SQLite HTTP Server ready on http://localhost:${PORT}`);
  console.log(`   DB: ${dbPath}`);
});
