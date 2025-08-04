import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy, inject, ChangeDetectorRef, AfterViewInit, ElementRef } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatSort, MatSortModule } from '@angular/material/sort'; // For sorting
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, ReplaySubject, Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, startWith, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { CostCenterDepartment, CostCenter, CostCenterRequestDTO } from '../../../models/cost-center';
import { CostCenterService } from '../../../core/services/cost-center';
import { CostCenterDialogComponent, CostCenterDialogData } from '../cost-center-dialog/cost-center-dialog.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component'; // Assuming you have a shared confirmation dialog
import { CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatOptionModule } from '@angular/material/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';

@Component({
  selector: 'app-cost-center-list',
  standalone: true,
  imports: [   
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    NgxMatSelectSearchModule, // Add here
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatCardModule,
  ],
  templateUrl: './cost-center-list.component.html',
  styleUrl: './cost-center-list.component.scss',
   changeDetection: ChangeDetectionStrategy.OnPush
})
export class CostCenterListComponent  implements OnInit,AfterViewInit, OnDestroy{

  public departmentFilterCtrl: FormControl<string | null> = new FormControl<string>('');
  public filteredDepartments$: ReplaySubject<CostCenterDepartment[]> = new ReplaySubject<CostCenterDepartment[]>(1);
  private departments: CostCenterDepartment[] = []; // Store original list

  selectedDepartmentId: number | null = null;

  // For Cost Center Table Filter
  @ViewChild('costCenterFilterInput') costCenterFilterInput!: ElementRef<HTMLInputElement>;
  public costCenterFilterCtrl: FormControl<string | null> = new FormControl<string>('');
  departments$: Observable<CostCenterDepartment[]> = of([]);


  displayedColumns: string[] = ['name', 'description', 'actions'];
  dataSource = new MatTableDataSource<CostCenter>();
  @ViewChild(MatSort) sort!: MatSort; // For sorting

  isLoadingDepartments = false;
  isLoadingCostCenters = false;

  private destroy$ = new Subject<void>();

