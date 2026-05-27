import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminWorkTime } from './admin-work-time';

describe('AdminWorkTime', () => {
  let component: AdminWorkTime;
  let fixture: ComponentFixture<AdminWorkTime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminWorkTime],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminWorkTime);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
