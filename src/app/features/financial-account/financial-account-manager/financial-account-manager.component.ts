import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms'; // Added ReactiveFormsModule, FormControl
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Subject, Observable, combineLatest, of } from 'rxjs';
import { catchError, map, switchMap, takeUntil, tap, startWith, shareReplay, debounceTime, distinctUntilChanged } from 'rxjs/operators'; // Added debounceTime, distinctUntilChanged
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field'; // Added
import { MatInputModule } from '@angular/material/input'; // Added
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { FinancialAccount, FinancialAccountNode, FinancialAccountType } from '../../../models/financial-account.model';
import { FinancialAccountService } from '../../../core/services/FinancialAccountService';
import { FinancialAccountTypeService } from '../../../core/services/FinancialAccountTypeService';
import { FinancialAccountDialogComponent, FinancialAccountDialogData } from '../../../features/financial-account/financial-account-dialog/financial-account-dialog.component';
import { FinancialAccountTreeComponent } from '../../../features/financial-account/financial-account-tree/financial-account-tree.component';
import { FinancialAccountListComponent } from '../../../features/financial-account/financial-account-list/financial-account-list.component';
import { AuthService } from '../../../core/services/auth.service';


interface ViewData {
  isLoading: boolean;
  error: string | null;
  treeData: FinancialAccountNode[];
  flatNodeData: FinancialAccountNode[]; // Pass nodes with level info
  accountTypes: FinancialAccountType[];
  accountId: number | null;
  originalFlatNodes: FinancialAccountNode[]; // All nodes, unfiltered, for dialogs & context
  searchTerm: string;
}

