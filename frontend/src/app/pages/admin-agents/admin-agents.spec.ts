import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminAgents } from './admin-agents';

describe('AdminAgents', () => {
  let component: AdminAgents;
  let fixture: ComponentFixture<AdminAgents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAgents],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAgents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
