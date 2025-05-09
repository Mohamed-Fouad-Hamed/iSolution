import {  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Optional: For displaying global errors
import { FormsModule, NgForm, NgModel } from '@angular/forms'; // Still needed for ngModel, ngForm
import { TranslateModule } from '@ngx-translate/core'
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { IAccountSignup } from '../../../../models/auth';
import { Language, LANGUAGES } from '../../../../models/basices';
import { IsUniqueValidatorDirective } from '../../../../core/directives/AsyncIsUniqueDirective';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [    
    CommonModule, // Ensure CommonModule is imported for *ngIf, *ngFor etc.
    FormsModule,
    TranslateModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDivider,
    MatSnackBarModule,
    IsUniqueValidatorDirective
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit , AfterViewInit,OnDestroy {

  private cdRef = inject(ChangeDetectorRef);

  // Keep ViewChild for the form itself
  @ViewChild('registerForm') public registerFrm!: NgForm;
  // --- Add ViewChild for the login NgModel ---
  @ViewChild('login') loginModel!: NgModel; // Use the #login template ref variable

  // --- Subject for unsubscribing ---
  private destroy$ = new Subject<void>();

  // Keep using inject or constructor injection
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar); // Optional for error display

  isLoading : boolean = false ;
  
  error: string | null = null; // Use null for no error, string for error message
  
  hide = true;

  appLanguages: Language[] = [];


  signUp:IAccountSignup = { 
    account_type: 0,
    account_name:'',
    firstName:'',
    lastName:'',
    email:'',
    login:'',
    password:'',
    s_cut:'',
    phone:''
};

  // No constructor needed if using inject

  ngOnInit() {
    this.appLanguages = LANGUAGES;
  }

    // --- Implement AfterViewInit ---
    ngAfterViewInit(): void {
      // Check if loginModel is available (it should be after view init)
      if (this.loginModel?.statusChanges) {
        this.loginModel.statusChanges
          .pipe(
            takeUntil(this.destroy$),
            distinctUntilChanged() // Only react if status actually changes
          )
          .subscribe(status => {
            console.log(`Login NgModel Status Changed: ${status}`); // For debugging
            // Trigger change detection manually when the status is resolved (no longer PENDING)
            if (status !== 'PENDING') {
              this.cdRef.detectChanges(); // <--- THE FIX
            }
          });
      } else {
        console.warn('RegisterComponent: Could not find login NgModel reference.');
      }
    }
  
    // --- Implement OnDestroy ---
    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }


  async onSubmit() {
    if (!this.registerFrm || this.registerFrm.invalid) {
      // Mark all fields as touched to show errors if user clicks submit early
      this.registerFrm?.form.markAllAsTouched();
      this.showErrorSnackbar('Please fill all required fields correctly.'); // Optional user feedback
      return;
    }

    this.isLoading = true;
    this.error = null; // Clear previous errors

    // The form value already contains all ngModel bindings
    const formData: IAccountSignup = { ...this.registerFrm.value } ; // Ensure accountId is included
    formData.account_type = 1 ;
    formData.account_name = formData.firstName + ' ' + formData.lastName;


    try {
      // No need to setValue, registerForm.value contains the data
      console.log('Submitting:', formData);

      // Assuming userRegister returns an Observable
      this.authService.accountRegister(formData).subscribe({
        next: (res) => {
          console.log('Registration Response:', res);
          if (res.status === 200) { // Or check based on your actual API response structure
            this.router.navigate([`/verfiy-otp/${formData.login}`]); // Navigate on success
          } else {
            // Handle non-200 success responses if applicable
            this.handleApiError(res.message || 'Registration failed with status ' + res.status);
          }
          // No need for setInterval for isLoading, handle in finally or next/error
        },
        error: (err) => {
          console.error('Registration Error:', err);
          this.handleApiError(err.message || 'An unexpected error occurred during registration.');
          this.isLoading = false; // Stop loading on error
          this.cdRef.detectChanges(); 
        },
        complete: () => {
           // Optional: Can also set isLoading = false here if not done in next/error
           // Be cautious if the observable completes *before* async operations inside next/error finish
           // Setting it in finally or next/error is usually safer.
            this.isLoading = false; // Stop loading on completion (success or handled error)
            this.cdRef.detectChanges(); 
        }
      });

    } catch (e: any) {
      // Catch synchronous errors if any part of the setup throws
       this.handleApiError(e.message || 'An unexpected client-side error occurred.');
       this.isLoading = false;
       this.cdRef.detectChanges(); 
    }
    // Removed the setInterval for isLoading, handle it in subscribe's error/complete/finally
  }

  onReset(): void {
    this.registerFrm.resetForm(); // Resets form state and values
    this.signUp = { account_type : 0, account_name:'', firstName: '', lastName: '', email: '', login: '', password: '', s_cut: '', phone: '' }; // Reset component model
    this.error = null; // Clear errors
    this.hide = true; // Reset password visibility
  }

  // Helper to handle displaying errors
  private handleApiError(errorMessage: string) {
    this.error = errorMessage; // Set error message for potential display in the template
    this.showErrorSnackbar(errorMessage); // Show snackbar notification
    this.isLoading = false;
  }

  // Optional: Show snackbar for feedback
  private showErrorSnackbar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000, // 5 seconds
      panelClass: ['error-snackbar'] // Add custom class for styling if needed
    });
  }
}
