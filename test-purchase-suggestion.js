const http = require('http');

function call(endpoint, sql, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql, params });
    const req = http.request({
      hostname: 'localhost', port: 3001, path: endpoint, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('\n========== 【采购建议】真实SQL计算 ==========\n');

  const projectId = 2;
  const projects = await call('/db/query', 'SELECT id, name FROM projects WHERE id = ?', [projectId]);
  console.log('项目:', projects.data[0].name, '(id=' + projectId + ')');

  const tasks = await call('/db/query',
    'SELECT id, name, status FROM construction_tasks WHERE project_id = ? AND status != ?',
    [projectId, 'completed']);
  console.log('\nStep1 - 未完成施工任务 (' + tasks.data.length + '条):');
  tasks.data.forEach(t => console.log('  - ' + t.name + ' [' + t.status + ']'));

  const taskIds = tasks.data.map(t => t.id);
  const placeholders = taskIds.map(() => '?').join(',');
  const taskMats = await call('/db/query',
    'SELECT tm.*, m.code, m.name, m.unit, m.unit_price, m.stock, m.safety_stock, m.category, m.spec FROM task_materials tm LEFT JOIN materials m ON tm.material_id = m.id WHERE tm.task_id IN (' + placeholders + ')', taskIds);
  console.log('\nStep2 - 任务材料需求 JOIN materials (' + taskMats.data.length + '条):');
  taskMats.data.forEach(r => console.log('  - ' + r.name + ': ' + r.quantity + r.unit + ' (库存=' + r.stock + ', 安全线=' + r.safety_stock + ')'));

  const onOrderItems = await call('/db/query',
    "SELECT poi.material_id, SUM(poi.quantity - poi.received_qty) AS remainingQty FROM purchase_order_items poi LEFT JOIN purchase_orders po ON poi.order_id = po.id WHERE po.project_id = ? AND po.status IN ('draft','budget_review','pending_approval','approved','in_transit') GROUP BY poi.material_id", [projectId]);
  const onOrderMap = {};
  onOrderItems.data.forEach(i => onOrderMap[i.material_id] = i.remainingQty);
  console.log('\nStep3 - 在途采购量 (未到货):');
  Object.keys(onOrderMap).forEach(k => console.log('  - 材料id=' + k + ': ' + onOrderMap[k]));

  const suppliers = await call('/db/query', 'SELECT * FROM suppliers ORDER BY rating DESC');
  console.log('\nStep4 - 供应商列表（按评级降序）:');
  suppliers.data.forEach(s => console.log('  - ' + s.name + ' [评级=' + s.rating + '] 品类: ' + s.material_types));

  const materialMap = {};
  taskMats.data.forEach(tm => {
    if (!materialMap[tm.material_id]) {
      materialMap[tm.material_id] = {
        code: tm.code, name: tm.name, category: tm.category, spec: tm.spec,
        unit: tm.unit, unitPrice: tm.unit_price || tm.unitPrice,
        currentStock: tm.stock || 0, safetyStock: tm.safety_stock || 10,
        requiredQty: 0, taskNames: [], onOrderQty: onOrderMap[tm.material_id] || 0
      };
    }
    materialMap[tm.material_id].requiredQty += tm.quantity;
    const task = tasks.data.find(t => t.id === tm.task_id);
    if (task) materialMap[tm.material_id].taskNames.push(task.name);
  });

  const suggestions = [];
  console.log('\nStep5 - 缺口量公式推导 & 推荐供应商:');
  for (const mid of Object.keys(materialMap)) {
    const item = materialMap[mid];
    const gap1 = item.requiredQty - item.currentStock - item.onOrderQty;
    const gap2 = item.safetyStock - item.currentStock;
    let suggestQty = Math.max(gap1, gap2, 0);
    if (item.unit === '吨' || item.unit === '立方米') suggestQty = Math.ceil(suggestQty / 10) * 10;

    let recommendSupplier = '暂无匹配供应商';
    let supplierRating = 0;
    const categoryLower = (item.category || '').toLowerCase();
    const nameLower = (item.name || '').toLowerCase();
    for (const s of suppliers.data.sort((a, b) => b.rating - a.rating)) {
      const types = (s.material_types || '').toLowerCase();
      if (types.includes(categoryLower) || types.split(/[,，、\s]/).some(t => nameLower.includes(t))) {
        recommendSupplier = s.name;
        supplierRating = s.rating;
        break;
      }
    }

    const amount = (suggestQty * (item.unitPrice || 0)).toFixed(2);
    console.log('\n  材料: ' + item.name);
    console.log('    任务需求来源: ' + item.taskNames.join(', '));
    console.log('    需用量: ' + item.requiredQty + item.unit);
    console.log('    当前库存: ' + item.currentStock + item.unit);
    console.log('    在途采购量: ' + item.onOrderQty + item.unit);
    console.log('    安全库存线: ' + item.safetyStock + item.unit);
    console.log('    缺口公式: max(' + item.requiredQty + '-' + item.currentStock + '-' + item.onOrderQty + '=' + gap1 + ', ' + item.safetyStock + '-' + item.currentStock + '=' + gap2 + ', 0) = ' + suggestQty);
    console.log('    推荐供应商: ' + recommendSupplier + ' (评级:' + supplierRating + '星)');
    console.log('    预估金额: ¥' + amount);

    suggestions.push({
      material_id: parseInt(mid), name: item.name, unit: item.unit,
      requiredQty: item.requiredQty, currentStock: item.currentStock,
      onOrderQty: item.onOrderQty, safetyStock: item.safetyStock,
      suggestQty, recommendSupplier, supplierRating, estimatedAmount: parseFloat(amount)
    });
  }

  console.log('\n========== 采购建议清单（真实SQL计算结果）==========');
  console.log(suggestions.map(s =>
    '| ' + s.name.padEnd(14) + ' | ' + (s.requiredQty + s.unit).padEnd(10) + ' | ' + (s.currentStock + '').padEnd(6) + ' | ' + (s.onOrderQty + '').padEnd(6) + ' | ' + (s.safetyStock + '').padEnd(6) + ' | ' + (s.suggestQty + s.unit).padEnd(10) + ' | ' + s.recommendSupplier.padEnd(18) + ' | ' + (s.supplierRating + '星').padEnd(4) + ' | ¥' + s.estimatedAmount
  ).join('\n'));

  const total = suggestions.reduce((s, x) => s + x.estimatedAmount, 0);
  console.log('\n合计建议采购金额: ¥' + total.toFixed(2));

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
const http = require('http');

function call(endpoint, sql, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql, params });
    const req = http.request({
      hostname: 'localhost', port: 3001, path: endpoint, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('\n========== 🛒 【采购建议】真实SQL计算 ==========\n');

  const projectId = 2;

  const projects = await call('/db/query', 'SELECT id, name FROM projects WHERE id = ?', [projectId]);
  console.log('✅ 项目:', projects.data[0].name, '(id=' + projectId + ')');

  const tasks = await call('/db/query',
    'SELECT id, name, status FROM construction_tasks WHERE project_id = ? AND status != ?',
    [projectId, 'completed']);
  console.log('\n📋 Step1 - 未完成施工任务 (' + tasks.data.length + '条):');
  tasks.data.forEach(t => console.log('   - ' + t.name + ' [' + t.status + ']'));

  const taskIds = tasks.data.map(t => t.id);
  const placeholders = taskIds.map(() => '?').join(',');
  const taskMats = await call('/db/query',
    `SELECT tm.*, m.code, m.name, m.unit, m.unit_price, m.stock, m.safety_stock, m.category, m.spec
     FROM task_materials tm LEFT JOIN materials m ON tm.material_id = m.id
     WHERE tm.task_id IN (${placeholders})`, taskIds);
  console.log('\n📦 Step2 - 任务材料需求 JOIN materials:');
  taskMats.data.forEach(r => console.log('   - ' + r.name + ': ' + r.quantity + r.unit + ' (库存=' + r.stock + ', 安全库存线=' + r.safety_stock + ')'));

  const onOrderItems = await call('/db/query',
    `SELECT poi.material_id, SUM(poi.quantity - poi.received_qty) AS remainingQty
     FROM purchase_order_items poi LEFT JOIN purchase_orders po ON poi.order_id = po.id
     WHERE po.project_id = ? AND po.status IN ('draft','budget_review','pending_approval','approved','in_transit')
     GROUP BY poi.material_id`, [projectId]);
  const onOrderMap = {};
  onOrderItems.data.forEach(i => onOrderMap[i.material_id] = i.remainingQty);
  console.log('\n🚛 Step3 - 在途采购量 (未到货):');
  Object.keys(onOrderMap).forEach(k => console.log('   - 材料id=' + k + ': ' + onOrderMap[k]));

  const suppliers = await call('/db/query', 'SELECT * FROM suppliers ORDER BY rating DESC');
  console.log('\n⭐ Step4 - 供应商列表（按评级降序）:');
  suppliers.data.forEach(s => console.log('   - ' + s.name + ' [评级=' + s.rating + '] 品类: ' + s.material_types));

  const materialMap = {};
  taskMats.data.forEach(tm => {
    if (!materialMap[tm.material_id]) {
      materialMap[tm.material_id] = {
        code: tm.code, name: tm.name, category: tm.category, spec: tm.spec,
        unit: tm.unit, unitPrice: tm.unit_price || tm.unitPrice,
        currentStock: tm.stock || 0, safetyStock: tm.safety_stock || 10,
        requiredQty: 0, taskNames: [], onOrderQty: onOrderMap[tm.material_id] || 0
      };
    }
    materialMap[tm.material_id].requiredQty += tm.quantity;
    const task = tasks.data.find(t => t.id === tm.task_id);
    if (task) materialMap[tm.material_id].taskNames.push(task.name);
  });

  const suggestions = [];
  console.log('\n🧮 Step5 - 缺口量公式推导 & 推荐供应商:');
  for (const mid of Object.keys(materialMap)) {
    const item = materialMap[mid];
    const gap1 = item.requiredQty - item.currentStock - item.onOrderQty;
    const gap2 = item.safetyStock - item.currentStock;
    let suggestQty = Math.max(gap1, gap2, 0);
    if (item.unit === '吨' || item.unit === '立方米') suggestQty = Math.ceil(suggestQty / 10) * 10;

    let recommendSupplier = '暂无匹配供应商';
    let supplierRating = 0;
    const categoryLower = (item.category || '').toLowerCase();
    const nameLower = (item.name || '').toLowerCase();
    for (const s of suppliers.data.sort((a, b) => b.rating - a.rating)) {
      const types = (s.material_types || '').toLowerCase();
      if (types.includes(categoryLower) || types.split(/[,，、\s]/).some(t => nameLower.includes(t))) {
        recommendSupplier = s.name;
        supplierRating = s.rating;
        break;
      }
    }

    const amount = (suggestQty * (item.unitPrice || 0)).toFixed(2);
    console.log('\n  📌 材料: ' + item.name);
    console.log('     任务需求来源: ' + item.taskNames.join(', '));
    console.log('     需用量: ' + item.requiredQty + item.unit);
    console.log('     当前库存: ' + item.currentStock + item.unit);
    console.log('     在途采购量: ' + item.onOrderQty + item.unit);
    console.log('     安全库存线: ' + item.safetyStock + item.unit);
    console.log('     缺口公式: max(' + item.requiredQty + '-' + item.currentStock + '-' + item.onOrderQty + '=' + gap1 + ', ' + item.safetyStock + '-' + item.currentStock + '=' + gap2 + ', 0) = ' + suggestQty);
    console.log('     推荐供应商: ' + recommendSupplier + ' (评级:' + supplierRating + '星)');
    console.log('     预估金额: ¥' + amount);

    suggestions.push({
      material_id: parseInt(mid), ...item, suggestQty, recommendSupplier, supplierRating,
      estimatedAmount: parseFloat(amount),
      process: {
        taskNames: item.taskNames,
        requiredQty: item.requiredQty,
        currentStock: item.currentStock,
        onOrderQty: item.onOrderQty,
        safetyStock: item.safetyStock,
        gap1, gap2, suggestQty,
        formula: `max(${item.requiredQty} - ${item.currentStock} - ${item.onOrderQty} = ${gap1}, ${item.safetyStock} - ${item.currentStock} = ${gap2}, 0) = ${suggestQty}`,
        supplier: recommendSupplier,
        supplierRating
      }
    });
  }

  console.log('\n========== 采购建议清单（真实SQL计算结果）==========');
  console.table(suggestions.map(s => ({
    材料: s.name, 需用量: s.requiredQty + s.unit, 库存: s.currentStock, 在途: s.onOrderQty,
    安全线: s.safetyStock, 建议采购量: s.suggestQty + s.unit, 推荐供应商: s.recommendSupplier,
    评级: s.supplierRating + '星', 预估金额: '¥' + s.estimatedAmount
  })));

  const total = suggestions.reduce((s, x) => s + x.estimatedAmount, 0);
  console.log('\n💰 合计建议采购金额: ¥' + total.toFixed(2));

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
