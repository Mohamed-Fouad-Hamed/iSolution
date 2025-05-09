// src/app/features/financial-account/financial-account-type.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { FinancialAccountType } from '../../models/financial-account.model';
import { environment } from '../../../environments/environment'; // Adjust path

@Injectable({
  providedIn: 'root',
})
export class FinancialAccountTypeService {
  private http = inject(HttpClient);
  // Adjust endpoint as needed. This might be a general lookup endpoint.
  private typesUrl = `${environment.apiUrl}/api/v1/lookups/financial-account-types`;

  // Cache the types to avoid repeated calls
  private accountTypes$?: Observable<FinancialAccountType[]>;

  getAccountTypes(): Observable<FinancialAccountType[]> {
    if (!this.accountTypes$) {
      this.accountTypes$ = this.http.get<FinancialAccountType[]>(this.typesUrl).pipe(
        shareReplay(1), // Cache the result and replay for subsequent subscribers
        catchError(err => {
          console.error("Failed to load financial account types", err);
          return of([]); // Return empty array on error
        })
      );
    }
    return this.accountTypes$;
  }
}