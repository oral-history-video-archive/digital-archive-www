import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

// NOTE: inspired by https://coderanch.com/t/675897/languages/programmatically-manage-focus-Angular-app
// and https://blog.angular-university.io/angular-debugging/ and https://matthewdavis.io/auto-focus-with-angular-7-the-directive/
// Goal: focus a certain DOM element!
@Directive({ selector: '[thdaIsFocused]' })
export class FocusMeDirective {
    private el: HTMLElement;

    constructor(private _renderer: Renderer2, el: ElementRef) {
        this.el = el.nativeElement;
    }

    @Input() set thdaIsFocused(condition: boolean) {
        if (condition && this.el) {
            this.el.focus(); // this makes call web worker safe
        }
    }
}
