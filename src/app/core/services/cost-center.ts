import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CostCenterDepartment, CostCenter, CostCenterRequestDTO } from '../../models/cost-center';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root' // Or provide in CostCenterModule
})
export class CostCenterService {

  constructor(private http: HttpClient) { }

  private getCostCenterApiUrl(){
    return `${environment.apiUrl}/api/v1/cost-centers`;
  }

  private getBaseApiUrl(accountId: number): string {
    return `${environment.apiUrl}/api/v1/companies/${accountId}/departments/cost-center-departments`;
  }

  // --- Department Methods ---
  getDepartments(accountId:number): Observable<CostCenterDepartment[]> {
    return this.http.get<CostCenterDepartment[]>(this.getBaseApiUrl(accountId)).pipe(
      catchError(this.handleError)
    );
  }

  // --- Cost Center Methods ---
  getCostCentersByDepartment(departmentId: number): Observable<CostCenter[]> {
    return this.http.get<CostCenter[]>(`${this.getCostCenterApiUrl()}/department/${departmentId}`).pipe(
      catchError(this.handleError)
    );
  }

  getCostCenterById(id: string): Observable<CostCenter> {
    return this.http.get<CostCenter>(`${this.getCostCenterApiUrl()}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createCostCenter(costCenterDto: CostCenterRequestDTO): Observable<CostCenter> {
    return this.http.post<CostCenter>(this.getCostCenterApiUrl(), costCenterDto).pipe(
      catchError(this.handleError)
    );
  }

  updateCostCenter(id: string, costCenterDto: CostCenterRequestDTO): Observable<CostCenter> {
    return this.http.put<CostCenter>(`${this.getCostCenterApiUrl()}/${id}`, costCenterDto).pipe(
      catchError(this.handleError)
    );
  }

  deleteCostCenter(id: string): Observable<void> {
    return this.http.delete<void>(`${this.getCostCenterApiUrl()}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('API Error: ', error);
    return throwError(() => new Error('An error occurred. Please try again later.'));
    // Consider more specific error handling based on error.status
  }
}