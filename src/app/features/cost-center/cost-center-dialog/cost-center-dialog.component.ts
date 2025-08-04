import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CostCenter, CostCenterRequestDTO } from '../../../models/cost-center';
import { CostCenterService } from '../../../core/services/cost-center';
import { take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface CostCenterDialogData {
  costCenter?: CostCenter;
  departmentId: number; // Required for create, present for edit
}

@Component({
  selector: 'app-cost-center-dialog',
  standalone:true,
  imports:[
     CommonModule,
        ReactiveFormsModule,
        TranslateModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
  ],
  templateUrl: './cost-center-dialog.component.html',
  styleUrls: ['./cost-center-dialog.component.scss']
})
export class CostCenterDialogComponent implements OnInit {
  costCenterForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  dialogTitle = '';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CostCenterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CostCenterDialogData,
    private costCenterService: CostCenterService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data.costCenter;
    this.dialogTitle = this.isEditMode ? 'COST_CENTERS.EDIT_COST_CENTER' : 'COST_CENTERS.ADD_COST_CENTER';

    this.costCenterForm = this.fb.group({
      name: [
        this.data.costCenter?.name || '',
        [Validators.required, Validators.maxLength(255)]
      ],
      description: [
        this.data.costCenter?.description || '',
        [Validators.maxLength(1000)]
      ],
      departmentId: [
        // For create, use passed departmentId. For edit, use existing costCenter's departmentId.
        this.data.costCenter?.departmentId || this.data.departmentId,
        [Validators.required]
      ]
    });

    // Department ID field is crucial but usually not directly edited by user in this dialog
    // It's set by the parent component (selected department) or from the existing entity.
    // You might choose to disable it if it shouldn't be changed.
    // this.costCenterForm.get('departmentId')?.disable();
  }

  get name() { return this.costCenterForm.get('name'); }
  get description() { return this.costCenterForm.get('description'); }
  get departmentId() { return this.costCenterForm.get('departmentId'); }


  onSubmit(): void {
    if (this.costCenterForm.invalid) {
      this.costCenterForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.costCenterForm.value;
    const costCenterData: CostCenterRequestDTO = {
      name: formValue.name,
      description: formValue.description,
      departmentId: formValue.departmentId // Ensure this is correctly sourced
    };

    let operation$: Observable<CostCenter>;

    if (this.isEditMode && this.data.costCenter?.serialId) {
      operation$ = this.costCenterService.updateCostCenter(this.data.costCenter?.serialId, costCenterData);
    } else {
      operation$ = this.costCenterService.createCostCenter(costCenterData);
    }

    operation$.pipe(take(1)).subscribe({
      next: (savedCostCenter) => {
        this.isLoading = false;
        const successMsgKey = this.isEditMode ? 'COST_CENTERS.SUCCESS_UPDATED' : 'COST_CENTERS.SUCCESS_CREATED';
        this.translate.get(successMsgKey, { name: savedCostCenter.name }).pipe(take(1)).subscribe(msg => {
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        });
        this.dialogRef.close(savedCostCenter); // Pass back the saved/updated cost center
      },
      error: (err:any) => {
        this.isLoading = false;
        this.translate.get('COST_CENTERS.ERROR_SAVING').pipe(take(1)).subscribe(msg => {
          this.snackBar.open(msg, 'ERROR', { duration: 5000 });
        });
        console.error('Error saving cost center:', err);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}