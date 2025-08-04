import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';
import { VendorDto, VendorCreateDto, VendorUpdateDto } from '../../../models/vendor.model';

export interface VendorDialogData {
  vendor?: VendorDto; // Pass vendor data for editing
  accountId: number;      // Needed for create
}

@Component({
  selector: 'app-vendor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslateModule,
    MatSlideToggleModule
  ],
  templateUrl: './vendor-dialog.component.html',
  styleUrls: ['./vendor-dialog.component.scss']
})
export class VendorDialogComponent implements OnInit {
  vendorForm: FormGroup;
  isEditMode: boolean = false;
  dialogTitle: string = 'VENDOR.DIALOG.ADD_TITLE';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<VendorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VendorDialogData
  ) {
    this.isEditMode = !!data.vendor;

    this.vendorForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      phone: ['', [Validators.maxLength(20), Validators.pattern('^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$')]],
      address: ['', [Validators.maxLength(255)]],
      isActive: [true] // <--- ADDED isActive form control, default to true for new vendors
    });

    if (this.isEditMode) {
        this.dialogTitle = 'VENDOR.DIALOG.EDIT_TITLE';
    }
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.vendor) {
      this.vendorForm.patchValue({
        name: this.data.vendor.name,
        email: this.data.vendor.email,
        phone: this.data.vendor.phone,
        address: this.data.vendor.address,
        isActive: this.data.vendor.isActive // <--- PATCH isActive for existing vendor
      });
    } else if (!this.isEditMode) {
        // For new vendors, default isActive to true (already set in form group definition)
        // If you want a different default for add mode, set it here:
        // this.vendorForm.patchValue({ isActive: true });
    }
  }

  onSave(): void {
    if (this.vendorForm.valid) {
      const formValue = this.vendorForm.value;
      let resultData: VendorCreateDto | VendorUpdateDto;

      if (this.isEditMode) {
        resultData = {
          name: formValue.name,
          email: formValue.email,
          phone: formValue.phone || null,
          address: formValue.address || null,
          isActive: formValue.isActive // <--- INCLUDE isActive in update DTO
        } as VendorUpdateDto;
      } else {
        resultData = {
          ...formValue, // Includes name, email, phone, address, isActive
          phone: formValue.phone || null,
          address: formValue.address || null,
          accountId: this.data.accountId
        } as VendorCreateDto;
      }
      this.dialogRef.close(resultData);
    } else {
      this.vendorForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}