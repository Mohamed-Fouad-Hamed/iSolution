// src/app/core/services/customer.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomerCreateDto, CustomerDto, CustomerUpdateDto, Page, CustomerFilterParams } from '../../models/customer.model';

@Injectable({
  providedIn: 'root' // Provided in root for singleton instance
})
export class CustomerService {
    private apiUrl = `${environment.apiUrl}/api/v1/customers`; // Use environment variable

    constructor(private http: HttpClient) { }
  
    createCustomer(createDto: CustomerCreateDto): Observable<CustomerDto> {
      return this.http.post<CustomerDto>(this.apiUrl, createDto);
    }
  
    getCustomerById(id: number): Observable<CustomerDto> {
      return this.http.get<CustomerDto>(`${this.apiUrl}/${id}`);
    }
  
    getCustomerByCode(customerCode: string): Observable<CustomerDto> {
        return this.http.get<CustomerDto>(`${this.apiUrl}/by-code/${customerCode}`);
    }
  
    getAllCustomers(
      accountId: number,
      page: number, // 0-based index
      size: number,
      sortField: string,
      sortDirection: 'asc' | 'desc',
      filters: CustomerFilterParams
    ): Observable<Page<CustomerDto>> {
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
      return this.http.get<Page<CustomerDto>>(this.apiUrl, { params });
    }
  
    updateCustomer(id: number, updateDto: CustomerUpdateDto): Observable<CustomerDto> {
      return this.http.put<CustomerDto>(`${this.apiUrl}/${id}`, updateDto);
    }
  
    deleteCustomer(id: number): Observable<void> {
      return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
  }