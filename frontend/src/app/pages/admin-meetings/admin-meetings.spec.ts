import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminMeetings } from './admin-meetings';

describe('AdminMeetings', () => {
  let component: AdminMeetings;
  let fixture: ComponentFixture<AdminMeetings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMeetings],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminMeetings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
