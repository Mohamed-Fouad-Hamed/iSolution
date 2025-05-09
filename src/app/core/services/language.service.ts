// src/app/core/services/language.service.ts
import { Injectable, signal, effect, Inject, Renderer2, RendererFactory2, computed, WritableSignal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Directionality } from '@angular/cdk/bidi'; // <--- Import Directionality
import { BehaviorSubject, Observable } from 'rxjs';
import { filter , distinctUntilChanged } from 'rxjs/operators';

export interface Language {
  code: string;
  name: string;
  dir: 'ltr' | 'rtl'; // <--- Direction is part of the language definition
}

export type TextDirection = 'ltr' | 'rtl';

const LANG_KEY = 'app-lang';

@Injectable({
  providedIn: 'root',
})

export class LanguageService {

  private renderer: Renderer2;
  private _isBrowser: boolean;

  
  readonly supportedLanguages: Language[] = [
    { code: 'en', name: 'English', dir: 'ltr' }, // LTR language
    { code: 'ar', name: 'العربية', dir: 'rtl' }, // RTL language
    // Add more languages with their correct 'dir'
  ];

 

  private directionalityUpdated : WritableSignal<boolean>= signal<boolean>(false); // Signal جديد

  // Signal عام يمكن للمكونات استخدامه لمعرفة الجاهزية
  isDirectionReady = computed(() => this.directionalityUpdated()); // استخدام computed
  
  currentLanguage = signal<Language>(this.supportedLanguages[0]);

  private directionSubject = new BehaviorSubject<TextDirection | null>(null);


  public direction$: Observable<TextDirection> = this.directionSubject.pipe(
 
    filter((dir): dir is TextDirection => dir !== null),
    distinctUntilChanged() 
  );

  constructor(
    private translate: TranslateService,
    @Inject(DOCUMENT) private document: Document,
    private directionality: Directionality, // <--- Inject Directionality
    rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this._isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

   // --- إضافة خيار allowSignalWrites: true ---
   effect(() => {
    const lang = this.currentLanguage();
    console.log('[LanguageService Effect] Running for lang:', lang.code);
    if (this._isBrowser) {
      // --- إعادة تعيين الإشارة ---
      // هذه الكتابة مسموح بها الآن بسبب الخيار أدناه
      this.directionalityUpdated.set(false);
      console.log('[LanguageService Effect] isDirectionReady set to false');

      this.translate.use(lang.code);
      localStorage.setItem(LANG_KEY, lang.code);
      this.renderer.setAttribute(this.document.documentElement, 'lang', lang.code);
      this.renderer.setAttribute(this.document.documentElement, 'dir', lang.dir);

      if (this.directionality.value !== lang.dir) {
         (this.directionality as any).value = lang.dir;
         console.log('[LanguageService Effect] Directionality updated to:', this.directionality.value);
      } else {
         console.log('[LanguageService Effect] Directionality already:', this.directionality.value);
      }

      // --- جدولة تحديث الإشارة الأخرى ---
      // الكتابة داخل setTimeout آمنة أيضًا بسبب الخيار
      setTimeout(() => {
          this.directionalityUpdated.set(true);
          console.log('[LanguageService Effect] isDirectionReady set to true (after timeout)');
      }, 0);

      console.log(`[LanguageService Effect] Finished sync updates for ${lang.code}`);
    } else {
      // تأكد من تعيين الحالة الأولية لـ SSR/Prerender
      if (!this._isBrowser) {
          this.directionalityUpdated.set(true);
          console.log('[LanguageService Effect] Setting ready for non-browser');
      }
    }
  }, { allowSignalWrites: true }); // <--- *** الخيار الهام هنا ***

    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    // ... (initialization logic remains the same - it sets the signal, triggering the effect)
    if (!this._isBrowser) return;

    const storedLangCode = localStorage.getItem(LANG_KEY);
    const browserLang = this.translate.getBrowserLang()?.split('-')[0]; // Get base lang code

    let initialLangCode = this.translate.defaultLang;

    if (storedLangCode && this.supportedLanguages.some(l => l.code === storedLangCode)) {
      initialLangCode = storedLangCode;
    } else if (browserLang && this.supportedLanguages.some(l => l.code === browserLang)) {
       initialLangCode = browserLang;
    }

    const initialLang = this.supportedLanguages.find(l => l.code === initialLangCode) || this.supportedLanguages[0];
    this.currentLanguage.set(initialLang); // This triggers the effect on startup
    this.directionSubject.next(initialLang.dir || 'rtl');
  }

  setLanguage(langCode: string): void {
    // ... (setLanguage logic remains the same - it sets the signal, triggering the effect)
    const selectedLang = this.supportedLanguages.find(l => l.code === langCode);
    if (selectedLang) {
      this.currentLanguage.set(selectedLang);
    } else {
      console.warn(`Language code "${langCode}" is not supported.`);
    }
  }

  getLanguages(): Language[] {
    return this.supportedLanguages;
  }
}