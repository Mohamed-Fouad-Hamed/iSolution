import { Component, Inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { merge } from 'rxjs';
import { GenericApiService } from '../../../../core/services/generic-api-service'; // Adjust path if needed
import { CustomPaginatorIntl } from '../../../../shared/paginator/custom-paginator-intl';

/**
 * Defines the data structure required to open the generic search dialog.
 */
export interface GenericDialogData {
  title: string;
  columns: { key: string; header: string }[];
  apiService: GenericApiService; // The service instance to use for API calls
  apiEndpoint: string; // The specific URL for fetching paged data
}

@Component({
  selector: 'app-search-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
    providers: [
      { provide: MatPaginatorIntl, useClass: CustomPaginatorIntl }
    ],
  templateUrl: './search-dialog.component.html',
  styleUrls: ['./search-dialog.component.scss']
})
export class SearchDialogComponent implements OnInit, AfterViewInit {
  searchControl = new FormControl('');
  dataSource = new MatTableDataSource<any>(); // Data source is now of type 'any'
  displayedColumns: string[];
  totalItems = 0;
  isLoading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Inject the generic data structure
  constructor(
    public dialogRef: MatDialogRef<SearchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GenericDialogData
  ) {
    // Dynamically set the displayed columns from the injected configuration
    this.displayedColumns = this.data.columns.map(c => c.key);
  }

  ngOnInit(): void {
    // When search text changes, reset paginator to the first page
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      if(this.paginator) {
        this.paginator.pageIndex = 0;
      }
    });
  }

  ngAfterViewInit(): void {
    // Merge events from the search input and the paginator to trigger a data reload
    merge(this.searchControl.valueChanges, this.paginator.page).pipe(
      startWith({}), // Trigger an initial fetch
      switchMap(() => {
        this.isLoading = true;
        // Use the injected service and endpoint to fetch data
        return this.data.apiService.getPaged(
          this.data.apiEndpoint,
          this.searchControl.value || '',
          this.paginator.pageIndex,
          this.paginator.pageSize
        );
      }),
      map(result => {
        console.log(result)
        this.isLoading = false;
        this.totalItems = result.count;
        return result.list;
      })
    ).subscribe(items => {
      console.log(items)
      this.dataSource.data = items;
    });
  }

  /**
   * When a row is clicked, close the dialog and return the selected item object.
   * @param row The clicked item object.
   */
  onRowClicked(row: any): void {
    this.dialogRef.close(row);
  }

  /**
   * Closes the dialog without returning any data.
   */
  onClose(): void {
    this.dialogRef.close();
  }
}