import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ViewChild, AfterViewInit, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

import { FinancialAccountNode, FinancialAccountType } from '../../../models/financial-account.model';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-financial-account-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
  ],
  templateUrl: './financial-account-list.component.html',
  styleUrls: ['./financial-account-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialAccountListComponent implements AfterViewInit {
  // --- Inputs ---
  @Input({ required: true }) accountId!: number | null;
  @Input({ required: true }) accountTypes!: FinancialAccountType[];
  @Input({ required: true }) flatNodes!: FinancialAccountNode[]; // Receive flat list *with level*

  private langService = inject(LanguageService);

  currentLanguage = this.langService.currentLanguage();
  // Use a setter to update the dataSource when input changes
  private _flatNodeData: FinancialAccountNode[] = [];
  @Input({ required: true }) set flatNodeData(data: FinancialAccountNode[]) {
    this._flatNodeData = data;
    this.dataSource.data = data;
     if (this.paginator) {
        this.dataSource.paginator = this.paginator;
    }
     if (this.sort) {
        this.dataSource.sort = this.sort;
    }
  }
  get flatNodeData(): FinancialAccountNode[] {
    return this._flatNodeData;
  }

  // --- Outputs ---
  @Output() requestOpenDialog = new EventEmitter<{
    mode: 'create' | 'edit';
    node?: FinancialAccountNode; // Pass the node being edited
    // Parent info not directly relevant for edit/delete from flat list context
    accountTypes: FinancialAccountType[];
    flatNodes: FinancialAccountNode[]; // Pass context
  }>();
  @Output() requestDelete = new EventEmitter<{ node: FinancialAccountNode }>();

  // --- Table Specific ---
  displayedColumns: string[] = ['name', 'serialId', 'accountTypeName', 'balance', 'isActive', 'actions'];
  dataSource = new MatTableDataSource<FinancialAccountNode>([]);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (item, property) => {
         switch (property) {
            case 'accountTypeName': return item.accountTypeName ?? this.getAccountTypeName(item.accountTypeId); // Use lookup if name not present
            default: return (item as any)[property];
         }
    };
  }

  // Helper to get type name if not denormalized
  getAccountTypeName(typeId: number): string {
      const type = this.accountTypes.find(t => t.id === typeId);
      return type?.name ?? String(typeId); // Fallback to ID if name not found
  }

  // --- Actions ---
  emitEdit(node: FinancialAccountNode): void {
     this.requestOpenDialog.emit({
        mode: 'edit',
        node: node,
        accountTypes: this.accountTypes,
        flatNodes: this.flatNodes // Pass context
    });
  }

  emitDelete(node: FinancialAccountNode): void {
    this.requestDelete.emit({ node });
  }
}