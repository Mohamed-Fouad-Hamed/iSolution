import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';
import { CustomerDto, CustomerCreateDto, CustomerUpdateDto } from '../../../models/customer.model';


export interface CustomerDialogData {
  customer?: CustomerDto; // Pass customer data for editing
  accountId: number;      // Needed for create
}

@Component({
  selector: 'app-customer-dialog',
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
  templateUrl: './customer-dialog.component.html',
  styleUrls: ['./customer-dialog.component.scss']
})
export class CustomerDialogComponent implements OnInit {
  customerForm: FormGroup;
  isEditMode: boolean = false;
  dialogTitle: string = 'CUSTOMER.DIALOG.ADD_TITLE';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CustomerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CustomerDialogData
  ) {
    this.isEditMode = !!data.customer;

    this.customerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      phone: ['', [Validators.maxLength(20), Validators.pattern('^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$')]],
      address: ['', [Validators.maxLength(255)]],
      isActive: [true] // <--- ADDED isActive form control, default to true for new customers
    });

    if (this.isEditMode) {
        this.dialogTitle = 'CUSTOMER.DIALOG.EDIT_TITLE';
    }
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.customer) {
      this.customerForm.patchValue({
        name: this.data.customer.name,
        email: this.data.customer.email,
        phone: this.data.customer.phone,
        address: this.data.customer.address,
        isActive: this.data.customer.isActive // <--- PATCH isActive for existing customer
      });
    } else if (!this.isEditMode) {
        // For new customers, default isActive to true (already set in form group definition)
        // If you want a different default for add mode, set it here:
        // this.customerForm.patchValue({ isActive: true });
    }
  }

  onSave(): void {
    if (this.customerForm.valid) {
      const formValue = this.customerForm.value;
      let resultData: CustomerCreateDto | CustomerUpdateDto;

      if (this.isEditMode) {
        resultData = {
          name: formValue.name,
          email: formValue.email,
          phone: formValue.phone || null,
          address: formValue.address || null,
          isActive: formValue.isActive // <--- INCLUDE isActive in update DTO
        } as CustomerUpdateDto;
      } else {
        resultData = {
          ...formValue, // Includes name, email, phone, address, isActive
          phone: formValue.phone || null,
          address: formValue.address || null,
          accountId: this.data.accountId
        } as CustomerCreateDto;
      }
      this.dialogRef.close(resultData);
    } else {
      this.customerForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}