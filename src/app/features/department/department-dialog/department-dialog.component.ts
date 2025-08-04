import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select'; // Import MatSelectModule
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { A11yModule } from '@angular/cdk/a11y'; // For autofocus

import { Department, DepartmentFlatNode, DepartmentDialogData, DepartmentCreateDto, DepartmentUpdateDto, DepartmentDto } from '../../../models/department';
import { DepartmentService } from '../../../core/services/department.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-department-dialog',
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
    MatSelectModule, // Include MatSelectModule
    MatIconModule,
    A11yModule,
  ],
  templateUrl: './department-dialog.component.html',
  styleUrls: ['./department-dialog.component.scss']
})
export class DepartmentDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private departmentService = inject(DepartmentService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private langService = inject(LanguageService);
  public dialogRef = inject(MatDialogRef<DepartmentDialogComponent>);

  departmentForm!: FormGroup;
  isEditMode: boolean;
  isLoading = false;
  error: string | null = null;
  accountId: number;
  private currentFlatNode?: DepartmentFlatNode;
  availableParents: Department[] = [];

  currentLanguage = this.langService.currentLanguage();

  private departmentBeingEdited?: Department; // Store the department being edited

  constructor(@Inject(MAT_DIALOG_DATA) public data: DepartmentDialogData) {
      this.isEditMode = data.isEditMode;
      this.accountId = data.accountId;
      if (this.isEditMode && data.nodeToEdit) { // Check nodeToEdit
          this.departmentBeingEdited = data.nodeToEdit;
      }
      this.availableParents = data.potentialParents || [];
  }


  ngOnInit(): void {
    this.initForm();
  }

   initForm(): void {
    const initialParentSerialId = this.isEditMode
        ? this.departmentBeingEdited?.parentSerialId
        : this.data.parentSerialId;

    this.departmentForm = this.fb.group({
      name: [this.departmentBeingEdited?.name || '', Validators.required],
      serialId: [this.departmentBeingEdited?.serialId || ''], // Assuming serialId is also part of Department
      parentSerialId: [initialParentSerialId || null],
      description: [this.departmentBeingEdited?.description || '']
    });
  }

  onSave(): void {
    if (this.departmentForm.invalid || this.isLoading || !this.accountId) {
      this.departmentForm.markAllAsTouched(); // Highlight errors
      if (!this.accountId) {
         this.error = this.translate.instant('COMMON.ERRORS.NO_COMPANY_CONTEXT');
      }
      return;
    }

    this.isLoading = true;
    this.error = null;
    const formData = this.departmentForm.getRawValue(); // Use getRawValue for potentially disabled fields

    let operation$: Observable<DepartmentDto>;

    if (this.isEditMode &&  this.departmentBeingEdited?.serialId) {
      const updatePayload: DepartmentUpdateDto = {
        ...formData,
        accountId: this.accountId,
      };
      // Use original serial_id for URL, payload contains new values
      operation$ = this.departmentService.updateDepartment(this.departmentBeingEdited?.serialId || '', updatePayload);
    } else {
      const createPayload: DepartmentCreateDto = {
        ...formData,
        accountId: this.accountId,
        parentSerialId: formData.parentSerialId || null // Ensure null if empty
      };
      operation$ = this.departmentService.createDepartment(createPayload);
    }

    operation$.pipe(
      finalize(() => {
        this.isLoading = false;
      }),
      catchError(err => {
        this.error = err.message; // Service provides translated message
        // Optional: Snack bar already shown by service? If not, show here.
        // this.snackBar.open(this.error, this.translate.instant('COMMON.BUTTONS.DISMISS'), { duration: 5000 });
        return throwError(() => err); // Re-throw
      })
    ).subscribe(savedDepartment => {
        this.dialogRef.close(true); // Signal success
      });
  }

  onCancel(): void {
    this.dialogRef.close(false); // Signal cancellation/no change
  }

  get f() { return this.departmentForm.controls; }
}