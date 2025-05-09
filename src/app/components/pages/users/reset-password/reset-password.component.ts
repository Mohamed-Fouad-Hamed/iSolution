import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil, tap, take } from 'rxjs/operators';

// Adjust path to your actual service
import { AuthService } from '../../../../core/services/auth.service';
import { ReactiveFormsModule,FormBuilder, FormGroup, Validators, ValidationErrors, ValidatorFn, AbstractControl } from '@angular/forms'; // Import form validation types
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { passwordsMatchValidator } from '../../../../core/directives/Validator/passwordsMatchValidator';
import { INewPassword } from '../../../../models/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule,
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
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent implements OnInit, OnDestroy {

  // --- Injected Dependencies ---
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private cdRef = inject(ChangeDetectorRef); // Inject ChangeDetectorRef

  // --- Component State ---
  resetPasswordForm!: FormGroup; // Definite assignment in ngOnInit
  isLoading = false;
  errorMessage: string | null = null;
  resetToken: string | null = null;
  hidePassword = true;
  hideConfirmPassword = true;

  private destroy$ = new Subject<void>(); // For unsubscribing observables

  // --- Lifecycle Hooks ---
  ngOnInit(): void {
   // this.resetToken = this.route.snapshot.paramMap.get('token'); // Get token from route
   this.resetToken = this.route.snapshot.paramMap.get('id');
    if (!this.resetToken) {
      this.handleCriticalError('resetPassword.errorTokenMissing');
      // Optionally redirect immediately
      // this.router.navigate(['/login']);
      return; // Stop initialization
    }
    console.log('Reset Token:', this.resetToken); // For debugging
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Form Initialization ---
  private initializeForm(): void {
    this.resetPasswordForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8), // Enforce minimum length
        // Add pattern for complexity if needed (e.g., uppercase, number, special char)
        // Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, {
      // Add the custom validator to the FormGroup level
      validators: passwordsMatchValidator('password', 'confirmPassword')
    });
  }

  // --- Template Accessors ---
  get passwordControl() { return this.resetPasswordForm.get('password'); }
  get confirmPasswordControl() { return this.resetPasswordForm.get('confirmPassword'); }

  // --- Event Handlers ---
  onSubmit(): void {
    if (this.resetPasswordForm.invalid || !this.resetToken) {
      this.resetPasswordForm.markAllAsTouched(); // Show validation errors
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const newPassword = this.passwordControl?.value;
    const iNewPassword:INewPassword = {login:this.resetToken,password:newPassword};
    

    this.authService.updatePassword(iNewPassword) // Use your actual service method
      .pipe(
        take(1), // Process only the first emission/response
        tap({ // Use tap for side-effects
          next: () => this.handleSuccess(),
          error: (err) => this.handleError(err)
        }),
        finalize(() => { // Always runs on completion or error
          this.isLoading = false;
          this.cdRef.markForCheck(); // Trigger change detection
        }),
        takeUntil(this.destroy$) // Auto-unsubscribe
      )
      .subscribe(); // Subscribe to trigger the stream
  }

  // --- Private Helper Methods ---
  private handleSuccess(): void {
    console.log('Password Reset Success');
    this.showSnackbar('resetPassword.successMessage', 'success-snackbar');
    // Navigate to login page after a short delay
    setTimeout(() => this.router.navigate(['/login']), 2000); // Adjust delay/route as needed
  }

  private handleError(err: any): void {
    console.error('Password Reset Error:', err);
    // Check for specific error types if provided by the backend (e.g., invalid token)
    if (err?.status === 400 && err?.error?.code === 'INVALID_TOKEN') { // Example structure
       this.errorMessage = this.translate.instant('resetPassword.errorTokenInvalid');
    } else {
       this.errorMessage = err?.error?.message || this.translate.instant('resetPassword.errorGeneric');
    }
    this.showSnackbar(this.errorMessage || '', 'error-snackbar', false); // Show error message
    // No need to set isLoading = false here; finalize handles it.
  }

  private handleCriticalError(messageKey: string): void {
     console.error('Reset Password Critical Error:', messageKey);
     this.errorMessage = this.translate.instant(messageKey);
     this.showSnackbar(this.errorMessage || '', 'error-snackbar', false);
     // Optionally disable the form or provide guidance
     if(this.resetPasswordForm) {
        this.resetPasswordForm.disable();
     }
     this.cdRef.markForCheck();
  }

  private showSnackbar(messageKeyOrText: string, panelClass: string = '', isKey = true): void {
    const message = isKey ? this.translate.instant(messageKeyOrText) : messageKeyOrText;
    this.snackBar.open(message, this.translate.instant('common.close'), {
      duration: 5000,
      panelClass: [panelClass],
      verticalPosition: 'top'
    });
  }
}
