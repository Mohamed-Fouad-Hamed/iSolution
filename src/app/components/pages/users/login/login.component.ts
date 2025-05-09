import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule if not in standalone component imports
import { Router, RouterLink } from '@angular/router'; // Import RouterLink
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service'; // Make sure path is correct

// Import Angular Material Modules needed for the template
// (If using standalone component, add these to imports array)
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox'; // <-- Import Checkbox Module
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common'; // For *ngIf

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true, // Assuming standalone, adjust if using modules
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink, // <-- Add RouterLink
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule, // <-- Add MatCheckboxModule
    MatProgressSpinnerModule,
    TranslateModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'] // Add component-specific styles if needed
})
export class LoginComponent {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // --- State Signals ---
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  hidePassword = signal(true);

  // --- Form Definition ---
  usernamePattern = /^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(?:[+\-()0-9\s]{7,15})$/;

  loginForm = this.fb.group({
    login: ['', [Validators.required, Validators.pattern(this.usernamePattern)]],
    password: ['', [Validators.required]],
    rememberMe: [false] // <-- Add rememberMe control, default to false
  });

  // --- Getters for template access (optional but can be convenient) ---
  get username() { return this.loginForm.get('login'); }
  get password() { return this.loginForm.get('password'); }
  get rememberMe() { return this.loginForm.get('rememberMe'); }


  // --- Methods ---
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.focusFirstInvalidField(); // Best practice: focus first error
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // getRawValue() includes all values, including 'rememberMe'
    const credentials = this.loginForm.getRawValue();

    // --- IMPORTANT ---
    // Your AuthService.login method needs to be prepared to receive
    // an object like { username: '...', password: '...', rememberMe: true/false }
    // and handle the 'rememberMe' flag accordingly (e.g., inform the backend).
    
    this.authService.login(credentials)
      .pipe(
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          console.log('Login successful', response);
          // TODO: Adjust target route as needed
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          // Assuming error object has a message property
          this.errorMessage.set(err?.message || 'Login failed. Please check your credentials.');
          console.error('Login error:', err);
          // Optionally reset password field after error for security
          // this.password?.reset();
        }
      });
      
  }

  togglePasswordVisibility(event: Event): void {
      event.stopPropagation(); // Prevent form submission if inside form element
      this.hidePassword.update(value => !value);
  }

  // --- Helper Method for Accessibility ---
  private focusFirstInvalidField(): void {
     // Find the first form control element with an error
     const firstInvalidControl = document.querySelector('.ng-invalid[formControlName]');
     if (firstInvalidControl instanceof HTMLElement) {
        firstInvalidControl.focus(); // Focus the element
     }
  }
}