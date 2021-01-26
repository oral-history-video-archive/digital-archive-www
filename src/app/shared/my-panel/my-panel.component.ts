import { Component, Input, Output, EventEmitter } from '@angular/core';
import { BaseComponent } from '../base.component';

// NOTE: thanks to https://training.fabiobiondi.io/2017/07/10/create-an-accordion-component-in-angular-parent-children-communication/
// inspiring this "panel", to replace former reliance on Bootstrap 3 panel behavior via JS.
// Use:
//  <my-panel *ngFor="let facet of ManyFacets"
//    [title]="facet.name" [opened]="facet.opened"
//    (toggle)="facet.opened = !facet.opened"> {{facet.desc}} </my-panel>
//
// Accessibility concerns raised the need to set the focus programmatically to the button controlling the display
// of contents within.  That is accomplished through the setFocusToButtonHoldingMenu property: when set to true,
// it will trigger a focus() action on the button.

@Component({
    selector: 'my-panel',
    templateUrl: './my-panel.component.html',
    styleUrls: ['./my-panel.component.scss']
})

export class MyPanelComponent extends BaseComponent {
  @Input() opened:boolean = false;
  @Input() title: string;
  @Input() markAsGrandparent:boolean = false;
  @Input() overrideToH4Nesting: boolean = false;
  @Input() markAsReverse:boolean = false;
  @Input() setFocusToButtonHoldingMenu:boolean = false;

  @Output() toggle: EventEmitter<any> = new EventEmitter<any>();

    constructor() {
        super();
    }
}
