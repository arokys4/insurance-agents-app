import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCalendar } from './admin-calendar';

describe('AdminCalendar', () => {
  let component: AdminCalendar;
  let fixture: ComponentFixture<AdminCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCalendar],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
