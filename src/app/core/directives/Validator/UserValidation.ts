import { inject, Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, AsyncValidator, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { catchError, first, map, switchMap  } from 'rxjs/operators';
import { APIService } from '../../services/api.service';



@Injectable({
  providedIn: 'root'
})
export class UserValidators implements AsyncValidator {
  private zone = inject(NgZone);
  private http = inject(HttpClient); // Inject HttpClient directly
  private apiService = inject(APIService); // Inject APIService
  private debounceTimeMs = 500;

  // No need for constructor if using inject() for all dependencies

  // searchUser is now integrated into validate, making it slightly cleaner unless reused elsewhere
  // searchUser(text: string): Observable<any> { ... }

  validate(control: AbstractControl): Observable<ValidationErrors | null> {
      const loginValue = control.value;

      // 1. Debounce
      return timer(this.debounceTimeMs).pipe(
          switchMap(() => {
              // 2. Don't validate empty or unchanged values (optional but good practice)
              if (!loginValue) {
                  return of(null);
              }

              // 3. Construct URL (Ensure 'id' is the correct query param name for login/username)
              const URL = `${this.apiService.apiHost}/display-name`; // Check endpoint name
              const params = { id: loginValue }; // Check query parameter name

              // 4. Make the HTTP Call (Define expected response type if possible instead of any)
              return this.http.get<any>(URL, { params }).pipe(
                  // 5. Map successful response
                  map(response => {
                      // --- ADJUST THIS LOGIC based on your actual API response ---
                      // Example 1: API returns object/data if user exists, or 200 OK with empty/null body if not
                      const isTaken = !!response; // Or response !== null, or response.length > 0 if it's an array
                      // Example 2: API returns { exists: true } or { exists: false }
                      // const isTaken = response?.exists === true;

                      // --- Run result mapping in zone ---
                      return this.zone.run(() => (isTaken ? { notUnique: true } : null));
                  }),
                  // 6. Handle Errors (specifically check for 404 if it means 'available')
                  catchError((error: unknown) => { // Use unknown type
                      // --- Run error handling in zone ---
                       return this.zone.run(() => {
                          if (error instanceof HttpErrorResponse && error.status === 404) {
                              // 404 usually means "Not Found", hence the login is available (valid)
                              return of(null);
                          } else {
                              // For other errors (500, network issues), decide behaviour:
                              console.error('Uniqueness check failed:', error);
                              // Option A: Treat as valid (allows form submission despite check error)
                              return of(null);
                              // Option B: Treat as invalid (blocks form submission)
                              // return of({ uniquenessCheckFailed: true });
                          }
                       });
                  }),
                  // 7. Ensure observable completes
                  first()
              );
          })
      );
  }

  // This method is part of the Validator interface, but often not needed
  // for simple validators. Throwing an error is technically correct if not used.
  registerOnValidatorChange?(fn: () => void): void {
      // If your validator's behavior could change based on external factors
      // AFTER it's been initially assigned to a control, you'd implement
      // this to call fn() when such a change occurs, prompting re-validation.
      // For a simple API check, it's usually not required.
      // console.warn('registerOnValidatorChange not implemented in UserValidators');
  }
}