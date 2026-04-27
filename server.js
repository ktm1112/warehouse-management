const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
// ---------------- MEMORY DB ----------------
let warehouses = [];

// ---------------- HELPERS ----------------
function createWarehouse(name) {
  return {
    id: Date.now().toString(),
    name,
    chambers: []
  };
}

function findWarehouse(id) {
  return warehouses.find(w => w.id === id);
}

function findChamber(warehouse, cid) {
  return warehouse?.chambers?.find(c => c.id === cid);
}

function createLevels(rowName, count) {
  const levels = [];
  for (let i = 1; i <= count; i++) {
    levels.push({
      id: `${rowName}-L${i}-${Date.now()}`, // unique
      level: i,
      status: 'free',
      item: ''
    });
  }
  return levels;
}

// ---------------- INIT DATA ----------------
function seed() {
  const w1 = createWarehouse('Warehouse A');

  w1.chambers.push({
    id: 'c1',
    name: 'Cold Storage',
    rows: [
      { id: 'r1', name: 'R1', levels: createLevels('R1', 3) },
      { id: 'r2', name: 'R2', levels: createLevels('R2', 3) }
    ]
  });

  warehouses.push(w1);
}

seed();

// =====================================================
//                    WAREHOUSES
// =====================================================

app.get('/warehouses', (req, res) => {
  res.json(warehouses);
});

app.post('/warehouse', (req, res) => {
  const w = createWarehouse(req.body.name);
  warehouses.push(w);
  res.json(w);
});

app.delete('/warehouse/:id', (req, res) => {
  warehouses = warehouses.filter(w => w.id !== req.params.id);
  res.json({ ok: true });
});

// =====================================================
//                    CHAMBERS
// =====================================================

app.post('/warehouse/:id/chamber', (req, res) => {
  const w = findWarehouse(req.params.id);
  if (!w) return res.status(404).send('Warehouse not found');

  const chamber = {
    id: Date.now().toString(),
    name: req.body.name,
    rows: []
  };

  w.chambers.push(chamber);
  res.json(chamber);
});

app.delete('/warehouse/:id/chamber/:cid', (req, res) => {
  const w = findWarehouse(req.params.id);
  if (!w) return res.status(404).send();

  w.chambers = w.chambers.filter(c => c.id !== req.params.cid);
  res.json({ ok: true });
});

// =====================================================
//                      ROWS / SLOTS
// =====================================================

// ADD ROWS + LEVELS (SLOTS)
app.post('/api/warehouses/:wid/chambers/:cid/slots', (req, res) => {
  const { wid, cid } = req.params;
  const { levels } = req.body; // 👈 only levels needed now

  const w = findWarehouse(wid);
  const c = findChamber(w, cid);

  if (!c) return res.status(404).send('Chamber not found');

  // Always add ONLY ONE ROW
  const rowName = `R${c.rows.length + 1}`;

  const newRow = {
    id: Date.now().toString(),
    name: rowName,
    levels: createLevels(rowName, Number(levels))
  };

  c.rows.push(newRow);

  res.json(newRow); // return only the new row
});

// =====================================================
//                ASSIGN / RELEASE (REAL)
// =====================================================

app.post('/assign', (req, res) => {
  const { spaceId, item } = req.body;

  for (const w of warehouses) {
    for (const c of w.chambers) {
      for (const r of c.rows) {
        const slot = r.levels.find(l => l.id === spaceId);
        if (slot) {
          slot.status = 'occupied';
          slot.item = item;

          return res.json(slot);
        }
      }
    }
  }

  res.status(404).json({ error: 'Slot not found' });
});

app.post('/release', (req, res) => {
  const { spaceId } = req.body;

  for (const w of warehouses) {
    for (const c of w.chambers) {
      for (const r of c.rows) {
        const slot = r.levels.find(l => l.id === spaceId);
        if (slot) {
          slot.status = 'free';
          slot.item = '';

          return res.json(slot);
        }
      }
    }
  }

  res.status(404).json({ error: 'Slot not found' });
});

// let lastScan = null;

// app.post('/scan', (req, res) => {
//   const { data } = req.body;

//   lastScan = data;

//   console.log("SCANNED FROM MOBILE:", data);

//   res.json({ ok: true });
// });

// app.get('/scan/latest', (req, res) => {
//   res.json({ data: lastScan });
// });

// =====================================================
//                      START
// =====================================================

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
