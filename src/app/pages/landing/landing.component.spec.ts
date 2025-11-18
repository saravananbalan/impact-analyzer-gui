import { TestBed } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DropdownService } from '../../shared/services/dropdown.service';
import { of } from 'rxjs';

class MockDropdownService {
  getDropdownData() { return of({ data: [] }); }
}

describe('LandingComponent (unit)', () => {
  let fixture: any;
  let component: LandingComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent, HttpClientTestingModule],
      providers: [
        { provide: DropdownService, useClass: MockDropdownService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('parseReasoningToBullets', () => {
    it('should split numbered lists preserving numbering', () => {
      const text = '1. First point\n2) Second point\n3. Third';
      const bullets = component.parseReasoningToBullets(text);
      expect(bullets.length).toBe(3);
      expect(bullets[0]).toContain('1.');
      expect(bullets[1]).toContain('2)');
      expect(bullets[2]).toContain('3.');
    });

    it('should split dash bullets', () => {
      const text = '- one\n- two\n- three';
      const bullets = component.parseReasoningToBullets(text);
      expect(bullets.length).toBe(3);
      expect(bullets).toEqual(['one', 'two', 'three']);
    });

    it('should fallback to sentence split', () => {
      const text = 'This is a sentence. And another! Final?';
      const bullets = component.parseReasoningToBullets(text);
      expect(bullets.length).toBeGreaterThan(1);
    });
  });

  describe('updateDiff (LCS behavior)', () => {
    it('keeps unchanged lines and marks additions and removals', () => {
      component.selectedFile = { name: 'a', type: 'file', content: 'a\nb\nc' } as any;
      component.secondaryContent = 'a\nb\nX\nc';
      component.updateDiff();
      // expecting unchanged a,b then added X then unchanged c
      expect(component.diffLines.map(l => l.type)).toEqual(['unchanged','unchanged','added','unchanged']);
      expect(component.diffLines.map(l=>l.content)).toEqual(['a','b','X','c']);
    });

    it('handles removals correctly', () => {
      component.selectedFile = { name: 'a', type: 'file', content: '1\n2\n3' } as any;
      component.secondaryContent = '1\n3';
      component.updateDiff();
      expect(component.diffLines.map(l => l.type)).toEqual(['unchanged','removed','unchanged']);
      expect(component.diffLines.map(l=>l.content)).toEqual(['1','2','3']);
    });
  });

  describe('secondary content undo history', () => {
    it('records changes and can undo', () => {
      component.secondaryHistory = [];
      component.secondaryHistoryIndex = -1;
      component.onSecondaryContentChange('first');
      component.onSecondaryContentChange('second');
      component.onSecondaryContentChange('third');
      expect(component.secondaryHistory.length).toBeGreaterThanOrEqual(3);
      expect(component.canUndo).toBeTrue();
      component.undoCompareChange();
      expect(component.secondaryContent).toBe('second');
      expect(component.canUndo).toBeTrue();
      component.undoCompareChange();
      expect(component.secondaryContent).toBe('first');
      // now cannot undo further
      expect(component.canUndo).toBeFalse();
    });
  });

  describe('impactTreeToHtml and escapeHtml', () => {
    it('escapes HTML and renders nested lists', () => {
      const tree = [{ title: '<root>', subtitle: 'sub', risk: 5, children: [{ title: 'child &', subtitle: 's', children: [] }] }];
      const html = component['impactTreeToHtml'](tree as any);
      expect(html).toContain('&lt;root&gt;');
      expect(html).toContain('child &amp;');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>');
    });
  });

  describe('escapeHtml', () => {
    it('escapes special characters', () => {
      expect(component['escapeHtml']('<a & b>')).toBe('&lt;a &amp; b&gt;');
    });
  });

  describe('serializeSvgWithInlineStyles', () => {
    it('serializes an SVG and inlines styles', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width','100');
      svg.setAttribute('height','100');
      const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
      rect.setAttribute('width','10');
      rect.setAttribute('height','10');
      rect.setAttribute('style','fill: rgb(255, 0, 0);');
      svg.appendChild(rect);
      document.body.appendChild(svg);
      const out = component['serializeSvgWithInlineStyles'](svg as any);
      expect(typeof out).toBe('string');
      expect(out).toContain('<rect');
      expect(out).toContain('fill:');
      document.body.removeChild(svg);
    });
  });

});
