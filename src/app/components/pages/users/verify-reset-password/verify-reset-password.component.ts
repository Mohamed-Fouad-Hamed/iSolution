import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon'; // Optional
import { MatDividerModule } from '@angular/material/divider'; // Optional
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { finalize, map, Subject, Subscription, take, takeUntil, tap, timer } from 'rxjs';
import { ILogin, IVerifyOTP } from '../../../../models/auth';

@Component({
  selector: 'app-verify-reset-password',
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
    RouterModule],
  templateUrl: './verify-reset-password.component.html',
  styleUrl: './verify-reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush 
})
export class VerifyResetPasswordComponent {

  
  // --- Injected Dependencies ---
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private cdRef = inject(ChangeDetectorRef); // Inject ChangeDetectorRef

   // --- Component State ---
   otpForm!: FormGroup; // Definite assignment in ngOnInit
   isLoading = false;
   isResending = false;
   errorMessage: string | null = null;
   userIdentifier: string | null = null;
 
   // --- Resend Logic State ---
   resendDisabled = false;
   resendCooldownSeconds = 60; // Cooldown period in seconds
   private resendTimerSubscription: Subscription | null = null;
   private destroy$ = new Subject<void>(); // For unsubscribing observables
 
   // --- Constants ---
   readonly OTP_LENGTH = 6; // Define OTP length

     // --- Lifecycle Hooks ---
  ngOnInit(): void {
    this.userIdentifier = this.route.snapshot.paramMap.get('identifier');

    if (!this.userIdentifier) {
      this.handleCriticalError('verifyOtp.errorIdentifierMissing');
      return; // Stop initialization if identifier is missing
    }

    this.initializeForm();
    this.startResendCooldown(); // Start cooldown initially
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearResendTimer(); // Ensure timer subscription is cleaned up
  }

  // --- Form Initialization ---
  private initializeForm(): void {
    this.otpForm = this.fb.group({
      otp: ['', [
        Validators.required,
        Validators.minLength(this.OTP_LENGTH),
        Validators.maxLength(this.OTP_LENGTH),
        Validators.pattern(`^[0-9]{${this.OTP_LENGTH}}$`) // Only digits
      ]]
    });
  }

  // --- Template Accessors ---
  get otpControl() {
    return this.otpForm.get('otp');
  }

  // --- Event Handlers ---
  onSubmit(): void {
    if (this.otpForm.invalid || !this.userIdentifier) {
      this.otpForm.markAllAsTouched(); // Show validation errors
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const otpValue = this.otpControl?.value;
    const iVerify :IVerifyOTP = {login:this.userIdentifier , otp:otpValue};
    this.authService.verifyOTP(iVerify)
      .pipe(
        take(1), // Process only the first emission
        tap({ // Use tap for side-effects without altering the stream for finalize
          next: (response) => this.handleVerificationSuccess(response),
          error: (err) => this.handleVerificationError(err)
        }),
        finalize(() => { // Always runs on completion or error
          this.isLoading = false;
          this.cdRef.markForCheck(); // Trigger change detection when loading finishes
        }),
        takeUntil(this.destroy$) // Auto-unsubscribe
      )
      .subscribe(); // Subscribe to trigger the stream
  }

  onResendOtp(): void {
    
    if (!this.userIdentifier || this.isResending || this.resendDisabled) {
      return; // Prevent multiple clicks or resend during cooldown
    }

    this.isResending = true;
    this.errorMessage = null; // Clear previous errors
    let identifier: ILogin = {login:this.userIdentifier};

    this.authService.newOTP( identifier  ).pipe(
        take(1),
        tap({
          next: () => this.handleResendSuccess(),
          error: (err) => this.handleResendError(err)
        }),
        finalize(() => {
          this.isResending = false;
          this.cdRef.markForCheck();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
  // --- Private Helper Methods ---
  private handleVerificationSuccess(response: any): void {
    // Add logic based on your API response structure if needed
    console.log('OTP Verification Success:', response);
    this.showSnackbar('verifyOtp.successMessage', 'success-snackbar');
    // Navigate to the next step (e.g., login or dashboard)
    this.router.navigate([`/reset-password/${this.userIdentifier}`]); // Adjust target route
  }

  private handleVerificationError(err: any): void {
    console.error('OTP Verification Error:', err);
    // Extract a user-friendly message from the error object
    this.errorMessage = err?.error?.message || this.translate.instant('verifyOtp.errorInvalidOrExpired');
    this.showSnackbar(this.errorMessage || '', 'error-snackbar');
    this.otpControl?.reset(); // Clear the invalid OTP input
    // No need to set isLoading = false here; finalize handles it.
  }

  private handleResendSuccess(): void {
     this.showSnackbar('verifyOtp.resendSuccess', 'info-snackbar');
     this.startResendCooldown(); // Restart cooldown after successful resend
  }

  private handleResendError(err: any): void {
    console.error('Resend OTP Error:', err);
    const message = err?.error?.message || this.translate.instant('verifyOtp.errorResendFailed');
    this.showSnackbar(message, 'error-snackbar');
    // No need to set isResending = false here; finalize handles it.
  }

  private handleCriticalError(messageKey: string): void {
    console.error('OTP Verification Critical Error:', messageKey);
    this.errorMessage = this.translate.instant(messageKey);
    this.showSnackbar(this.errorMessage || '', 'error-snackbar');
    // Optionally navigate away if identifier is missing
    // this.router.navigate(['/error-page']); // Or back to login
  }

  private startResendCooldown(): void {
    this.clearResendTimer(); // Clear any existing timer first
    this.resendDisabled = true;
    let remainingSeconds = 60; // Reset countdown duration
    this.resendCooldownSeconds = remainingSeconds; // Update initial display
    this.cdRef.markForCheck(); // Update view for initial cooldown state

    this.resendTimerSubscription = timer(0, 1000) // Emit every second
      .pipe(
        take(remainingSeconds + 1), // Take emissions for the duration + 1 (for 0)
        map(tick => remainingSeconds - tick), // Calculate remaining seconds
        takeUntil(this.destroy$) // Stop when component is destroyed or timer finishes
      )
      .subscribe(secondsLeft => {
        this.resendCooldownSeconds = secondsLeft;
        if (secondsLeft <= 0) {
          this.resendDisabled = false;
          this.clearResendTimer(); // Ensure timer is cleared when done
        }
        this.cdRef.markForCheck(); // Update timer display
      });
  }

  private clearResendTimer(): void {
    if (this.resendTimerSubscription) {
      this.resendTimerSubscription.unsubscribe();
      this.resendTimerSubscription = null;
    }
  }

  private showSnackbar(messageKeyOrText: string, panelClass: string = '', isKey = true): void {
    const message = isKey ? this.translate.instant(messageKeyOrText) : messageKeyOrText;
    this.snackBar.open(message, this.translate.instant('common.close'), {
      duration: 5000,
      panelClass: [panelClass], // e.g., ['success-snackbar'] or ['error-snackbar']
      verticalPosition: 'top' // Or 'bottom'
    });
  }
  
}
