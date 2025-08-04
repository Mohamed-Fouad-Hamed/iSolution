import {
    Directive,
    AfterViewInit,
    Input,
    OnDestroy
  } from '@angular/core';
  import { MatPaginator } from '@angular/material/paginator';
  import { CommonModule } from '@angular/common';
  
  @Directive({
    selector: '[appCustomPaginatorBehavior]',
    standalone: true,
  })
  export class CustomPaginatorBehaviorDirective implements AfterViewInit, OnDestroy {
    @Input('appCustomPaginatorBehavior') paginator!: MatPaginator;
  
    @Input() onNextPage: () => void = () => this.defaultNext();
    @Input() onPreviousPage: () => void = () => this.defaultPrevious();
    @Input() onFirstPage: () => void = () => this.defaultFirst();
    @Input() onLastPage: () => void = () => this.defaultLast();
  
    private removeListeners: (() => void)[] = [];
  
    ngAfterViewInit(): void {
      if (!this.paginator || !(this.paginator as any)._elementRef) return;
  
      const nativeEl = (this.paginator as any)._elementRef.nativeElement;
  
      this.hookClick(nativeEl, '.mat-paginator-navigation-previous', this.onPreviousPage);
      this.hookClick(nativeEl, '.mat-paginator-navigation-next', this.onNextPage);
      this.hookClick(nativeEl, '.mat-paginator-navigation-first', this.onFirstPage);
      this.hookClick(nativeEl, '.mat-paginator-navigation-last', this.onLastPage);
    }
  
    private hookClick(container: HTMLElement, selector: string, handler: () => void) {
      const el = container.querySelector(selector);
      if (el) {
        const listener = (e: any) => {
          e.stopImmediatePropagation();
          e.preventDefault();
          handler();
        };
        el.addEventListener('click', listener);
        this.removeListeners.push(() => el.removeEventListener('click', listener));
      }
    }
  
    private defaultNext() {
      if (this.paginator.hasNextPage()) {
        this.paginator.nextPage();
      }
    }
  
    private defaultPrevious() {
      if (this.paginator.hasPreviousPage()) {
        this.paginator.previousPage();
      }
    }
  
    private defaultFirst() {
      this.paginator.firstPage();
    }
  
    private defaultLast() {
      const totalPages = Math.ceil(this.paginator.length / this.paginator.pageSize);
      this.paginator.pageIndex = totalPages - 1;
      (this.paginator as any)._changePageSize(this.paginator.pageSize);
    }
  
    ngOnDestroy(): void {
      this.removeListeners.forEach(unsub => unsub());
    }
  }
  