// src/app/core/services/customer.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VendorCreateDto, VendorDto, VendorUpdateDto, Page, VendorFilterParams } from '../../models/vendor.model';

@Injectable({
  providedIn: 'root' // Provided in root for singleton instance
})
export class VendorService {
    private apiUrl = `${environment.apiUrl}/api/v1/vendors`; // Use environment variable

    constructor(private http: HttpClient) { }
  
    createVendor(createDto: VendorCreateDto): Observable<VendorDto> {
      return this.http.post<VendorDto>(this.apiUrl, createDto);
    }
  
    getVendorById(id: number): Observable<VendorDto> {
      return this.http.get<VendorDto>(`${this.apiUrl}/${id}`);
    }
  
    getVendorByCode(customerCode: string): Observable<VendorDto> {
        return this.http.get<VendorDto>(`${this.apiUrl}/by-code/${customerCode}`);
    }
  
    getAllVendors(
      accountId: number,
      page: number, // 0-based index
      size: number,
      sortField: string,
      sortDirection: 'asc' | 'desc',
      filters: VendorFilterParams
    ): Observable<Page<VendorDto>> {
      let params = new HttpParams()
        .set('accountId', accountId.toString())
        .set('page', page.toString())
        .set('size', size.toString())
        .set('sort', `${sortField},${sortDirection}`);
  
      // Add filter parameters if they exist
      Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
              params = params.set(key, value);
          }
      });
  
      // Important: Spring Pageable expects 0-based page index
      return this.http.get<Page<VendorDto>>(this.apiUrl, { params });
    }
  
    updateVendor(id: number, updateDto: VendorUpdateDto): Observable<VendorDto> {
      return this.http.put<VendorDto>(`${this.apiUrl}/${id}`, updateDto);
    }
  
    deleteVendor(id: number): Observable<void> {
      return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
  }