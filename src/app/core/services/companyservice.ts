import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Company } from '../../models/company';
import { environment } from '../../../environments/environment'; // Import environment

@Injectable({
  providedIn: 'root' // Provided globally, or in a specific feature module
})
export class CompanyService {
  // Use environment variable for the API URL
  private apiUrl = `${environment.apiUrl}/api/v1/companies`; // Adjust if your base URL differs

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  // GET all companies
  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(this.apiUrl)
      .pipe(
        tap(data => console.log('Fetched companies:', data)), // For debugging
        catchError(this.handleError)
      );
  }

  // GET company by ID
  getCompanyById(id: number): Observable<Company> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Company>(url)
      .pipe(
        tap(data => console.log(`Fetched company id=${id}:`, data)),
        catchError(this.handleError)
      );
  }

   // GET company by ID
   getCompanyBySerialId(id: string): Observable<Company> {
    const url = `${this.apiUrl}/by-serial-id/${id}`;
    return this.http.get<Company>(url)
      .pipe(
        tap(data => console.log(`Fetched company id=${id}:`, data)),
        catchError(this.handleError)
      );
  }

  // POST: add a new company
  createCompany(company: Company): Observable<Company> {
    return this.http.post<Company>(this.apiUrl, company, this.httpOptions)
      .pipe(
        tap((newCompany: Company) => console.log(`Added company w/ id=${newCompany.serialId}`)),
        catchError(this.handleError)
      );
  }

  // PUT: update the company
  updateCompany(id: string, company: Company): Observable<Company> {
    const url = `${this.apiUrl}/${id}`;
    // Ensure ID is not part of the body payload if backend expects it only in URL
    // Or ensure the backend handles the ID in the body correctly (Spring often does)
    return this.http.put<Company>(url, company, this.httpOptions)
      .pipe(
        tap(_ => console.log(`Updated company id=${id}`)),
        catchError(this.handleError)
      );
  }

  // DELETE: delete the company
  deleteCompany(id: string): Observable<unknown> { // Backend returns 204 No Content (void)
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete(url, this.httpOptions)
      .pipe(
        tap(_ => console.log(`Deleted company id=${id}`)),
        catchError(this.handleError)
      );
  }

  // Basic Error Handling
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      // The response body may contain clues as to what went wrong
       errorMessage = `Backend returned code ${error.status}, body was: ${JSON.stringify(error.error) || error.message }`;
        // Customize based on your backend's error structure
        if (error.status === 404) {
             errorMessage = `Resource not found. ${error.error?.message || ''}`;
        } else if (error.status === 400) {
             errorMessage = `Bad Request. ${error.error?.message || JSON.stringify(error.error) || ''}`; // E.g. validation errors
        } else if (error.status === 409) {
             errorMessage = `Conflict. ${error.error?.message || 'Possible duplicate data.'}`; // E.g. unique constraint
        }
    }
    console.error(errorMessage);
    // Return an observable with a user-facing error message
    return throwError(() => new Error(errorMessage));
  }
}