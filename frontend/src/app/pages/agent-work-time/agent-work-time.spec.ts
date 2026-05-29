import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentWorkTime } from './agent-work-time';

describe('AgentWorkTime', () => {
  let component: AgentWorkTime;
  let fixture: ComponentFixture<AgentWorkTime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentWorkTime],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentWorkTime);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
