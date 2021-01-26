import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BaseComponent } from '../base.component';

// NOTE: thanks to https://training.fabiobiondi.io/2017/07/10/create-an-accordion-component-in-angular-parent-children-communication/
// inspiring this "panel", to replace former reliance on Bootstrap 3 panel behavior via JS.
// Use:
//  <my-panel-of-buttons *ngFor="let facet of ManyFacets"
//    [title]="facet.name" [opened]="facet.opened"
//    (toggle)="facet.opened = !facet.opened"> {{facet.desc}} </my-panel-of-buttons>
//
// Accessibility concerns raised the need to set the focus programmatically to the button controlling the display
// of contents within.  That is accomplished through the setFocusToButtonHoldingMenu property: when set to true,
// it will trigger a focus() action on the button.

@Component({
    selector: 'my-panel-of-buttons',
    templateUrl: './my-panel-of-buttons.component.html',
    styleUrls: ['./my-panel-of-buttons.component.scss']
})

export class MyPanelOfButtonsComponent extends BaseComponent {
  @Input() opened:boolean = false;
  @Input() hasMenu:boolean = true;
  @Input() overrideToH4Nesting: boolean = false;
  @Input() title: string;
  @Input() markAsGrandparent:boolean = false;
  @Input() markAsReverse:boolean = false;
  @Input() setFocusToButtonHoldingMenu:boolean = false;

  @Output() toggle: EventEmitter<any> = new EventEmitter<any>();

    constructor() {
        super();
    }
}
