import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AppContentsComponent } from './app-contents.component';

describe('AppContentsComponent', () => {
  let component: AppContentsComponent;
  let fixture: ComponentFixture<AppContentsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AppContentsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppContentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
