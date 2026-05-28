import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentCalendar } from './agent-calendar';

describe('AgentCalendar', () => {
  let component: AgentCalendar;
  let fixture: ComponentFixture<AgentCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentCalendar],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
