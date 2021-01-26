import { OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

// Created to support best practices for unsubscribe:
// see https://www.intertech.com/Blog/angular-best-practice-unsubscribing-rxjs-observables/
// Usage:
// Instead of:
// ngOnInit() {
//   this.subscriptions.add(this.service.Subject1.subscribe(() => {}));
// ...do this:
// ngOnInit() {
//  this.service.Subject1.pipe(takeUntil(this.ngUnsubscribe))
//    .subscribe(() => {});
// where the class with ngOnInit starts as export class MyComponent extends BaseComponent
//
// Overloaded a bit by adding in a common event handler, noMouseFocus, for use across its subclasses, too.
export class BaseComponent implements OnDestroy {
  ngUnsubscribe = new Subject<void>();

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  public noMouseFocus($event: MouseEvent): void {
    // Stop mouse clicks from focusing on a non-interactive element with a tabindex of "-1" (e.g., managed focus moves
    // focus to it in code, but users not expected to focus it via keyboard or mouse, such as a header element.)
    $event.preventDefault();
  }
}