@Component({
  selector: 'app-financial-account-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslateModule,
    FinancialAccountTreeComponent, // Import child components
    FinancialAccountListComponent,
  ],
  templateUrl: './financial-account-manager.component.html',
  styleUrls: ['./financial-account-manager.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialAccountManagerComponent implements OnInit, OnDestroy {
  // --- Injections ---
  private route = inject(ActivatedRoute);
  private faService = inject(FinancialAccountService);
  private faTypeService = inject(FinancialAccountTypeService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private authService = inject(AuthService);
  // --- State ---
  viewMode: 'tree' | 'table' = 'tree';
  searchControl = new FormControl(''); // For search input
  private accountId: number | null = null;
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);
  private destroy$ = new Subject<void>();
  // Combined view data observable
  viewData$: Observable<ViewData>;

  // --- Lifecycle ---
  constructor() {
    const accountId$ = this.authService.getUserObservable.pipe(
      takeUntil(this.destroy$),
      map(user => user?.account_id),
      tap(idNum => { // Changed idStr to idNum as it's already a number or undefined
        if (idNum === undefined || idNum === null || isNaN(idNum)) {
          console.error("Invalid or missing Account ID in user login.");
          this.accountId = null;
          throw new Error("Invalid Account ID");
        }
        this.accountId = +idNum;
      }),
      map(() => this.accountId),
      shareReplay(1)
    );

    const debouncedSearchTerm$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map(term => term ? term.trim().toLowerCase() : ''), // Trim and lowercase
      takeUntil(this.destroy$)
    );

    const dataFetch$ = combineLatest([accountId$, this.refreshTrigger$]).pipe(
      switchMap(([accId]) => {
        if (accId === null) {
          return of({ isLoading: false, error: 'Invalid Account ID', data: [], types: [] });
        }
        return combineLatest([
          this.faService.getFinancialAccountsByAccount(accId).pipe(startWith(null)),
          this.faTypeService.getAccountTypes().pipe(startWith(null))
        ]).pipe(
          map(([accounts, types]) => ({
            isLoading: accounts === null || types === null,
            error: null,
            // Populate accountTypeName here for easier searching later
            data: accounts ? accounts.map(acc => ({
                ...acc,
                accountTypeName: types?.find(t => t.id === acc.accountTypeId)?.name ?? String(acc.accountTypeId)
            })) : [],
            types: types || []
          })),
          catchError(err => {
            console.error("Error fetching financial account data:", err);
            const errorMsg = err.message || this.translate.instant('FIN_ACCOUNT.ERRORS.LOAD_FAILED');
            return of({ isLoading: false, error: errorMsg, data: [], types: [] });
          })
        );
      }),
      shareReplay(1)
    );

    this.viewData$ = combineLatest([
      accountId$,
      dataFetch$,
      debouncedSearchTerm$
    ]).pipe(
      map(([accId, fetchedData, searchTerm]) => {
        if (fetchedData.isLoading) {
          return {
            isLoading: true, error: null, treeData: [], flatNodeData: [],
            accountTypes: [], accountId: accId, originalFlatNodes: [], searchTerm
          };
        }
        if (fetchedData.error) {
          return {
            isLoading: false, error: fetchedData.error, treeData: [], flatNodeData: [],
            accountTypes: fetchedData.types, accountId: accId, originalFlatNodes: [], searchTerm
          };
        }

        const allProcessedData = this.processFetchedData(fetchedData.data);
        const filteredFlatNodesForList = this.filterFlatList(allProcessedData.flatNodes, searchTerm, fetchedData.types);
        const treeForDisplay = this.buildTreeFromFilterResult(filteredFlatNodesForList, allProcessedData.flatNodes, searchTerm);

        return {
          isLoading: false,
          error: null,
          treeData: treeForDisplay,
          flatNodeData: filteredFlatNodesForList,
          accountTypes: fetchedData.types,
          accountId: accId,
          originalFlatNodes: allProcessedData.flatNodes,
          searchTerm: searchTerm
        };
      }),
      takeUntil(this.destroy$)
    );
  }

  ngOnInit(): void {
    // Initial data load triggered by combineLatest
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private processFetchedData(flatList: FinancialAccount[]): { tree: FinancialAccountNode[], flatNodes: FinancialAccountNode[] } {
    if (!flatList || flatList.length === 0) {
      return { tree: [], flatNodes: [] };
    }
    const tree: FinancialAccountNode[] = [];
    const lookup: { [key: string]: FinancialAccountNode } = {};
    const flatNodesWithLevel: FinancialAccountNode[] = [];

    flatList.forEach(item => {
      lookup[item.serialId] = { ...item, children: [], level: 0, expandable: false } as FinancialAccountNode;
    });

    flatList.forEach(item => {
      const node = lookup[item.serialId];
      if (item.parentSerialId && lookup[item.parentSerialId]) {
        const parentNode = lookup[item.parentSerialId];
        parentNode.children = parentNode.children || [];
        parentNode.children.push(node);
        parentNode.expandable = true;
        // node.level will be set during flat node build
      } else {
        node.level = 0;
        tree.push(node);
      }
    });
    
    // Sort root nodes before building flat list for consistent flat list order from roots
    tree.sort((a, b) => a.name.localeCompare(b.name)); 
    // Recursively sort children for consistent tree structure display later
    const sortChildrenRecursive = (nodes: FinancialAccountNode[]) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          node.children.sort((a,b) => a.name.localeCompare(b.name));
          sortChildrenRecursive(node.children);
        }
      });
    };
    sortChildrenRecursive(tree);


    const buildFlatNodesRecursive = (nodes: FinancialAccountNode[], level: number) => {
      nodes.forEach(node => {
        node.level = level;
        node.expandable = !!node.children && node.children.length > 0;
        flatNodesWithLevel.push(node);
        if (node.children && node.children.length > 0) {
          buildFlatNodesRecursive(node.children, level + 1);
        }
      });
    };
    
    buildFlatNodesRecursive(tree, 0);

    return { tree, flatNodes: flatNodesWithLevel };
  }

  private filterFlatList(
    nodes: FinancialAccountNode[],
    searchTerm: string,
    accountTypes: FinancialAccountType[] // Needed if accountTypeName wasn't pre-populated
  ): FinancialAccountNode[] {
    if (!searchTerm) {
      return nodes;
    }
    return nodes.filter(node => {
      const typeName = node.accountTypeName || accountTypes.find(t => t.id === node.accountTypeId)?.name || '';
      return node.name.toLowerCase().includes(searchTerm) ||
             node.serialId.toLowerCase().includes(searchTerm) ||
             typeName.toLowerCase().includes(searchTerm);
    });
  }

  private buildTreeFromFilterResult(
    directlyMatchingFlatNodes: FinancialAccountNode[],
    allOriginalFlatNodes: FinancialAccountNode[],
    searchTerm: string
  ): FinancialAccountNode[] {
    if (!searchTerm) {
      // No search term, rebuild tree from all original flat nodes
      // This ensures the tree structure is correct and sorted as per processFetchedData
      return this.rebuildTreeFromFlatList(allOriginalFlatNodes);
    }
    if (!directlyMatchingFlatNodes.length) {
      return []; // No matches, empty tree
    }

    const nodesToIncludeInTree = new Map<string, FinancialAccountNode>();
    // Create a map of *copies* of original nodes to avoid modifying them directly, especially children arrays
    const allOriginalNodesMap = new Map(
      allOriginalFlatNodes.map(n => [n.serialId, { ...n, children: [], expandable: false }])
    );

    for (const matchedNode of directlyMatchingFlatNodes) {
      let currentSerialId: string | undefined | null = matchedNode.serialId;
      while (currentSerialId && allOriginalNodesMap.has(currentSerialId)) {
        if (!nodesToIncludeInTree.has(currentSerialId)) {
          // Add the (copied) node from our map
          nodesToIncludeInTree.set(currentSerialId, allOriginalNodesMap.get(currentSerialId)!);
        }
        const currentNodeDetails:any = allOriginalNodesMap.get(currentSerialId)!;
        currentSerialId = currentNodeDetails.parentSerialId;
      }
    }

    const tree: FinancialAccountNode[] = [];
    nodesToIncludeInTree.forEach(node => {
      // node.children is already an empty array from allOriginalNodesMap copy
      if (node.parentSerialId && nodesToIncludeInTree.has(node.parentSerialId)) {
        const parentNode = nodesToIncludeInTree.get(node.parentSerialId)!;
        parentNode.children!.push(node);
      } else if (!node.parentSerialId) {
        tree.push(node);
      }
    });
    
    // Finalize 'expandable' and sort children within the filtered tree
    const finalizeAndSortTree = (nodes: FinancialAccountNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name)); // Sort current level
      nodes.forEach(n => {
        n.expandable = n.children !== undefined && n.children.length > 0;
        if (n.expandable) {
          finalizeAndSortTree(n.children!);
        }
      });
    };
    finalizeAndSortTree(tree);
    return tree;
  }

  // Helper to rebuild a complete tree structure from a flat list (used when no search term)
  private rebuildTreeFromFlatList(flatList: FinancialAccountNode[]): FinancialAccountNode[] {
      const treeRoots: FinancialAccountNode[] = [];
      const lookup = new Map<string, FinancialAccountNode>();

      // Create copies and initialize children arrays
      flatList.forEach(item => {
          lookup.set(item.serialId, { ...item, children: [], expandable: false });
      });

      flatList.forEach(item => {
          const node = lookup.get(item.serialId)!;
          if (item.parentSerialId && lookup.has(item.parentSerialId)) {
              const parentNode = lookup.get(item.parentSerialId)!;
              parentNode.children!.push(node);
              parentNode.expandable = true; // Mark parent as expandable
          } else if (!item.parentSerialId) { // It's a root node
              treeRoots.push(node);
          }
      });
      
      // Sort root nodes and their children recursively for consistent display
      const sortNodesRecursive = (nodes: FinancialAccountNode[]) => {
        nodes.sort((a, b) => a.name.localeCompare(b.name));
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                sortNodesRecursive(node.children);
            }
        });
      };
      sortNodesRecursive(treeRoots);
      return treeRoots;
  }


  private getPotentialParents(
    nodeBeingHandled: FinancialAccountNode | null,
    allNodesMap: Map<string, FinancialAccountNode>
  ): FinancialAccount[] {
    if (!nodeBeingHandled) {
      return Array.from(allNodesMap.values()).map(n => n as FinancialAccount); // Cast if needed
    }

    const nodeSerialId = nodeBeingHandled.serialId;
    const descendantIds = new Set<string>();
    const queue: FinancialAccountNode[] = nodeBeingHandled.children ? [...nodeBeingHandled.children] : [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      descendantIds.add(current.serialId);
      if (current.children) { // Check against original children if available, or re-fetch if necessary
        // This part might be tricky if nodeBeingHandled.children isn't the full original children list
        // Best to use the allNodesMap to find children from the original structure
        const originalNodeFromMap = allNodesMap.get(current.serialId);
        if (originalNodeFromMap && originalNodeFromMap.children) {
             queue.push(...originalNodeFromMap.children);
        }
      }
    }
    // More robust way to get descendants using the full map
    const getAllDescendantIds = (startNodeSerialId: string, map: Map<string, FinancialAccountNode>): Set<string> => {
        const descIds = new Set<string>();
        const q: string[] = [startNodeSerialId];
        const visited = new Set<string>(); // To prevent infinite loops with bad data

        while (q.length > 0) {
            const currentId = q.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Iterate over all nodes to find children of currentId
            map.forEach(node => {
                if (node.parentSerialId === currentId) {
                    if (node.serialId !== startNodeSerialId) { // Don't add the start node itself as its own descendant
                       descIds.add(node.serialId);
                    }
                    q.push(node.serialId);
                }
            });
        }
        return descIds;
    };
    const allDescendants = getAllDescendantIds(nodeSerialId, allNodesMap);


    const excludedIds = new Set<string>([nodeSerialId, ...allDescendants]);
    return Array.from(allNodesMap.values()).filter(node => !excludedIds.has(node.serialId)).map(n => n as FinancialAccount);
  }

  refreshData(): void {
    this.refreshTrigger$.next();
  }

  openCreateRootDialog(accountTypes: FinancialAccountType[], originalFlatNodes: FinancialAccountNode[]): void {
    if (this.accountId === null) return;
    const allNodesMap = new Map(originalFlatNodes.map(n => [n.serialId, n]));
    const potentialParents = this.getPotentialParents(null, allNodesMap);

    this.openDialog({
      isEditMode: false,
      accountId: this.accountId,
      accountTypes: accountTypes,
      potentialParents: potentialParents,
    });
  }

  handleOpenDialog(event: {
    mode: 'create' | 'edit';
    node?: FinancialAccountNode;
    parentNode?: FinancialAccountNode;
    accountTypes: FinancialAccountType[];
    flatNodes: FinancialAccountNode[]; // These are the originalFlatNodes from viewData
  }): void {
    if (this.accountId === null) return;

    const allNodesMap = new Map(event.flatNodes.map(n => [n.serialId, n]));
    let potentialParents: FinancialAccount[] = [];
    let parentSerialId: string | undefined | null = undefined;

    if (event.mode === 'edit' && event.node) {
      potentialParents = this.getPotentialParents(event.node, allNodesMap);
    } else if (event.mode === 'create') {
      potentialParents = this.getPotentialParents(null, allNodesMap);
      parentSerialId = event.parentNode?.serialId;
    }

    this.openDialog({
      isEditMode: event.mode === 'edit',
      node: event.node,
      parentSerialId: parentSerialId,
      accountId: this.accountId,
      accountTypes: event.accountTypes,
      potentialParents: potentialParents,
    });
  }

  private openDialog(dialogData: Omit<FinancialAccountDialogData, 'node'> & { node?: FinancialAccountNode }): void {
    if (dialogData.accountId === null) {
      console.error("Cannot open dialog without a valid Account ID.");
      return;
    }

    const dialogRef = this.dialog.open(FinancialAccountDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.refreshData();
          const messageKey = dialogData.isEditMode ? 'FIN_ACCOUNT.SUCCESS.UPDATED' : 'FIN_ACCOUNT.SUCCESS.CREATED';
          this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('COMMON.BUTTONS.OK'), { duration: 3000 });
        }
      });
  }

  handleDeleteRequest(event: { node: FinancialAccountNode }): void {
    if (this.accountId === null || !event.node) return;
    // TODO: Add confirmation dialog before deleting
    // Example:
    // const confirmation = confirm(this.translate.instant('COMMON.CONFIRM_DELETE', { item: event.node.name }));
    // if (!confirmation) return;

    this.faService.deleteFinancialAccount(this.accountId, event.node.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.refreshData();
          this.snackBar.open(this.translate.instant('FIN_ACCOUNT.SUCCESS.DELETED'), this.translate.instant('COMMON.BUTTONS.OK'), { duration: 3000 });
        },
        error: (err) => {
          console.error("Error deleting financial account:", err);
          this.snackBar.open(err.message || this.translate.instant('FIN_ACCOUNT.ERRORS.DELETE_FAILED'), this.translate.instant('COMMON.BUTTONS.DISMISS'), { duration: 5000 });
        }
      });
  }
}
