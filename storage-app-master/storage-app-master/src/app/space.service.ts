import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SpaceService {

  base = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // WAREHOUSE
  getAll() {
    return this.http.get(`${this.base}/warehouses`);
  }

  addWarehouse(name: string) {
    return this.http.post(`${this.base}/warehouse`, { name });
  }

  deleteWarehouse(id: string) {
    return this.http.delete(`${this.base}/warehouse/${id}`);
  }

  // CHAMBER
  addChamber(wid: string, name: string) {
    return this.http.post(`${this.base}/warehouse/${wid}/chamber`, { name });
  }

  deleteChamber(wid: string, cid: string) {
    return this.http.delete(`${this.base}/warehouse/${wid}/chamber/${cid}`);
  }

  // ASSIGN / RELEASE
  assign(spaceId: string, item: string) {
    return this.http.post(`${this.base}/assign`, { spaceId, item });
  }

  release(spaceId: string) {
    return this.http.post(`${this.base}/release`, { spaceId });
  }

  // ADD SLOTS (FIXED BASE URL)
  addSlots(
    warehouseId: number,
    chamberId: number,
    rows: number,
    levels: number
  ) {
    return this.http.post<any[]>(
      `${this.base}/api/warehouses/${warehouseId}/chambers/${chamberId}/slots`,
      { rows, levels }
    );
  }
  getLatestScan() {
  return this.http.get(`${this.base}/scan/latest`);
}
}