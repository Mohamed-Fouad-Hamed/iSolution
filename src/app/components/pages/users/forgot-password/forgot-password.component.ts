import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon'; // Optional for input prefix/suffix
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router'; // Inject Router if needed for navigation
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil, tap, take } from 'rxjs/operators';

// Adjust path to your actual service
import { AuthService } from '../../../../core/services/auth.service';
import { IUniqueLogin } from '../../../../models/auth';
import { emailOrPhoneValidator } from '../../../../core/directives/Validator/emailorphonevalidator';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    MatDividerModule,
    TranslateModule,
    CommonModule,
    RouterModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush 
})
export class ForgotPasswordComponent {

   // --- Injected Dependencies ---
   private fb = inject(FormBuilder);
   private router = inject(Router); // Inject if needed for navigation
   private authService = inject(AuthService);
   private snackBar = inject(MatSnackBar);
   private translate = inject(TranslateService);
   private cdRef = inject(ChangeDetectorRef); // Inject ChangeDetectorRef
 
   // --- Component State ---
   forgotPasswordForm!: FormGroup; // Definite assignment in ngOnInit
   isLoading = false;
   errorMessage: string | null = null;
   // Success message typically handled via Snackbar for this flow
 
   private destroy$ = new Subject<void>(); // For unsubscribing observables
 
   // --- Lifecycle Hooks ---
   ngOnInit(): void {
     this.initializeForm();
   }
 
   ngOnDestroy(): void {
     this.destroy$.next();
     this.destroy$.complete();
   }
 
   // --- Form Initialization ---
   private initializeForm(): void {
     this.forgotPasswordForm = this.fb.group({
       // Assuming email is the identifier, adjust if username/phone allowed
       identifier: ['', [Validators.required,  emailOrPhoneValidator(7) ]]
     });
   }
 
   // --- Template Accessors ---
   get identifierControl() {
    return this.forgotPasswordForm.get('identifier');
  }
 
   // --- Event Handlers ---
   onSubmit(): void {
     if (this.forgotPasswordForm.invalid) {
       this.forgotPasswordForm.markAllAsTouched(); // Show validation errors
       return;
     }
 
     this.isLoading = true;
     this.errorMessage = null;
     const identifier :IUniqueLogin = { id : this.identifierControl?.value };

 
     this.authService.forgetPassword(identifier) 
       .pipe(
         take(1),
         tap({ 
           next: () => this.handleSuccess(),
           error: (err) => this.handleError(err)
         }),
         finalize(() => { // Always runs on completion or error
           this.isLoading = false;
           this.cdRef.markForCheck(); // Trigger change detection when loading finishes
         }),
         takeUntil(this.destroy$) // Auto-unsubscribe
       )
       .subscribe(); // Subscribe to trigger the stream
   }
 
   // --- Private Helper Methods ---
 
   // IMPORTANT: Keep success message generic for security
   private handleSuccess(): void {
     console.log('Password Reset Request Success (Generic)');
     this.showSnackbar('forgotPassword.successMessageGeneric', 'success-snackbar');
     this.router.navigate([`${'/verfiy-reset-password-otp/' + this.identifierControl?.value }`]); 
     // Optionally reset the form or navigate away
     // this.forgotPasswordForm.reset();
     // this.router.navigate(['/login']); // Example navigation
   }
 
   private handleError(err: any): void {
     console.error('Password Reset Request Error:', err);
     // IMPORTANT: Decide if you want to show specific errors or a generic one
     // Option 1: Generic Error (More Secure - Recommended)
     this.errorMessage = this.translate.instant('forgotPassword.errorGeneric');
     // Option 2: Potentially Specific Error (Less Secure)
     // this.errorMessage = err?.error?.message || this.translate.instant('forgotPassword.errorGeneric');
 
     this.showSnackbar(this.errorMessage || '', 'error-snackbar', false); // Show error in snackbar too
     // No need to set isLoading = false here; finalize handles it.
   }
 
   private showSnackbar(messageKeyOrText: string, panelClass: string = '', isKey = true): void {
     const message = isKey ? this.translate.instant(messageKeyOrText) : messageKeyOrText;
     this.snackBar.open(message, this.translate.instant('common.close'), {
       duration: 7000, // Longer duration might be suitable here
       panelClass: [panelClass],
       verticalPosition: 'top'
     });
   }

}
