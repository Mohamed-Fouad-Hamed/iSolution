// src/app/features/company/company-dialog/company-dialog.component.ts
import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, catchError, throwError } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { Company } from '../../../models/company';
import { CompanyService } from '../../../core/services/companyservice';

@Component({
  selector: 'app-company-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, // For forms
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './company-form-dialog.component.html',
  styleUrls: ['./company-form-dialog.component.scss']
})
export class CompanyFormDialogComponent implements OnInit {
  // Injections
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<CompanyFormDialogComponent>);

  // Use MAT_DIALOG_DATA to get passed data (null if creating, Company object if editing)
  constructor(@Inject(MAT_DIALOG_DATA) public data: Company | null) {}

  // Component State
  companyForm!: FormGroup; // Definite assignment assertion
  isEditMode = false;
  isLoading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.isEditMode = !!this.data && typeof this.data.serialId !== 'undefined' && this.data.serialId !== null;
    this.initForm();
  }

  initForm(): void {
    this.companyForm = this.fb.group({
      // Use data?.field for optional chaining if editing, otherwise default to '' or null
      name: [this.data?.name || '', Validators.required],
      taxIdentificationNumber: [this.data?.taxIdentificationNumber || '', [
          Validators.required,
          // Add pattern validation if applicable (e.g., specific format for Tax ID)
          // Validators.pattern('^[A-Z0-9-]{10}$')
      ]],
      address: [this.data?.address || ''],
      phone: [this.data?.phone || ''],
      email: [this.data?.email || '', Validators.email], // Basic email format validation
      website: [this.data?.website || '']
      // Don't include 'id' or 'createdAt' in the form for user editing
    });
  }

  onSave(): void {
    if (this.companyForm.invalid || this.isLoading) {
      this.companyForm.markAllAsTouched(); // Show validation errors
      return;
    }

    this.isLoading = true;
    this.error = null;
    const formData = this.companyForm.value;

    const operation = this.isEditMode && this.data?.serialId
      ? this.companyService.updateCompany(this.data.serialId, formData)
      : this.companyService.createCompany(formData);

    operation.pipe(
      finalize(() => { // Runs on completion or error
        this.isLoading = false;
      }),
      catchError(err => {
        this.error = err.message || `Failed to ${this.isEditMode ? 'update' : 'create'} company.`;
        this.snackBar.open(this.error || '', 'Dismiss', { duration: 5000 });
        return throwError(() => err); // Re-throw error
      })
    ).subscribe(savedCompany => {
        // Pass the result back to the component that opened the dialog
        this.dialogRef.close(savedCompany);
      });
  }

  onCancel(): void {
    this.dialogRef.close(); // Close without sending data
  }

  // Helper to get form controls for template validation messages
  get f() { return this.companyForm.controls; }
}