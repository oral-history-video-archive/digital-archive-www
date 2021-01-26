import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

// NOTE: inspired by https://angular.io/docs/ts/latest/guide/attribute-directives.html, but without
// taking into account the cautions of http://stackoverflow.com/questions/36108995/what-are-some-good-alternatives-to-accessing-the-dom-using-nativeelement-in-angu
// Using https://angular.io/docs/ts/latest/guide/structural-directives.html to make it more like what we want....
// Goal: scroll a certain DOM element into view!
@Directive({ selector: '[thdaScrollToMe]' })
export class ScrollToMeDirective {
    private el: HTMLElement;

    constructor(private _renderer: Renderer2, el: ElementRef) { this.el = el.nativeElement; }

    @Input() set thdaScrollToMe(condition: boolean) {
        if (condition && this.el) {
            this.el.scrollIntoView(false); // this makes call web worker safe, instead of directly calling this.el.scrollIntoView();
            this.el.focus(); // this makes call web worker safe, instead of directly calling this.el.scrollIntoView();
        }
    }
}
