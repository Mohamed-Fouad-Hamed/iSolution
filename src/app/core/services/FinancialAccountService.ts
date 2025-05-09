// src/app/features/financial-account/financial-account.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

import { environment } from '../../../environments/environment'; // Adjust path if needed
import {
  FinancialAccount,
  FinancialAccountCreatePayload,
  FinancialAccountUpdatePayload
} from '../../models/financial-account.model'; // Adjust path if needed

@Injectable({
  providedIn: 'root', // Singleton service available application-wide
})
export class FinancialAccountService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl; // e.g., /api/v1
 
  // Define standard HTTP options for requests with JSON body
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  /**
   * Constructs the base URL for financial accounts within a specific parent Account.
   * @param accountId - The ID of the parent Account.
   * @returns The base URL string.
   */
  private getFinancialAccountsUrl(accountId: number): string {
    // Defensive check for accountId although it should always be provided
    if (accountId === null || typeof accountId === 'undefined') {
        console.error("FinancialAccountService: Invalid accountId provided.");
        // Or throw an error appropriate for your application flow
        return `${this.baseUrl}/api/v1/accounts/INVALID_ID/financial-accounts`;
    }
    return `${this.baseUrl}/api/v1/accounts/${accountId}/financial-accounts`;
  
  }

  /**
   * Retrieves financial accounts for a specific parent Account.
   * Can optionally filter for active accounts only.
   * Corresponds to: GET /api/v1/accounts/{accountId}/financial-accounts
   * @param accountId - The ID of the parent Account.
   * @param activeOnly - If true, fetches only active accounts.
   * @returns An Observable array of FinancialAccount objects.
   */
  getFinancialAccountsByAccount(accountId: number, activeOnly: boolean = false): Observable<FinancialAccount[]> {
    const url = this.getFinancialAccountsUrl(accountId);
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('activeOnly', 'true');
    }

    return this.http.get<FinancialAccount[]>(url, { params }).pipe(
      retry(1), // Retry once on transient network errors
      catchError(this.handleError) // Centralized error handling
    );
  }

  /**
   * Retrieves a specific financial account by its ID, scoped by the parent Account ID.
   * Corresponds to: GET /api/v1/accounts/{accountId}/financial-accounts/{financialAccountId}
   * @param accountId - The ID of the parent Account.
   * @param financialAccountId - The ID of the financial account to retrieve.
   * @returns An Observable of the FinancialAccount object.
   */
  getFinancialAccountById(accountId: number, financialAccountId: number): Observable<FinancialAccount> {
    const url = `${this.getFinancialAccountsUrl(accountId)}/${financialAccountId}`;
    return this.http.get<FinancialAccount>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Creates a new financial account under the specified parent Account.
   * Corresponds to: POST /api/v1/accounts/{accountId}/financial-accounts
   * @param accountId - The ID of the parent Account.
   * @param payload - The data for the new financial account.
   * @returns An Observable of the newly created FinancialAccount object.
   */
  createFinancialAccount(accountId: number, payload: FinancialAccountCreatePayload): Observable<FinancialAccount> {
    const url = this.getFinancialAccountsUrl(accountId);
    // Backend derives accountId from path, no need to include in payload unless API requires it differently.
    return this.http.post<FinancialAccount>(url, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Updates an existing financial account.
   * Corresponds to: PUT /api/v1/accounts/{accountId}/financial-accounts/{financialAccountId}
   * @param accountId - The ID of the parent Account.
   * @param financialAccountId - The ID of the financial account to update.
   * @param payload - The updated data for the financial account.
   * @returns An Observable of the updated FinancialAccount object.
   */
  updateFinancialAccount(accountId: number, financialAccountId: number, payload: FinancialAccountUpdatePayload): Observable<FinancialAccount> {
    const url = `${this.getFinancialAccountsUrl(accountId)}/${financialAccountId}`;
    // Payload should only contain fields that are actually updatable via the API
    return this.http.put<FinancialAccount>(url, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Deletes (soft deletes) a financial account.
   * Corresponds to: DELETE /api/v1/accounts/{accountId}/financial-accounts/{financialAccountId}
   * @param accountId - The ID of the parent Account.
   * @param financialAccountId - The ID of the financial account to delete.
   * @returns An Observable<void> indicating completion.
   */
  deleteFinancialAccount(accountId: number, financialAccountId: number): Observable<void> {
    const url = `${this.getFinancialAccountsUrl(accountId)}/${financialAccountId}`;
    return this.http.delete<void>(url).pipe(
      catchError(this.handleError)
    );
  }

   /**
   * Retrieves direct child financial accounts based on the parent's serial ID.
   * Corresponds to: GET /api/v1/accounts/{accountId}/financial-accounts/by-parent-serial/{parentSerialId}
   * @param accountId - The ID of the parent Account.
   * @param parentSerialId - The serial ID of the parent financial account.
   * @returns An Observable array of child FinancialAccount objects.
   */
  getDirectChildFinancialAccounts(accountId: number, parentSerialId: string): Observable<FinancialAccount[]> {
    const url = `${this.getFinancialAccountsUrl(accountId)}/by-parent-serial/${parentSerialId}`;
    return this.http.get<FinancialAccount[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Retrieves root financial accounts (those without a parent) for the specified Account.
   * Corresponds to: GET /api/v1/accounts/{accountId}/financial-accounts/roots
   * @param accountId - The ID of the parent Account.
   * @returns An Observable array of root FinancialAccount objects.
   */
  getRootFinancialAccounts(accountId: number): Observable<FinancialAccount[]> {
    const url = `${this.getFinancialAccountsUrl(accountId)}/roots`;
    return this.http.get<FinancialAccount[]>(url).pipe(
      catchError(this.handleError)
    );
  }


  /**
   * Centralized error handler for HTTP requests.
   * @param error - The HttpErrorResponse object.
   * @returns An Observable that throws a user-friendly error message.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userFriendlyErrorMessage = 'An unknown error occurred. Please try again later.';

    // Log the detailed error for developers
    console.error(`Backend returned code ${error.status}, body was: `, error.error, 'Full error:', error);

    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      userFriendlyErrorMessage = `Network error: ${error.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.

      // Try to extract specific message from backend response
      const backendError = error.error;
      let backendMessage: string | null = null;

      if (backendError) {
        if (typeof backendError.message === 'string') {
          backendMessage = backendError.message;
        } else if (typeof backendError.error === 'string') { // Sometimes the message is nested under 'error'
          backendMessage = backendError.error;
        } else if (typeof backendError === 'string' && backendError.length < 200) { // Simple string error
          backendMessage = backendError;
        }
      }

      // Map common HTTP status codes to generic user messages
      switch (error.status) {
        case 400: // Bad Request
          userFriendlyErrorMessage = backendMessage || 'Invalid data provided. Please check your input.';
          // Consider parsing validation errors if backend provides them structured
          break;
        case 401: // Unauthorized
          userFriendlyErrorMessage = 'Authentication failed. Please log in again.';
          // Trigger re-authentication flow if applicable
          break;
        case 403: // Forbidden
          userFriendlyErrorMessage = "You don't have permission to perform this action.";
          break;
        case 404: // Not Found
          userFriendlyErrorMessage = backendMessage || 'The requested resource could not be found.';
          break;
        case 409: // Conflict
          userFriendlyErrorMessage = backendMessage || 'A conflict occurred. The data might already exist or violate a rule.';
          break;
        case 500: // Internal Server Error
          userFriendlyErrorMessage = backendMessage || 'An unexpected error occurred on the server. Please try again later.';
          break;
        default:
          userFriendlyErrorMessage = backendMessage || `An error occurred (Status: ${error.status}). Please try again.`;
      }
    }

    // Return an observable with a user-facing error message.
    return throwError(() => new Error(userFriendlyErrorMessage));
  }
}