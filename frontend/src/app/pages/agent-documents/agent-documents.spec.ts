import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentDocuments } from './agent-documents';

describe('AgentDocuments', () => {
  let component: AgentDocuments;
  let fixture: ComponentFixture<AgentDocuments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentDocuments],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentDocuments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
