import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

const PREVIOUS_PAGE = 'COMMON.PAGINATOR.PREVIOUS';
const NEXT_PAGE = 'COMMON.PAGINATOR.NEXT';
const ITEMS_PER_PAGE = 'COMMON.PAGINATOR.ITEMS_PER_PAGE';
const RANGE_EMPTY = 'COMMON.PAGINATOR.RANGE_EMPTY';
const RANGE ='COMMON.PAGINATOR.RANGE';

@Injectable()
export class CustomPaginatorIntl extends MatPaginatorIntl {
    constructor(private translate: TranslateService) {
        super();
        this.setLabels(); // أول مرة
        // كل ما تتغير اللغة نحدث الليبلات
        this.translate.onLangChange.subscribe(() => {
          this.setLabels();
          this.changes.next(); // عشان Angular Material تحدث الواجهة
        });
      }
    
      private setLabels() {
        this.itemsPerPageLabel = this.translate.instant(ITEMS_PER_PAGE);
        this.nextPageLabel = this.translate.instant(NEXT_PAGE);
        this.previousPageLabel = this.translate.instant(PREVIOUS_PAGE);
    
        this.getRangeLabel = (page: number, pageSize: number, length: number) => {
          if (length === 0 || pageSize === 0) return this.translate.instant(RANGE_EMPTY);
          const startIndex = page * pageSize;
          const endIndex = Math.min(startIndex + pageSize, length);
          return this.translate.instant(RANGE, {
            start: startIndex + 1,
            end: endIndex,
            total: length
          });
        };
      }
}