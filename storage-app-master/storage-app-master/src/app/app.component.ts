import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpaceService } from './space.service';
import { Html5Qrcode } from 'html5-qrcode';

type ViewMode = 'home' | 'warehouses' |'reports'| 'chambers' | 'slots';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  view: ViewMode = 'home';
  reports:any[] = []
  warehouses: any[] = [];
  chambers: any[] = [];
  spaces: any[] = [];

  selectedWarehouse: any = null;
  selectedChamber: any = null;

  searchText = '';
  statusFilter: 'all' | 'free' | 'occupied' = 'all';

  totalFree = 0;
  totalOccupied = 0;

  constructor(private service: SpaceService) {
    this.loadWarehouses();
  }

  // ---------------- NAVIGATION ----------------
  openWarehouses() {
    this.view = 'warehouses';
    this.loadWarehouses();
  }
// ngOnInit() {
//   setInterval(() => {
//     this.service.getLatestScan().subscribe((res: any) => {

//       if (res.data) {
//         console.log("📥 Scan received:", res.data);

//         const freeSpace = this.spaces.find(s => s.status === 'free');

//         if (freeSpace) {
//           this.service.assign(freeSpace.id, res.data).subscribe(() => {
//             freeSpace.status = 'occupied';
//             freeSpace.item = res.data;
//           });
//         }
//       }

//     });
//   }, 2000);
// }
  back() {
    if (this.view === 'slots') {
      this.view = 'chambers';
    } else if (this.view === 'chambers') {
      this.view = 'warehouses';
    } else {
      this.view = 'home';
    }
  }
loadChamberData() {
  this.service.getAll().subscribe((data: any) => {
    this.warehouses = data;

    const w = this.warehouses.find(x => x.id === this.selectedWarehouse.id);
    this.selectedWarehouse = w;

    const c = w.chambers.find((x: any) => x.id === this.selectedChamber.id);
    this.selectedChamber = c;

    this.generateSpaces(); // now safe
  });
}
  selectWarehouse(w: any) {
    this.selectedWarehouse = w;
    this.chambers = w.chambers || [];
    this.view = 'chambers';
  }

selectChamber(c: any) {
  this.selectedChamber = c;
  this.loadChamberData();   // 👈 instead of generateSpaces()
  this.view = 'slots';
}

  // ---------------- DATA ----------------
  loadWarehouses() {
    this.service.getAll().subscribe((data: any) => {
      this.warehouses = data || [];
      this.computeStats();
    });
  }

 computeStats() {
  let free = 0;
  let occupied = 0;

  for (const w of this.warehouses) {
    for (const c of w.chambers || []) {
      for (const r of c.rows || []) {
        for (const l of (r.levels || [])) {
          // assume free by default
          free++;
        }
      }
    }
  }

  this.totalFree = free;
  this.totalOccupied = occupied;
}
qrScanner: any;
showScanner = false;
currentSpace: any;

startScan(space: any) {
  this.currentSpace = space;
  this.showScanner = true;

  setTimeout(() => {
    this.qrScanner = new Html5Qrcode("qr-reader");

    this.qrScanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 400, height: 400 }
      },
      (decodedText: string) => {

        console.log("QR:", decodedText);

        this.qrScanner.stop();
        this.showScanner = false;

        this.service.assign(space.id, decodedText).subscribe(() => {
          this.loadChamberData(); // refresh from backend
        });

      },
      (error: any) => {
        // ignore scanning noise
      }
    );

  }, 300);
}

  // ---------------- CHAMBERS ----------------
  addChamber() {
    const name = prompt('Chamber name');
    if (!name) return;

    this.service.addChamber(this.selectedWarehouse.id, name)
      .subscribe((c: any) => {
        this.selectedWarehouse.chambers.push(c);
        this.chambers = this.selectedWarehouse.chambers;
      });
  }
 addWarehouse() {
  const name = prompt('Warehouse name');
  if (!name) return;

  this.service.addWarehouse(name)
    .subscribe((w: any) => {
      this.warehouses = [...this.warehouses, w]; // ✅ trigger UI update
    });
}

  deleteChamber(c: any) {
    this.service.deleteChamber(this.selectedWarehouse.id, c.id)
      .subscribe(() => {
        this.selectedWarehouse.chambers =
          this.selectedWarehouse.chambers.filter((x: any) => x.id !== c.id);

        this.chambers = this.selectedWarehouse.chambers;
      });
  }

  // ---------------- SPACES ----------------
 generateSpaces() {
  this.spaces = [];

  for (const r of this.selectedChamber.rows || []) {
    for (const levelObj of (r.levels || [])) {

      this.spaces.push({
        id: levelObj.id,                 // use real ID
        row: r.name,
        level: levelObj.level,           // depends on your API
        status: levelObj.status || 'free',
        item: levelObj.item || ''
      });

    }
  }
}
get groupedSpaces() {
  const groups: any = {};

  this.filteredSpaces.forEach(space => {
    if (!groups[space.row]) {
      groups[space.row] = [];
    }
    groups[space.row].push(space);
  });

  // Sort so highest level comes first (top → bottom)
  Object.keys(groups).forEach(row => {
    groups[row].sort((a: any, b: any) => b.level - a.level);
  });

  return Object.keys(groups).map(row => ({
    row,
    spaces: groups[row]
  }));
}
addSlots() {
  const levels = prompt('Enter number of levels (slots per row)');

  if (!levels) return;

  this.service.addSlots(
    this.selectedWarehouse.id,
    this.selectedChamber.id,
    1, // keep for compatibility (ignored in backend)
    Number(levels)
  ).subscribe(() => {
    this.loadChamberData(); // 🔥 refresh UI
  });
}
  get filteredSpaces() {
    return this.spaces.filter(s => {
      const matchText =
        !this.searchText ||
        s.id.toLowerCase().includes(this.searchText.toLowerCase());

      const matchStatus =
        this.statusFilter === 'all' || s.status === this.statusFilter;

      return matchText && matchStatus;
    });
  }

  // ---------------- ACTIONS ----------------
  assign(space: any) {
    const item = prompt('Enter item');
    if (!item) return;

    this.service.assign(space.id, item).subscribe(() => {
      space.status = 'occupied';
      space.item = item;
    });
  }

  release(space: any) {
    this.service.release(space.id).subscribe(() => {
      space.status = 'free';
      space.item = '';
    });
  }
}