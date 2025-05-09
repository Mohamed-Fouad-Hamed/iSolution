import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select'; // Needed
import { MatCheckboxModule } from '@angular/material/checkbox'; // Needed
import { MatSlideToggleModule } from '@angular/material/slide-toggle'; // For isActive
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, throwError } from 'rxjs';
import { finalize, catchError, takeUntil } from 'rxjs/operators';

import { FinancialAccountNode, FinancialAccount, FinancialAccountType, FinancialAccountCreatePayload, FinancialAccountUpdatePayload } from '../../../models/financial-account.model';
import { FinancialAccountService } from '../../../core/services/FinancialAccountService';

// Define Dialog Data Structure
export interface FinancialAccountDialogData {
  isEditMode: boolean;
  node?: FinancialAccountNode;      // Node being edited
  parentSerialId?: string | null;  // Parent if creating a child
  accountId: number;
  potentialParents: FinancialAccount[]; // List of valid parent options
  accountTypes: FinancialAccountType[]; // List of account types
}


@Component({
  selector: 'app-financial-account-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule,     // Added
    MatCheckboxModule,   // Added
    MatSlideToggleModule,// Added
    MatIconModule
  ],
  templateUrl: './financial-account-dialog.component.html',
  styleUrls: ['./financial-account-dialog.component.scss']
})
export class FinancialAccountDialogComponent implements OnInit {
  // --- Injections ---
  private fb = inject(FormBuilder);
  private faService = inject(FinancialAccountService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  public dialogRef = inject(MatDialogRef<FinancialAccountDialogComponent>);

  // --- Component State ---
  accountForm!: FormGroup; // Renamed for clarity
  isEditMode: boolean;
  isLoading = false;
  error: string | null = null;
  accountId: number;
  private currentNode?: FinancialAccountNode;
  availableParents: FinancialAccount[] = [];
  availableTypes: FinancialAccountType[] = [];


  constructor(@Inject(MAT_DIALOG_DATA) public data: FinancialAccountDialogData) {
      this.isEditMode = data.isEditMode;
      this.accountId = data.accountId;
      this.currentNode = data.node;
      this.availableParents = data.potentialParents || [];
      this.availableTypes = data.accountTypes || [];
  }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    const initialParentSerialId = this.isEditMode
        ? this.data.node?.parentSerialId
        : this.data.parentSerialId; // Will be undefined/null for root creation

    const node = this.data.node; // Shorthand

    this.accountForm = this.fb.group({
      // Core Fields
      name: [node?.name || '', Validators.required],
      serialId: [{ value: node?.serialId || '', disabled: this.isEditMode }], // Disable serialId on edit
      parentSerialId: [initialParentSerialId || null],
      accountTypeId: [node?.accountTypeId || null, Validators.required],
      description: [node?.description || ''],
      accountCategory: [node?.accountCategory || ''],
      currency: [node?.currency || 'EGP', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
      isActive: [this.isEditMode ? (node?.isActive ?? true) : true, Validators.required], // Default true

      // Boolean Flags
      isDebit: [this.isEditMode ? (node?.isDebit ?? true) : true, Validators.required],
      isCashAccount: [this.isEditMode ? (node?.isCashAccount ?? false) : false, Validators.required],
      isBankAccount: [this.isEditMode ? (node?.isBankAccount ?? false) : false, Validators.required],
      isControlAccount: [this.isEditMode ? (node?.isControlAccount ?? false) : false, Validators.required],
    });
  }

 onSave(): void {
    if (this.accountForm.invalid || this.isLoading) {
      this.accountForm.markAllAsTouched(); // Show validation errors
      return;
    }

    this.isLoading = true;
    this.error = null;
    // Use getRawValue to include disabled fields like serialId if needed by backend logic,
    // although it's usually better to only send editable fields.
    // For create, serialId comes from form; For update, it's usually path param or part of fetched entity.
    const formData = this.accountForm.value; // Use .value if not sending disabled fields

    let operation$: Observable<FinancialAccount>; // Expect backend to return the full object

    if (this.isEditMode && this.currentNode?.id) {
       // Prepare update payload
       const updatePayload: FinancialAccountUpdatePayload = {
            // Map editable fields from form
            name: formData.name,
            parentSerialId: formData.parentSerialId || null,
            accountTypeId: formData.accountTypeId,
            description: formData.description,
            accountCategory: formData.accountCategory,
            currency: formData.currency,
            isActive: formData.isActive,
            isDebit: formData.isDebit,
            isCashAccount: formData.isCashAccount,
            isBankAccount: formData.isBankAccount,
            isControlAccount: formData.isControlAccount
            // Exclude: id, serialId, balance, accountId
       };
       operation$ = this.faService.updateFinancialAccount(this.accountId, this.currentNode.id, updatePayload);
    } else {
        // Prepare create payload
        const createPayload: FinancialAccountCreatePayload = {
             serialId: this.accountForm.get('serialId')?.value, // Get value even if disabled for edit mode check (though it won't be disabled in create)
             name: formData.name,
             parentSerialId: formData.parentSerialId || null,
             accountTypeId: formData.accountTypeId,
             description: formData.description,
             accountCategory: formData.accountCategory,
             currency: formData.currency,
             isActive: formData.isActive,
             isDebit: formData.isDebit,
             isCashAccount: formData.isCashAccount,
             isBankAccount: formData.isBankAccount,
             isControlAccount: formData.isControlAccount
             // Exclude: id, balance, accountId (service adds accountId)
        };
        operation$ = this.faService.createFinancialAccount(this.accountId, createPayload);
    }

    operation$.pipe(
      takeUntil(this.dialogRef.afterClosed()),
      finalize(() => { this.isLoading = false; }),
      catchError(err => {
        console.error("Error saving financial account:", err);
        this.error = err.message || this.translate.instant('FIN_ACCOUNT.ERRORS.SAVE_FAILED');
        return throwError(() => err);
      })
    ).subscribe(savedAccount => {
        this.dialogRef.close(savedAccount);
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get f() { return this.accountForm.controls; }
}