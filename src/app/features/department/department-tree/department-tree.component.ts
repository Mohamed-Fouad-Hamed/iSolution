import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, finalize, tap, map } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field'; // Add
import { MatInputModule } from '@angular/material/input';         // Add
import { ReactiveFormsModule, FormControl } from '@angular/forms'; // Add
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { Department, DepartmentFlatNode, DepartmentDialogData, DepartmentDto } from '../../../models/department';
import { DepartmentService } from '../../../core/services/department.service';
import { DepartmentDialogComponent } from '../department-dialog/department-dialog.component';
import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component'; // Adjust path
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-department-tree',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    // Ensure dialogs are standalone or modules imported if needed
    // ConfirmationDialogComponent,
    // DepartmentDialogComponent,
  ],
  templateUrl: './department-tree.component.html',
  styleUrls: ['./department-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentTreeComponent implements OnInit, OnDestroy {
  private departmentService = inject(DepartmentService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);

  isLoading = true;
  error: string | null = null;
  accountId!: number; // Expect companyId to be available on init
  private flatDepartments: Department[] = []; // Store the full flat list

   // Ensure originalData is populated correctly in _transformer if you use it for editing
   private _transformer = (node: Department, level: number): DepartmentFlatNode => {
    const expandable = this.flatDepartments.some(d => d.parentSerialId === node.serialId);
    return {
      // Keep existing properties
      serialId: node.serialId,
      name: node.name,
      parentSerialId: node.parentSerialId,
      level: level,
      expandable: expandable,
      originalData: node // Ensure this is the full Department object
    };
  };

  treeControl = new FlatTreeControl<DepartmentFlatNode>(
    node => node.level, node => node.expandable
  );

  treeFlattener = new MatTreeFlattener<Department, DepartmentFlatNode>(
      this._transformer, node => node.level, node => node.expandable, node => node.children
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  private destroy$ = new Subject<void>();

  filterControl = new FormControl(''); // FormControl for the filter input
  private originalTreeData: Department[] = []; // To store the original full tree structure
  private allNodesMap = new Map<string, DepartmentFlatNode>(); // For quick lookup of flat nodes 

  // --- Lifecycle ---
  ngOnInit(): void {
    const currentAccountId = this.authService.getAccountId();
    if (currentAccountId !== null) {
        this.accountId = +currentAccountId;
        this.loadDepartments();
    } else {
        this.isLoading = false;
        this.error = this.translate.instant('COMMON.ERRORS.NO_COMPANY_CONTEXT');
        this.cdr.markForCheck();
    }

     // Subscribe to filter input changes
     this.filterControl.valueChanges.pipe(
      debounceTime(300), // Wait for 300ms after last input
      distinctUntilChanged(), // Only emit if value actually changed
      takeUntil(this.destroy$)
    ).subscribe(filterValue => {
      this.applyFilter(filterValue || ''); // Pass empty string if null/undefined
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Data Loading & Tree Building ---
  loadDepartments(): void {
    if (!this.accountId) return;
    this.isLoading = true;
    this.error = null;
    this.cdr.markForCheck();

     this.departmentService.getDepartmentsByCompany(this.accountId)
      .pipe(
        tap(flatList => {
          this.flatDepartments = flatList || [];
          // Build the original full tree structure once
          this.originalTreeData = this.buildTree(this.flatDepartments);
        }),
        finalize(() => {
            this.isLoading = false;
            this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
          next: () => { // 'treeData' is no longer directly used here
              // Apply current filter (if any) or show full tree
              this.applyFilter(this.filterControl.value || '');

              setTimeout(() => {
                this.expandAllNodes();
              },1500);

          },
          error: err => {
              // ... (existing error handling) ...
          }
      });
  }  

  private expandAllNodes(): void {
    this.treeControl.dataNodes.forEach(node => this.treeControl.expand(node));
  }

    // --- Filter Logic ---
    applyFilter(filterText: string): void {
      const normalizedFilter = filterText.trim().toLowerCase();

      if (!normalizedFilter) {
        this.dataSource.data = this.originalTreeData;
        this.cdr.markForCheck();
        queueMicrotask(() => this.expandAllNodes()); // Expand full tree
        return;
      }
    
      const directlyMatchedSerialIds = new Set<string>();
      this.flatDepartments.forEach(dept => {
        if (dept.name.toLowerCase().includes(normalizedFilter) ||
            dept.serialId.toLowerCase().includes(normalizedFilter)) {
          directlyMatchedSerialIds.add(dept.serialId);
        }
      });
    
      const nodesToIncludeSerialIds = new Set<string>(directlyMatchedSerialIds);
      const departmentMap = new Map(this.flatDepartments.map(d => [d.serialId, d]));
    
      directlyMatchedSerialIds.forEach(serialId => {
        let current = departmentMap.get(serialId);
        while (current?.parentSerialId) {
          nodesToIncludeSerialIds.add(current.parentSerialId);
          current = departmentMap.get(current.parentSerialId);
        }
      });
    
      const filteredFlatList = this.flatDepartments.filter(dept =>
        nodesToIncludeSerialIds.has(dept.serialId)
      );
    
      const filteredTreeData = this.buildTree(filteredFlatList);
      this.dataSource.data = filteredTreeData;
    
      queueMicrotask(() => this.expandAllNodes());
      this.cdr.markForCheck();
    }


    private expandFilteredNodes(nodes: DepartmentFlatNode[], directlyMatchedSerialIds: Set<string>): void {
      nodes.forEach(node => {
        let shouldExpand = directlyMatchedSerialIds.has(node.serialId); // Direct match
  
        // Check if any descendant is a direct match (for expanding parents)
        if (!shouldExpand && node.expandable) {
          const descendants = this.getAllDescendantFlatNodes(node);
          if (descendants.some(desc => directlyMatchedSerialIds.has(desc.serialId))) {
            shouldExpand = true;
          }
        }
  
        if (shouldExpand) {
          this.treeControl.expand(node); // Expand the node
          const parent = this.getParentNode(node);
          if (parent) {
              this.treeControl.expand(parent); // Ensure parent is expanded
          }
        }
  
        // If node itself is not a direct match but is expandable and has children,
        // recursively call for its children if it was expanded
        // (This part might be complex if you want to expand only the path to the match)
        // For simplicity, expanding direct matches and their parents is often enough.
      });
    }
  
     // Helper to get all descendants of a flat node
    private getAllDescendantFlatNodes(node: DepartmentFlatNode): DepartmentFlatNode[] {
      const descendants: DepartmentFlatNode[] = [];
      const nodesToVisit: DepartmentFlatNode[] = this.treeControl.getDescendants(node); // Use CDK tree control method
      descendants.push(...nodesToVisit);
      return descendants;
    }

     // Helper to get the parent of a flat node
  private getParentNode(node: DepartmentFlatNode): DepartmentFlatNode | null {
    const currentLevel = node.level;
    if (currentLevel < 1) {
      return null; // Root node
    }
    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;
    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (currentNode.level < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  clearFilter(): void {
    this.filterControl.setValue('');
    // applyFilter will be called automatically by valueChanges
  }

  private buildTree(departments: Department[]): Department[] {
    const map = new Map<string, Department>();
    const roots: Department[] = [];
    // Initialize map and clear existing children arrays (important for reloads)
    departments.forEach(dept => {
        dept.children = []; // Ensure children array is fresh
        map.set(dept.serialId, dept);
    });
    // Link children to parents
    departments.forEach(dept => {
      if (dept.parentSerialId && map.has(dept.parentSerialId)) {
        map.get(dept.parentSerialId)!.children!.push(dept);
      } else if (!dept.parentSerialId) {
        roots.push(dept);
      }
    });
    // Optional: Sort roots and children alphabetically
    const sortFn = (a: Department, b: Department) => a.name.localeCompare(b.name);
    roots.sort(sortFn);
    map.forEach(dept => dept.children?.sort(sortFn));
    return roots;
  }

  hasChild = (_: number, nodeData: DepartmentFlatNode): boolean => nodeData.expandable;

   // --- Parent Filtering Logic ---
   private getAllDescendantSerialIds(targetSerialId: string, allDeptsMap: Map<string, Department>): Set<string> {
        
        const descendantIds = new Set<string>();
        const queue: string[] = [];

        // Find direct children to start the queue
        for (const dept of allDeptsMap.values()) {
            if (dept.parentSerialId === targetSerialId) {
                queue.push(dept.serialId);
            }
        }

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (!descendantIds.has(currentId)) {
                descendantIds.add(currentId);
                // Add children of the current node to the queue
                for (const dept of allDeptsMap.values()) {
                    if (dept.parentSerialId === currentId) {
                        queue.push(dept.serialId);
                    }
                }
            }
        }
        return descendantIds;
    }


    private getPotentialParents(nodeBeingEdited: DepartmentFlatNode | null, allDepartments: Department[]): Department[] {
        if (!nodeBeingEdited) {
            // Creating new: all existing departments are potential parents
            return allDepartments;
        }

        // Editing: exclude the node itself and all its descendants
        const nodeSerialId = nodeBeingEdited.originalData.serialId; // Use originalData's serialId
        const allDeptsMap = new Map(allDepartments.map(d => [d.serialId, d]));
        const descendantIds = this.getAllDescendantSerialIds(nodeSerialId, allDeptsMap);
        const excludedIds = new Set<string>([nodeSerialId, ...descendantIds]);

        return allDepartments.filter(dept => !excludedIds.has(dept.serialId));
    }

  // --- CRUD Actions ---
  addRootDepartment(): void {
    const potentialParents = this.flatDepartments; // All are potential parents
    const dialogData: DepartmentDialogData = {
      isEditMode: false,
      parentSerialId: null, // Explicitly null for root
      accountId: this.accountId,
      potentialParents: potentialParents
    };
    this.openDialog(dialogData);
  }

  addChildDepartment(node: DepartmentFlatNode): void {
     const potentialParents = this.flatDepartments; // All are potential parents
    const dialogData: DepartmentDialogData = {
      isEditMode: false,
      parentSerialId: node.serialId, // Pass parent's serial_id
      accountId: this.accountId,
      potentialParents: potentialParents
    };
    this.openDialog(dialogData);
  }

   editDepartment(node: DepartmentFlatNode): void {
    const potentialParents = this.getPotentialParents(node, this.flatDepartments);
    const dialogData: DepartmentDialogData = {
      isEditMode: true,
      // Pass the original full department data for editing from the flat node
      nodeToEdit: node.originalData, // Important change here for edit dialog
      accountId: this.accountId,
      potentialParents: potentialParents
    };
    this.openDialog(dialogData);
  }

  confirmDeleteDepartment(node: DepartmentFlatNode): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px', // Slightly wider for longer message
      data: {
        title: this.translate.instant('DEPARTMENT.TREE.CONFIRM_DELETE_TITLE'),
        message: this.translate.instant('DEPARTMENT.TREE.CONFIRM_DELETE_MESSAGE', {
            departmentName: node.name,
            serialId: node.serialId
        }),
        confirmButtonText: this.translate.instant('COMMON.BUTTONS.DELETE'),
        cancelButtonText: this.translate.instant('COMMON.BUTTONS.CANCEL')
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
        if (confirmed) {
          this.deleteDepartment(node.serialId);
        }
      });
  }

  private deleteDepartment(serialId: string): void {
    this.isLoading = true; // Show loading indicator
    this.cdr.markForCheck();

    this.departmentService.deleteDepartment(this.accountId, serialId)
      .pipe(
        finalize(() => {
          this.isLoading = false; // Hide loading indicator
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
          next: () => {
              this.snackBar.open(this.translate.instant('DEPARTMENT.SUCCESS.DELETED'), this.translate.instant('COMMON.BUTTONS.OK'), { duration: 3000 });
              this.loadDepartments(); // Refresh the tree
          },
          error:(err:any) => {
              this.error = err.message; // Service already translated it
              this.snackBar.open(this.error || '', this.translate.instant('COMMON.BUTTONS.DISMISS'), { duration: 7000 });
          }
      });
  }

  // --- Dialog Handling ---
  private openDialog(dialogData: DepartmentDialogData): void {
    if (!dialogData.accountId) {
        // ... error handling ...
        return;
    }

    const dialogRef = this.dialog.open(DepartmentDialogComponent, {
        width: '500px',
        maxWidth: '95vw',
        disableClose: true,
        data: dialogData
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {

        if (result && typeof result === 'object' && result.serial_id) { 
            const savedDepartment = result as DepartmentDto;
            const messageKey = dialogData.isEditMode ? 'DEPARTMENT.SUCCESS.UPDATED' : 'DEPARTMENT.SUCCESS.CREATED';
            this.snackBar.open(
                this.translate.instant(messageKey),
                this.translate.instant('COMMON.BUTTONS.OK'), { duration: 3000 }
            );

            this.loadDepartments();

        } else if (result === true) {
             // If dialog only returns 'true' on success (less info)
             const messageKey = dialogData.isEditMode ? 'DEPARTMENT.SUCCESS.UPDATED' : 'DEPARTMENT.SUCCESS.CREATED';
             this.snackBar.open(
                  this.translate.instant(messageKey),
                  this.translate.instant('COMMON.BUTTONS.OK'), { duration: 3000 }
             );
             this.loadDepartments(); // Still need to reload to get the new data
        }
        // If result is null/false/undefined, the dialog was cancelled - do nothing.
    });
}

    trackByFn(index: number, node: DepartmentFlatNode) {
      return node.serialId; // or node.serialId
    }

}