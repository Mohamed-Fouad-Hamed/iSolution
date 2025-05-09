// src/app/features/company/company-list/company-list.component.ts
import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngIf, *ngFor, async pipe
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil, catchError, tap } from 'rxjs/operators';

import { Company } from '../../../models/company';
import { CompanyService } from '../../../core/services/companyservice';
import { CompanyFormDialogComponent } from '../company-form-dialog/company-form-dialog.component'; // We'll create this next
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component'; // Assume a shared confirmation dialog
import { LayoutModule } from '@angular/cdk/layout'; // For responsive checks

@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [
    CommonModule, // Essential directives
    LayoutModule, // For BreakpointObserver
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule 
],
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // OnPush for performance
})
export class CompanyListComponent implements OnInit, AfterViewInit, OnDestroy {
  // Inject services and utilities
  private companyService = inject(CompanyService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef); // Inject ChangeDetectorRef
  private traslateService = inject(TranslateService);

  // Component State
  isLoading = true;
  error: string | null = null;
  displayedColumns: string[] = ['name', 'taxIdentificationNumber', 'email', 'phone', 'actions'];
  dataSource = new MatTableDataSource<Company>([]);

  // ViewChild decorators to get references to the sort and paginator components
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // RxJS Subject to automatically unsubscribe from observables on component destruction
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadCompanies();
  }

  ngAfterViewInit(): void {
    // Assign paginator and sort to the dataSource *after* they are initialized
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError in dev mode
    setTimeout(() => {
        if (this.paginator) {
            this.dataSource.paginator = this.paginator;
        }
        if (this.sort) {
            this.dataSource.sort = this.sort;
        }
    });
  }

  ngOnDestroy(): void {
    // Complete the destroy subject to trigger unsubscription
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCompanies(): void {
    this.isLoading = true;
    this.error = null;
    this.companyService.getCompanies()
      .pipe(
        tap(companies => { // Use tap for side effects
          this.dataSource.data = companies;
          this.isLoading = false;
          this.cdr.markForCheck(); // Trigger change detection with OnPush
        }),
        catchError(err => {
          this.error = err.message || 'Failed to load companies.';
          this.isLoading = false;
          this.snackBar.open(this.error || '', 'Dismiss', { duration: 5000 });
          this.cdr.markForCheck(); // Trigger change detection with OnPush
          return []; // Return empty array on error to complete the stream gracefully
        }),
        takeUntil(this.destroy$) // Automatically unsubscribe when component is destroyed
      )
      .subscribe(); // Need to subscribe to trigger the observable chain
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage(); // Go to first page on filter change
    }
  }

  openCreateDialog(): void {
    this.openDialog(); // Call shared dialog opener
  }

  openEditDialog(company: Company): void {
    this.openDialog(company); // Call shared dialog opener with data
  }

  private openDialog(companyData: Company | null = null): void {
    const dialogRef = this.dialog.open(CompanyFormDialogComponent, {
      width: '500px', // Responsive width
      maxWidth: '90vw', // Max width for smaller screens
      disableClose: true, // Prevent closing by clicking outside or ESC
      data: companyData // Pass existing company data for editing, or null for creating
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) { // Check if dialog returned data (i.e., wasn't cancelled)
          this.loadCompanies(); // Reload data on successful create/update
          const sucessCreated : string = this.traslateService.instant("COMPANY.SUCCESS.CREATED");
          const sucessUpdated : string = this.traslateService.instant("COMPANY.SUCCESS.UPDATED");
          const okLbl : string = this.traslateService.instant("COMMON.BUTTONS.OK");
          this.snackBar.open(`${companyData ? sucessUpdated : sucessCreated } `, okLbl, { duration: 3000 });
        }
      });
  }

  confirmAndDelete(company: Company): void {
    // Use a confirmation dialog before deleting (Best Practice)
    const titleDel : string =  this.traslateService.instant("COMMON.CONFIRMATION.DELETE_TITLE");
    const msgDel : string =  this.traslateService.instant("COMMON.CONFIRMATION.DELETE_MESSAGE",{ itemName: company.name } );

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        width: '350px',
        data: {
            title: titleDel,
            message: `${msgDel}`
        }
    });

    dialogRef.afterClosed()
        .pipe(takeUntil(this.destroy$))
        .subscribe(confirmed => {
            if (confirmed) {
                this.deleteCompany(company.serialId || '');
            }
        });
  }


  private deleteCompany(id: string): void {
    this.isLoading = true; // Show loading indicator during deletion
    this.cdr.markForCheck();

    this.companyService.deleteCompany(id)
      .pipe(
        tap(() => {
          this.isLoading = false;
          this.snackBar.open('Company deleted successfully!', 'Ok', { duration: 3000 });
          this.loadCompanies(); // Refresh the list
          // No need for cdr.markForCheck here because loadCompanies() will handle it
        }),
        catchError(err => {
          this.error = err.message || 'Failed to delete company.';
          this.isLoading = false;
          this.snackBar.open(this.error || '', 'Dismiss', { duration: 5000 });
          this.cdr.markForCheck();
          return []; // Graceful completion
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
}