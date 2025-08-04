import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FiscalYearRequestDTO, FiscalYearResponseDTO } from '../../models/fiscal-year.model';
import { FiscalPeriodRequestDTO, FiscalPeriodResponseDTO } from '../../models/fiscal-period.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root' 
})
export class FiscalConfigService {
  private apiUrl = `${environment.apiUrl}/api/v1`;

  constructor(private http: HttpClient) { }

  private handleError(error: any, entityName: string = 'request') {
    console.error(`API Error during ${entityName}: `, error);
    // Customize error message based on error.error or error.message if available
    const message = error.error?.message || error.message || `An error occurred with the ${entityName}. Please try again.`;
    return throwError(() => new Error(message));
  }

  // --- Fiscal Year Methods ---
  getFiscalYearsByAccount(accountId: number): Observable<FiscalYearResponseDTO[]> {
    const params = new HttpParams().set('accountId', accountId.toString());
    return this.http.get<FiscalYearResponseDTO[]>(`${this.apiUrl}/fiscal-years`, { params })
      .pipe(catchError(err => this.handleError(err, 'fiscal years fetch')));
  }

  createFiscalYear(dto: FiscalYearRequestDTO): Observable<FiscalYearResponseDTO> {
    return this.http.post<FiscalYearResponseDTO>(`${this.apiUrl}/fiscal-years`, dto)
      .pipe(catchError(err => this.handleError(err, 'fiscal year creation')));
  }

  updateFiscalYear(id: number, dto: FiscalYearRequestDTO): Observable<FiscalYearResponseDTO> {
    return this.http.put<FiscalYearResponseDTO>(`${this.apiUrl}/fiscal-years/${id}`, dto)
      .pipe(catchError(err => this.handleError(err, 'fiscal year update')));
  }

  deleteFiscalYear(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/fiscal-years/${id}`)
      .pipe(catchError(err => this.handleError(err, 'fiscal year deletion')));
  }

  closeFiscalYear(id: number): Observable<FiscalYearResponseDTO> {
    return this.http.patch<FiscalYearResponseDTO>(`${this.apiUrl}/fiscal-years/${id}/close`, {})
      .pipe(catchError(err => this.handleError(err, 'closing fiscal year')));
  }

  openFiscalYear(id: number): Observable<FiscalYearResponseDTO> {
    return this.http.patch<FiscalYearResponseDTO>(`${this.apiUrl}/fiscal-years/${id}/open`, {})
      .pipe(catchError(err => this.handleError(err, 'opening fiscal year')));
  }

  // --- Fiscal Period Methods ---
  getFiscalPeriodsByYear(fiscalYearId: number): Observable<FiscalPeriodResponseDTO[]> {
    const params = new HttpParams().set('fiscalYearId', fiscalYearId.toString());
    return this.http.get<FiscalPeriodResponseDTO[]>(`${this.apiUrl}/fiscal-periods`, { params })
      .pipe(catchError(err => this.handleError(err, 'fiscal periods fetch')));
  }

  createFiscalPeriod(dto: FiscalPeriodRequestDTO): Observable<FiscalPeriodResponseDTO> {
    return this.http.post<FiscalPeriodResponseDTO>(`${this.apiUrl}/fiscal-periods`, dto)
      .pipe(catchError(err => this.handleError(err, 'fiscal period creation')));
  }

  updateFiscalPeriod(id: number, dto: FiscalPeriodRequestDTO): Observable<FiscalPeriodResponseDTO> {
    return this.http.put<FiscalPeriodResponseDTO>(`${this.apiUrl}/fiscal-periods/${id}`, dto)
      .pipe(catchError(err => this.handleError(err, 'fiscal period update')));
  }

  deleteFiscalPeriod(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/fiscal-periods/${id}`)
      .pipe(catchError(err => this.handleError(err, 'fiscal period deletion')));
  }

  closeFiscalPeriod(id: number): Observable<FiscalPeriodResponseDTO> {
    return this.http.patch<FiscalPeriodResponseDTO>(`${this.apiUrl}/fiscal-periods/${id}/close`, {})
      .pipe(catchError(err => this.handleError(err, 'closing fiscal period')));
  }

  openFiscalPeriod(id: number): Observable<FiscalPeriodResponseDTO> {
    return this.http.patch<FiscalPeriodResponseDTO>(`${this.apiUrl}/fiscal-periods/${id}/open`, {})
      .pipe(catchError(err => this.handleError(err, 'opening fiscal period')));
  }
}