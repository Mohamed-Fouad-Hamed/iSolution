import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { DepartmentDto, DepartmentCreateDto, DepartmentUpdateDto, Department } from '../../models/department';
import { environment } from '../../../environments/environment';
import { TranslateService } from '@ngx-translate/core'; // Import TranslateService

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService); // Inject TranslateService

  // IMPORTANT: Implement a robust way to get the current company context
  private getCurrentCompanyId(): number | null {
     // Example: Fetch from a shared service, state management, or local storage
     const companyIdStr = localStorage.getItem('currentCompanyId'); // Replace with your method
     return companyIdStr ? parseInt(companyIdStr, 10) : null; // Handle null properly
  }

  private getBaseApiUrl(companyId: number): string {
    return `${environment.apiUrl}/api/v1/companies/${companyId}/departments`;
  }

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // GET all departments (flat list) for a given company
  getDepartmentsByCompany(companyId: number): Observable<Department[]> {
    // Note: Returning Department[] directly, assuming DTO matches interface structure
    return this.http.get<Department[]>(this.getBaseApiUrl(companyId))
      .pipe(retry(1), catchError(err => this.handleError(err, 'DEPARTMENT.ERRORS.LOAD_FAILED')));
  }

  // GET department by SERIAL_ID
  getDepartmentBySerialId(companyId: number, serialId: string): Observable<DepartmentDto> {
    const url = `${this.getBaseApiUrl(companyId)}/by-serial/${encodeURIComponent(serialId)}`;
    return this.http.get<DepartmentDto>(url)
      .pipe(catchError(err => this.handleError(err, 'DEPARTMENT.ERRORS.NOT_FOUND')));
  }

  // POST (create) new department
  createDepartment(department: DepartmentCreateDto): Observable<DepartmentDto> {
    if (!department.accountId) {
        return throwError(() => new Error(this.translate.instant('COMMON.ERRORS.MISSING_CONTEXT', { context: 'Company ID' })));
    }
    return this.http.post<DepartmentDto>(this.getBaseApiUrl(department.accountId), department, this.httpOptions)
      .pipe(catchError(err => this.handleError(err, 'DEPARTMENT.ERRORS.SAVE_FAILED')));
  }

  // PUT (update) existing department identified by its ORIGINAL serial_id
  updateDepartment(originalSerialId: string, department: DepartmentUpdateDto): Observable<DepartmentDto> {
     if (!department.accountId) {
         return throwError(() => new Error(this.translate.instant('COMMON.ERRORS.MISSING_CONTEXT', { context: 'Company ID' })));
     }
    // URL uses the *original* serialId to find the resource
    const url = `${this.getBaseApiUrl(department.accountId)}/${encodeURIComponent(originalSerialId)}`;
    // Payload contains the potentially updated data (including a new serial_id if changed)
    return this.http.put<DepartmentDto>(url, department, this.httpOptions)
      .pipe(catchError(err => this.handleError(err, 'DEPARTMENT.ERRORS.SAVE_FAILED')));
  }

  // DELETE department by SERIAL_ID
  deleteDepartment(companyId: number, serialId: string): Observable<void> {
    const url = `${this.getBaseApiUrl(companyId)}/${encodeURIComponent(serialId)}`;
    return this.http.delete<void>(url)
      .pipe(catchError(err => this.handleError(err, 'DEPARTMENT.ERRORS.DELETE_FAILED')));
  }

  // --- Optional: Get Children/Roots ---
  getDirectChildren(companyId: number, parentSerialId: string): Observable<DepartmentDto[]> {
    const url = `${this.getBaseApiUrl(companyId)}/by-parent-serial/${encodeURIComponent(parentSerialId)}`;
    return this.http.get<DepartmentDto[]>(url)
        .pipe(catchError(err => this.handleError(err, 'DEPARTMENT.ERRORS.LOAD_FAILED')));
  }

  getRootDepartments(companyId: number): Observable<DepartmentDto[]> {
    const url = `${this.getBaseApiUrl(companyId)}/roots`;
    return this.http.get<DepartmentDto[]>(url)
        .pipe(catchError(err => this.handleError(err, 'DEPARTMENT.ERRORS.LOAD_FAILED')));
  }

  // Enhanced error handler using TranslateService
  private handleError(error: HttpErrorResponse, defaultMessageKey: string) {
    let userMessage: string;
    console.error('API Error:', error);

    if (error.error instanceof ErrorEvent) { // Client-side/network error
      userMessage = this.translate.instant('COMMON.ERRORS.NETWORK');
    } else { // Backend error
        const backendMsg = error.error?.message || error.message;
        const status = error.status;

        if (status === 404) {
            userMessage = this.translate.instant('DEPARTMENT.ERRORS.NOT_FOUND');
        } else if (status === 409) { // Conflict
            userMessage = this.translate.instant('DEPARTMENT.ERRORS.CONFLICT');
             if (backendMsg) userMessage += ` (${backendMsg})`; // Append specific reason if available
        } else if (backendMsg && status !== 500) { // Use specific backend message if available and not generic 500
            userMessage = backendMsg;
        }
         else { // Fallback generic message
            userMessage = this.translate.instant(defaultMessageKey);
        }
    }
    // Return an observable error with the translated, user-facing message
    return throwError(() => new Error(userMessage));
  }
}