  private accountId :string | null = null;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private costCenterService: CostCenterService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private auth : AuthService
  ) {}

  ngOnInit(): void {
    this.accountId = this.auth.currentAccountId() || '';
    this.loadDepartments();
    this.setupDepartmentFilter();
    this.setupCostCenterFilter();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    // Custom filter predicate for cost centers (filter only by name)
    this.dataSource.filterPredicate = (data: CostCenter, filter: string) => {
      return data.name.toLowerCase().includes(filter);
    };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.filteredDepartments$.complete();
  }

  private setupDepartmentFilter(): void {
    this.departmentFilterCtrl.valueChanges
      .pipe(
        startWith(''),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.filterDepartments();
      });
  }

  private filterDepartments(): void {
    if (!this.departments) {
      this.filteredDepartments$.next([]);
      return;
    }
    let search = this.departmentFilterCtrl.value;
    if (!search) {
      this.filteredDepartments$.next(this.departments.slice());
      return;
    }
    search = search.toLowerCase();
    this.filteredDepartments$.next(
      this.departments.filter(dept => dept.name.toLowerCase().includes(search as string))
    );
  }

  loadDepartments(): void {
    this.isLoadingDepartments = true;
    this.costCenterService.getDepartments(+(this.accountId || '') ).pipe(
      finalize(() => this.isLoadingDepartments = false),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (depts) => {
        this.departments = depts;
        this.filteredDepartments$.next(depts.slice()); // Initial population
      },
      error: () => {
        this.translate.get('COST_CENTERS.ERROR_FETCHING_DEPARTMENTS').pipe(takeUntil(this.destroy$)).subscribe(msg => {
          this.snackBar.open(msg, 'ERROR', { duration: 3000 });
        });
        this.departments = [];
        this.filteredDepartments$.next([]);
      }
    });
  }

  onDepartmentChange(departmentId: number | null): void {
    this.selectedDepartmentId = departmentId;
    if (departmentId) {
      this.loadCostCenters(departmentId);
    } else {
      this.dataSource.data = [];
      this.clearCostCenterFilter(); // Clear filter when department changes
    }
  }

  loadCostCenters(departmentId: number): void {
    this.isLoadingCostCenters = true;
    this.clearCostCenterFilter(); // Clear previous filter
    this.costCenterService.getCostCentersByDepartment(departmentId).pipe(
      finalize(() => {
        this.isLoadingCostCenters = false ;
        this.cdr.markForCheck();
     }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (costCenters) => {
        this.dataSource.data = costCenters;
      },
      error: () => {
         this.translate.get('COST_CENTERS.ERROR_FETCHING_COST_CENTERS').pipe(takeUntil(this.destroy$)).subscribe(msg => {
          this.snackBar.open(msg, 'ERROR', { duration: 3000 });
        });
        this.dataSource.data = [];
      }
    });
  }

  private setupCostCenterFilter(): void {
    this.costCenterFilterCtrl.valueChanges.pipe(
      debounceTime(300), // Add a small debounce
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.applyCostCenterFilter(value || '');
    });
  }

  applyCostCenterFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) { // If you were using paginator
      this.dataSource.paginator.firstPage();
    }
  }

  clearCostCenterFilter(): void {
    this.costCenterFilterCtrl.setValue(''); // Clears the form control
    // The subscription in setupCostCenterFilter will then call applyCostCenterFilter
    if (this.costCenterFilterInput) { // Also clear native input if needed (though form control should handle it)
        this.costCenterFilterInput.nativeElement.value = '';
    }
    this.dataSource.filter = ''; // Immediately apply empty filter
  }

  openCreateDialog(): void {
    if (!this.selectedDepartmentId) {
      this.translate.get('COST_CENTERS.SELECT_DEPARTMENT').pipe(takeUntil(this.destroy$)).subscribe(msg => {
        this.snackBar.open(msg, 'WARN', { duration: 3000 });
      });
      return;
    }

    const dialogData: CostCenterDialogData = {
      departmentId: this.selectedDepartmentId
    };

    const dialogRef = this.dialog.open(CostCenterDialogComponent, { // Use the (now standalone) dialog
      width: '500px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result && this.selectedDepartmentId) {
        this.loadCostCenters(this.selectedDepartmentId);
      }
    });
  }

  openEditDialog(costCenter: CostCenter): void {
    if (!costCenter.departmentId) {
        console.error("Cost center for edit is missing departmentId", costCenter);
        return;
    }
    const dialogData: CostCenterDialogData = {
      costCenter: costCenter,
      departmentId: costCenter.departmentId
    };

    const dialogRef = this.dialog.open(CostCenterDialogComponent, { // Use the (now standalone) dialog
      width: '500px',
      data: dialogData,
      disableClose: true
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result && this.selectedDepartmentId) {
        this.loadCostCenters(this.selectedDepartmentId);
      }
    });
  }

  deleteCostCenter(costCenter: CostCenter): void {
    this.translate.get(['COST_CENTERS.DELETE_CONFIRM_TITLE', 'COST_CENTERS.DELETE_CONFIRM_MESSAGE'], { name: costCenter.name })
      .pipe(
        takeUntil(this.destroy$),
        switchMap(translations => {
          const dialogRef = this.dialog.open(ConfirmationDialogComponent, { // Use the (now standalone) dialog
            width: '400px',
            data: {
              title: translations['COST_CENTERS.DELETE_CONFIRM_TITLE'],
              message: translations['COST_CENTERS.DELETE_CONFIRM_MESSAGE']
            }
          });
          return dialogRef.afterClosed();
        })
      )
      .subscribe(confirmed => {
        if (confirmed) {
          this.isLoadingCostCenters = true;
          this.costCenterService.deleteCostCenter(costCenter.serialId || '').pipe(
            finalize(() => this.isLoadingCostCenters = false),
            takeUntil(this.destroy$)
          ).subscribe({
            next: () => {
              this.translate.get('COST_CENTERS.SUCCESS_DELETION', { name: costCenter.name }).pipe(takeUntil(this.destroy$)).subscribe(msg => {
                this.snackBar.open(msg, 'OK', { duration: 3000 });
              });
              if (this.selectedDepartmentId) {
                this.loadCostCenters(this.selectedDepartmentId);
              }
            },
            error: () => {
              this.translate.get('COST_CENTERS.ERROR_DELETING_COST_CENTER').pipe(takeUntil(this.destroy$)).subscribe(msg => {
                this.snackBar.open(msg, 'ERROR', { duration: 3000 });
              });
            }
          });
        }
      });
  }
 

}
