import { Component, ChangeDetectionStrategy, inject, Input, Output, EventEmitter } from '@angular/core';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

import { FinancialAccountNode, FinancialAccountType } from '../../../models/financial-account.model';

@Component({
  selector: 'app-financial-account-tree',
  standalone: true,
  imports: [
    CommonModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
  ],
  templateUrl: './financial-account-tree.component.html',
  styleUrls: ['./financial-account-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialAccountTreeComponent {
  // --- Inputs ---
  @Input({ required: true }) accountId!: number | null;
  @Input({ required: true }) accountTypes!: FinancialAccountType[];
  @Input({ required: true }) flatNodes!: FinancialAccountNode[]; // Receive flat list for context

  // Use a setter for treeData to update the dataSource
  private _treeData: FinancialAccountNode[] = [];
  @Input({ required: true }) set treeData(data: FinancialAccountNode[]) {
    this._treeData = data;
    this.dataSource.data = data;
  }
  get treeData(): FinancialAccountNode[] {
    return this._treeData;
  }

  // --- Outputs ---
  // Emits events for the parent manager component to handle dialog opening/deletion
  @Output() requestOpenDialog = new EventEmitter<{
    mode: 'create' | 'edit';
    node?: FinancialAccountNode;
    parentNode?: FinancialAccountNode;
    accountTypes: FinancialAccountType[];
    flatNodes: FinancialAccountNode[];
  }>();
  @Output() requestDelete = new EventEmitter<{ node: FinancialAccountNode }>();


  // --- Tree Specific ---
  treeControl = new NestedTreeControl<FinancialAccountNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<FinancialAccountNode>();

  hasChild = (_: number, node: FinancialAccountNode) => node.expandable;

  // --- Actions ---
  emitCreateChild(node: FinancialAccountNode): void {
    this.requestOpenDialog.emit({
        mode: 'create',
        parentNode: node,
        accountTypes: this.accountTypes,
        flatNodes: this.flatNodes // Pass context
    });
  }

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
