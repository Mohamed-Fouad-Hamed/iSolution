import { Injectable, RendererFactory2, Inject, Renderer2 } from '@angular/core';
import { DOCUMENT  } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentTheme: 'light' | 'dark' = 'light'; // Default

  constructor(
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initializeTheme();
  }

  private initializeTheme() {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Priority: LocalStorage > System Preference > Default (Light)
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    this.setTheme(initialTheme);

    // Optional: Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        // Only change if no theme explicitly set by user in localStorage
        if (!localStorage.getItem('theme')) {
            this.setTheme(e.matches ? 'dark' : 'light');
        }
    });
  }

  isDarkMode(): boolean {
    return this.currentTheme === 'dark';
  }

  setTheme(theme: 'light' | 'dark') {
    this.currentTheme = theme;
    if (theme === 'dark') {
      this.renderer.addClass(this.document.body, 'dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      this.renderer.removeClass(this.document.body, 'dark-theme');
      localStorage.setItem('theme', 'light');
    }
    // Optional: Update Material theme dynamically if needed, though class toggle often suffices
  }

  toggleTheme() {
    this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
  }
}