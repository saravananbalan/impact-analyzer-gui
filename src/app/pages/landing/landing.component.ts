import { Component, OnInit, inject, HostListener, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownService } from '../../shared/services/dropdown.service';
import { DropdownItem } from '../../shared/interfaces/dropdown-data.interface';
import { FileNode } from '../../shared/interfaces/file-tree.interface';
import { ImpactVisualizationComponent } from '../../shared/components/impact-visualization/impact-visualization.component';
import { ProfileMenuComponent } from '../../shared/components/profile-menu/profile-menu.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ImpactVisualizationComponent, ProfileMenuComponent],
  template: `
    <div class="landing-container">
      <div class="ui-click-blocker" *ngIf="isBlockingUI" (click)="$event.stopPropagation()"></div>
      <!-- Main Header -->
      <div class="main-app-header">
        <h1>Echo Lens</h1>
        <app-profile-menu></app-profile-menu>
      </div>
      <div class="content-wrapper">
        <!-- Left sidebar with dropdown and file tree -->
        <div class="left-sidebar">
        <!-- Dropdown section -->
        <div class="dropdown-container">
          <div class="custom-select">
            <div class="select-header" (click)="toggleDropdown()">
              <span>{{ selectedItemId ? (getSelectedItemName() || 'Select Repo...') : 'Select Repo...' }}</span>
              <span class="arrow">{{ isDropdownOpen ? '▾' : '▸' }}</span>
            </div>
            <div class="select-options" *ngIf="isDropdownOpen" (click)="$event.stopPropagation()">
              <div class="option-item" (click)="resetSelection()" [class.selected]="!selectedItemId">
                Select Repo...
              </div>

              <!-- Normal dropdown list -->
              <div *ngIf="!showRepoDetails">
                <div class="option-item" *ngFor="let item of dropdownItems" (click)="onOptionSelect(item)" [class.selected]="selectedItemId === item.id.toString()">
                  {{ item.name }}
                </div>
              </div>

              <!-- Analyze mode: show checkboxes for multiple repos -->
              <div *ngIf="showRepoDetails">
                <div class="option-item" *ngFor="let item of dropdownItems">
                  <label class="checkbox-label">
                    <input type="checkbox" [checked]="selectedRepoIds.has(item.id)" (change)="toggleRepoSelection(item, $event)" />
                    <span>{{ item.name }}</span>
                  </label>
                </div>
                <div class="dropdown-actions">
                  <button type="button" class="apply-btn" (click)="analyzeSelectedRepos(); $event.preventDefault(); $event.stopPropagation()">Analyze</button>
                  <button type="button" class="cancel-btn" (click)="cancelAnalyze(); $event.preventDefault(); $event.stopPropagation()">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        
        </div>
        
        <!-- File tree section -->
        <div class="tree-panel">
          <div class="panel-header" [class.no-file]="!selectedFile">File Tree</div>
          <div class="tree-content">
            <ng-container *ngFor="let node of fileTree">
              <div class="tree-node">
                <div class="node-row" (click)="onNodeClick(node)">
                  <span class="node-toggle" *ngIf="node.type === 'folder'" (click)="$event.stopPropagation(); toggleFolder(node)">
                    {{ node.isExpanded ? '-' : '+' }}
                  </span>
                  <span class="node-icon">{{ getFileIcon(node) }}</span>
                  <span class="node-name" [class.active]="selectedFile === node">{{ node.name }}</span>
                </div>
                <div class="tree-children" *ngIf="node.type === 'folder' && node.isExpanded">
                  <ng-container *ngFor="let child of node.children">
                    <div class="tree-node">
                      <div class="node-row" (click)="onNodeClick(child)">
                        <span class="node-toggle" *ngIf="child.type === 'folder'" (click)="$event.stopPropagation(); toggleFolder(child)">
                          {{ child.isExpanded ? '-' : '+' }}
                        </span>
                        <span class="node-icon">{{ getFileIcon(child) }}</span>
                        <span class="node-name" [class.active]="selectedFile === child">{{ child.name }}</span>
                      </div>
                    </div>
                  </ng-container>
                </div>
              </div>
            </ng-container>
          </div>
        </div>
      </div>
      <!-- Main content -->
      <div class="main-content">
        <div class="editor-panel">
          <div class="panel-header main-header">File Comparison</div>
          <div class="editor-actions">
            <div class="left-actions">
              <button type="button" class="editor-toggle" (click)="toggleSplitView()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" style="margin-right: 4px; vertical-align: text-bottom;">
                  <path fill="currentColor" d="M3 5v14h18V5H3zm16 12H5V7h14v10z"/>
                  <path fill="currentColor" d="M11 7h2v10h-2z"/>
                </svg>
                {{ isSplitView ? 'Single View' : 'Split Compare' }}
              </button>
              <button type="button" class="editor-sync" (click)="syncEditors()" [disabled]="!isSplitView" [hidden]="isSplitView">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" style="margin-right: 4px; vertical-align: text-bottom;">
                  <path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                </svg>
                Sync
              </button>
            </div>
            <button type="button" class="analyze-impact-btn" (click)="startAnalyze(); $event.stopPropagation()" [class.active]="analyzePending || selectedRepoIds.size > 0" [disabled]="!canAnalyze" [hidden]="isSplitView">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" style="margin-right:6px; vertical-align:text-bottom;">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7 14 5 12 5 9.5S7 5 9.5 5 14 7 14 9.5 12 14 9.5 14z"/>
              </svg>
              Analyze Impact
            </button>
            <button #afterAnalyzeBtn type="button" class="after-analyze-btn" (click)="onAfterAnalyzeClick($event)" [disabled]="!selectedFile && !isSplitView">
              After Analyze Impact
            </button>
            <button type="button" class="check-impact-btn" (click)="onCheckImpactClick($event)" [disabled]="!isSplitView || isChecking">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" style="margin-right: 4px; vertical-align: text-bottom;">
                <path fill="currentColor" d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
              </svg>
              {{ isChecking ? 'Checking...' : 'Check Impact' }}
            </button>
          </div>
          <div class="editors-container" [class.split]="isSplitView">
            <!-- Analyze Response Modal (read-only JSON only) -->
            <div class="impact-modal-backdrop" *ngIf="showAnalyzeModal" (click)="closeAnalyzeModal()"></div>
            <div class="impact-modal" *ngIf="showAnalyzeModal">
              <div class="impact-modal-header">
                <div class="modal-title-group">
                  <span>Impacted Files</span>
                  <div class="modal-controls">
                    <button type="button" class="control-btn" (click)="expandAllAnalyze(); $event.stopPropagation()" title="Expand all">Expand All</button>
                    <button type="button" class="control-btn" (click)="collapseAllAnalyze(); $event.stopPropagation()" title="Collapse all">Collapse All</button>
                  </div>
                </div>
                <button type="button" class="close-modal-btn" (click)="closeAnalyzeModal()">&times;</button>
              </div>
              <div class="impact-modal-content">
                <ng-container *ngIf="analyzeTreeData && analyzeTreeData.length; else jsonView">
                  <div class="analyze-tree" tabindex="0">
                    <ng-container *ngTemplateOutlet="treeTpl; context: { $implicit: analyzeTreeData }"></ng-container>
                  </div>
                    <ng-template #treeTpl let-nodes>
                      <ul class="tree-root">
                        <li *ngFor="let node of nodes" [class.folder]="node.children && node.children.length" [class.file]="!node.children || node.children.length === 0" [class.changed]="!node.children || node.children.length === 0" [attr.title]="(node.key || node.name) + (node.count ? (' — ' + node.count + ' changed') : '')">
                          <div class="analyze-node-row" (click)="onAnalyzeNodeClick(node, $event)">
                            <button *ngIf="node.children && node.children.length" type="button" class="node-toggle" (click)="toggleAnalyzeNode(node.key, $event)">{{ isAnalyzeNodeExpanded(node.key) ? '▾' : '▸' }}</button>
                            <span class="node-icon">{{ node.children && node.children.length ? '📁' : '📄' }}</span>
                            <span class="node-name">{{ node.name }}</span>
                            <span class="node-count" *ngIf="node.count">({{ node.count }})</span>
                          </div>
                          <ng-container *ngIf="node.children && node.children.length && isAnalyzeNodeExpanded(node.key)">
                            <ng-container *ngTemplateOutlet="treeTpl; context: { $implicit: node.children }"></ng-container>
                          </ng-container>
                        </li>
                      </ul>
                    </ng-template>
                </ng-container>
                <ng-template #jsonView>
                  <div class="impact-json" tabindex="0" aria-readonly="true">
                    <div class="json-header">Response (read-only)</div>
                    <pre class="json-pre">{{ analyzeResult | json }}</pre>
                  </div>
                </ng-template>
              </div>
            </div>

            <!-- Check Impact Modal (visualization) -->
            <div class="impact-modal-backdrop" *ngIf="impactResult" (click)="impactResult = null"></div>
            <div class="impact-modal" *ngIf="impactResult">
              <div class="impact-modal-header">
                <span>Impact Response</span>
                <div style="display:flex; gap:8px; align-items:center;">
                  <button *ngIf="impactResult" type="button" class="download-btn" (click)="downloadCheckImpactReport()">Download JSON</button>
                  <button *ngIf="impactResult" type="button" class="download-html-btn" (click)="downloadCheckImpactReportHtml()">Download HTML</button>
                  <button *ngIf="impactResult" type="button" class="download-svg-btn" (click)="downloadVisualizationSvg()">Download SVG</button>
                  <button type="button" class="close-modal-btn" (click)="impactResult = null">&times;</button>
                </div>
              </div>
              <div class="impact-modal-content">
                <div class="impact-viz">
                  <app-impact-visualization [impactData]="impactResult"></app-impact-visualization>
                </div>
              </div>
            </div>
            <!-- Main editor or diff view -->
            <div class="editor-section" [class.left-pane]="isSplitView">
              <div class="panel-header">{{ selectedFile?.name || 'No file selected' }}</div>
              <!-- Show file content -->
              <div class="editor-content" *ngIf="selectedFile" [class.readonly]="isSplitView">
                <div *ngIf="isSplitView" class="diff-panel">
                  <div class="diff-view">
                    <div *ngFor="let line of diffLines">
                      <pre class="diff-line" [class]="'diff-' + line.type">{{ line.content }}</pre>
                    </div>
                  </div>
                </div>
                <textarea *ngIf="!isSplitView" 
                         class="file-editor" 
                         [(ngModel)]="selectedFile.content"
                         [readonly]="isSplitView"
                         [class.readonly]="isSplitView"></textarea>
              </div>
              <!-- Show placeholder when no file selected -->
              <div class="editor-placeholder" *ngIf="!selectedFile">
                <p>Select a file from the tree to view or edit its content</p>
              </div>
            </div>
            <!-- Compare editor -->
            <div class="editor-section right-pane" *ngIf="isSplitView">
              <div class="panel-header">
                <span>Compare</span>
              </div>
              <div class="editor-content" [class.readonly]="!isSplitView">
                <textarea class="file-editor" 
                         [(ngModel)]="secondaryContent" 
                         (ngModelChange)="updateDiff()"
                         [readonly]="!isSplitView"></textarea>
              </div>
              <!-- Impact response now shown in slider -->
            </div>
          </div>
        </div>
      </div>
      </div>
      <div class="loading" *ngIf="isLoading">Loading...</div>
    </div>
    <!-- Anchored After-Analyze popup (anchored above the button). No backdrop; user must close manually. -->
    <!-- Centered After-Analyze popup (always use centered modal to avoid placement/top-left issues) -->
    <div class="after-analyze-backdrop" *ngIf="showAfterAnalyzePopup" (click)="closeAfterAnalyzePopup()">
      <div class="after-analyze-popup" (click)="$event.stopPropagation()">
        <div class="popup-text">File "{{ selectedFile?.name || 'Comparison' }}" selected. Enter input and submit:</div>
        <textarea class="after-analyze-input" [(ngModel)]="afterAnalyzeText" rows="6" placeholder="Enter input text..."></textarea>
        <div class="popup-actions">
          <button type="button" class="run-btn" (click)="runAfterAnalyzeAction()" [disabled]="!afterAnalyzeText || isAfterAnalyzeRunning">{{ isAfterAnalyzeRunning ? 'Submitting...' : 'Submit' }}</button>
          <button *ngIf="afterAnalyzeSuccess && !isAfterAnalyzeRunning" type="button" class="download-btn" (click)="downloadImpactReport()">Download JSON</button>
          <button *ngIf="afterAnalyzeSuccess && !isAfterAnalyzeRunning" type="button" class="download-html-btn" (click)="downloadImpactReportHtml()">Download HTML</button>
          <button *ngIf="afterAnalyzeSuccess && !isAfterAnalyzeRunning" type="button" class="close-btn" (click)="closeAfterAnalyzePopup()">Close</button>
        </div>
        <div *ngIf="afterAnalyzeSuccess" class="after-analyze-response" style="margin-top:8px;">
          <div class="response-pre">{{ afterAnalyzeResponse | json }}</div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./landing.component.scss', './landing.component.editor.scss']
})
export class LandingComponent implements OnInit {
  private dropdownService = inject(DropdownService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  dropdownItems: DropdownItem[] = [];
  selectedItemId: string = '';
  isLoading = false;
  isDropdownOpen = false;

  fileTree: FileNode[] = [];
  selectedFile: FileNode | null = null;
  isSplitView: boolean = false;
  secondaryContent: string = '';
  isScrollSyncing: boolean = false;
  diffLines: { type: 'added' | 'removed' | 'changed' | 'unchanged', content: string }[] = [];
  isChecking: boolean = false;
  impactResult: any = null; 
  analyzeResult: any = null; 
  
  analyzeTreeData: Array<{ name: string; children?: any[]; key?: string; count?: number }> = [];
  analyzeExpandedKeys: Set<string> = new Set<string>();
  showAnalyzeModal = false;
  showAfterAnalyzePopup = false;
  afterAnalyzeText: string = '';
  isAfterAnalyzeRunning = false;
  afterAnalyzeResponse: any = null;
  afterAnalyzeSuccess = false;

  popupLeft = 0;
  popupTop = 0;
  caretLeft = 0;
  popupFlipped = false;
  popupAnchored = false;
  showToast = false;
  toastMessage = '';
  isBlockingUI: boolean = false;
  showRepoDetails: boolean = false;
  selectedRepoIds: Set<number> = new Set<number>();
  selectedRepos: DropdownItem[] = [];
  analyzePending: boolean = false;
  private ignoreNextClick = false;
  private manualCheck = false;

  get canAnalyze(): boolean {
    const hasRightContent = (this.secondaryContent || '').toString().trim().length > 0;
    const hasChange = this.diffLines && this.diffLines.some(l => l.type !== 'unchanged');
    return this.isSplitView && hasRightContent && hasChange;
  }

  onAfterAnalyzeClick(event?: MouseEvent) {
  if (!this.selectedFile && !this.isSplitView) return;
    this.afterAnalyzeResponse = null;
  this.afterAnalyzeSuccess = false;
    this.showToast = false;
    this.toastMessage = '';
    this.isAfterAnalyzeRunning = false;
    this.isBlockingUI = false;
    if (this.selectedFile) {
      this.afterAnalyzeText = `Please analyze changes for ${this.selectedFile.name}. Provide a short summary:`;
    } else {
      this.afterAnalyzeText = `Please analyze the current comparison and provide a short summary of the impactful changes:`;
    }
    if (event && event.currentTarget) {
      try {
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const popupWidth = 420;
        let desiredLeft = Math.round(rect.left + rect.width / 2 - popupWidth / 2);
        const maxLeft = Math.max(8, window.innerWidth - popupWidth - 8);
        desiredLeft = Math.min(Math.max(8, desiredLeft), maxLeft);
        this.popupLeft = desiredLeft;
        this.popupTop = Math.round(rect.top);
        const buttonCenter = rect.left + rect.width / 2;
        this.caretLeft = Math.round(buttonCenter - this.popupLeft);
      } catch (e) {
        this.popupLeft = 8;
        this.popupTop = 8;
        this.caretLeft = 20;
      }
    }
  this.popupAnchored = !!(event && event.currentTarget);
  this.showAfterAnalyzePopup = true;
    setTimeout(() => {
      try {
        const el = document.querySelector('.after-analyze-popup.anchored') as HTMLElement | null;
        const buttonEl = event && event.currentTarget ? (event.currentTarget as HTMLElement) : null;
            if (el && buttonEl) {
              const popupRect = el.getBoundingClientRect();
              const rect = buttonEl.getBoundingClientRect();
              const margin = 8;
              const desiredAboveTop = rect.top - popupRect.height - margin;
              const desiredBelowTop = rect.bottom + margin;
              const spaceAbove = rect.top - margin;
              const spaceBelow = window.innerHeight - rect.bottom - margin;

              if (desiredAboveTop >= margin) {
                this.popupTop = Math.round(desiredAboveTop);
                this.popupFlipped = false;
              } else if (desiredBelowTop + popupRect.height <= window.innerHeight - margin) {
                this.popupTop = Math.round(desiredBelowTop);
                this.popupFlipped = true;
              } else {
                if (spaceBelow >= spaceAbove) {
                  const maxTop = Math.max(margin, window.innerHeight - popupRect.height - margin);
                  this.popupTop = Math.min(Math.round(desiredBelowTop), maxTop);
                  this.popupFlipped = true;
                } else {
                  const minTop = margin;
                  const computedTop = Math.max(minTop, Math.round(desiredAboveTop));
                  this.popupTop = computedTop;
                  this.popupFlipped = false;
                }
              }
              const buttonCenter = rect.left + rect.width / 2;
              this.caretLeft = Math.round(buttonCenter - this.popupLeft);
            }
            if (this.popupAnchored) {
              try {
                const anchoredEl = document.querySelector('.after-analyze-popup.anchored') as HTMLElement | null;
                if (anchoredEl) {
                  const r = anchoredEl.getBoundingClientRect();
                  if ((this.popupLeft <= 8 && this.popupTop <= 8) || Number.isNaN(this.popupLeft) || Number.isNaN(this.popupTop)) {
                    const centerLeft = Math.round((window.innerWidth - r.width) / 2);
                    const centerTop = Math.round((window.innerHeight - r.height) / 2);
                    this.popupLeft = Math.max(8, Math.min(centerLeft, Math.max(8, window.innerWidth - r.width - 8)));
                    this.popupTop = Math.max(8, Math.min(centerTop, Math.max(8, window.innerHeight - r.height - 8)));
                    this.caretLeft = Math.round(r.width / 2);
                  }
                }
              } catch (e) { /* ignore */ }
            }
      } catch (e) {
      }
      try { (document.querySelector('.after-analyze-input') as HTMLTextAreaElement | null)?.focus(); } catch (e) { }
    }, 0);
  }

  runAfterAnalyzeAction() {
    if (!this.selectedFile && !this.isSplitView) return;
    if (!this.afterAnalyzeText || this.afterAnalyzeText.trim().length === 0) return;
    this.isAfterAnalyzeRunning = true;
    this.afterAnalyzeResponse = null;
    const payload = {
      file: this.selectedFile?.name ?? (this.isSplitView ? 'comparison' : 'unknown'),
      inputText: this.afterAnalyzeText,
      comparison: (!this.selectedFile && this.isSplitView) ? (this.secondaryContent ?? '') : undefined
    };

    this.http.post('/after-analyze', payload).subscribe({
      next: (res) => {
  this.afterAnalyzeSuccess = true;
        this.afterAnalyzeResponse = res;
        this.popupAnchored = false;
        this.isAfterAnalyzeRunning = false;
        this.isBlockingUI = false;
        console.log('After-analyze response', res);
        try {
          const r: any = res;
          const messageText = r?.message ?? r?.received ?? null;
          if (messageText && this.isSplitView) {
            this.secondaryContent = String(messageText);
            this.updateDiff();
          }
        } catch (e) { /* ignore */ }
        try { this.cdr.detectChanges(); } catch (e) { }
      },
      error: (err) => {
  this.afterAnalyzeResponse = { error: true, detail: err };
        this.isAfterAnalyzeRunning = false;
        console.error('After-analyze failed', err);
        try { this.cdr.detectChanges(); } catch (e) { }
      }
    });
  }

  closeAfterAnalyzePopup() {
    if (this.isAfterAnalyzeRunning) {
      console.log('Close blocked: request still in progress');
      return;
    }
    this.showAfterAnalyzePopup = false;
    this.afterAnalyzeResponse = null;
    this.afterAnalyzeText = '';
    this.afterAnalyzeSuccess = false;
    this.showToast = false;
  }

  closeAnalyzeModal() {
    this.showAnalyzeModal = false;
    this.analyzeResult = null;
  }

  ngOnInit(): void {
    this.loadDropdownData();
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: Event) {
    if (this.ignoreNextClick) {
      this.ignoreNextClick = false;
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest || !target.closest('.custom-select')) {
      this.isDropdownOpen = false;
    }
  }

  loadDropdownData() {
    this.isLoading = true;
    this.dropdownService.getDropdownData().subscribe({
      next: (res: any) => {
        this.dropdownItems = res?.data ?? [];
        try {
          if (this.dropdownItems && this.dropdownItems.length) {
            this.dropdownItems.forEach((item, idx) => {
              const metaKey = `repo${idx + 1}`;
              try { sessionStorage.setItem(metaKey, JSON.stringify(item)); } catch (e) { }
              try {
                const tree = this.generateFileTreeForRepo(item);
                const key = item.name || `repo-${item.id}`;
                sessionStorage.setItem(key, JSON.stringify(tree));
              } catch (e) { /* ignore */ }
            });
          }
        } catch (err) {
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.dropdownItems = [
          { id: 1, name: 'Project A' },
          { id: 2, name: 'Project B' },
          { id: 3, name: 'Project C' }
        ];
        try {
          this.dropdownItems.forEach((item, idx) => {
            const metaKey = `repo${idx + 1}`;
            try { sessionStorage.setItem(metaKey, JSON.stringify(item)); } catch (e) { }
            try {
              const tree = this.generateFileTreeForRepo(item);
              const key = item.name || `repo-${item.id}`;
              sessionStorage.setItem(key, JSON.stringify(tree));
            } catch (e) { }
          });
        } catch (e) { }
      }
    });
  }

  private generateFileTreeForRepo(item: DropdownItem) {
    return [
      {
        name: 'src',
        type: 'folder',
        isExpanded: true,
        children: [
          {
            name: 'app',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'core',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'services',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      { name: 'auth.service.ts', type: 'file', content: 'import { Injectable } from \'' + "@angular/core" + '\';\n\n@Injectable({\n  providedIn: \"root\"\n})\nexport class AuthService {\n  // Authentication service implementation\n}' },
                      { name: 'api.service.ts', type: 'file', content: 'import { Injectable } from \'' + "@angular/core" + '\';\n\n@Injectable({\n  providedIn: \"root\"\n})\nexport class ApiService {\n  // API service implementation\n}' },
                      { name: 'storage.service.ts', type: 'file', content: 'import { Injectable } from \'' + "@angular/core" + '\';\n\n@Injectable({\n  providedIn: \"root\"\n})\nexport class StorageService {\n  // Storage service implementation\n}' }
                    ]
                  },
                  {
                    name: 'models',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      { name: 'user.model.ts', type: 'file', content: 'export interface User {\n  id: number;\n  name: string;\n  email: string;\n  role: string;\n}' },
                      { name: 'config.model.ts', type: 'file', content: 'export interface Config {\n  apiUrl: string;\n  version: string;\n  features: string[];\n}' }
                    ]
                  }
                ]
              },
              {
                name: 'features',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'dashboard',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      { name: 'dashboard.component.ts', type: 'file', content: 'import { Component } from \'' + "@angular/core" + '\';\n\n@Component({\n  selector: \"app-dashboard\",\n  templateUrl: \"./dashboard.component.html\",\n  styleUrls: [\"./dashboard.component.scss\"]\n})\nexport class DashboardComponent { }' },
                      { name: 'dashboard.component.html', type: 'file', content: '<div class=\"dashboard\">\n  <h1>Welcome to Dashboard</h1>\n  <div class=\"widgets\">\n    <!-- Dashboard widgets -->\n  </div>\n</div>' },
                      { name: 'dashboard.component.scss', type: 'file', content: '.dashboard {\n  padding: 20px;\n  \n  .widgets {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n    gap: 20px;\n  }\n}' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            name: 'assets',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'images',
                type: 'folder',
                isExpanded: true,
                children: [
                  { name: 'logo.svg', type: 'file', content: '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\">\n  <!-- Logo SVG content -->\n</svg>' },
                  { name: 'icons.svg', type: 'file', content: '<svg xmlns=\"http://www.w3.org/2000/svg\">\n  <!-- Icon sprites -->\n</svg>' }
                ]
              },
              {
                name: 'styles',
                type: 'folder',
                isExpanded: true,
                children: [
                  { name: 'variables.scss', type: 'file', content: '// Colors\n$primary-color: #007bff;\n$secondary-color: #6c757d;\n$success-color: #28a745;\n\n// Typography\n$font-family-base: Arial, sans-serif;\n$font-size-base: 16px;' },
                  { name: 'themes.scss', type: 'file', content: '.theme-light {\n  --bg-color: #ffffff;\n  --text-color: #333333;\n}\n\n.theme-dark {\n  --bg-color: #333333;\n  --text-color: #ffffff;\n}' }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'config',
        type: 'folder',
        isExpanded: true,
        children: [
          { name: 'environment.ts', type: 'file', content: 'export const environment = {\n  production: false,\n  apiUrl: \'http://localhost:3000\',\n  version: \'1.0.0\'\n};' },
          {
            name: 'translations',
            type: 'folder',
            isExpanded: true,
            children: [
              { name: 'en.json', type: 'file', content: '{\n  "common": {\n    "welcome": "Welcome",\n    "login": "Login",\n    "logout": "Logout"\n  }\n}' },
              { name: 'es.json', type: 'file', content: '{\n  "common": {\n    "welcome": "Bienvenido",\n    "login": "Iniciar sesión",\n    "logout": "Cerrar sesión"\n  }\n}' }
            ]
          }
        ]
      }
    ];
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  startAnalyze() {
    if (!this.canAnalyze) {
      this.analyzePending = false;
      this.showRepoDetails = true;
      this.isDropdownOpen = true;
      this.selectedRepoIds.clear();
      const idNum = parseInt(this.selectedItemId || '', 10);
      if (!isNaN(idNum)) {
        this.selectedRepoIds.add(idNum);
      }
      return;
    }

    this.showRepoDetails = true;
    this.isDropdownOpen = true;
    this.selectedRepoIds.clear();
    const currentId = parseInt(this.selectedItemId || '', 10);
    if (!isNaN(currentId)) {
      this.selectedRepoIds.add(currentId);
    }
  }

  toggleRepoSelection(item: DropdownItem, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedRepoIds.add(item.id);
    } else {
      this.selectedRepoIds.delete(item.id);
    }
  }

  analyzeSelectedRepos() {
    this.selectedRepos = this.dropdownItems.filter(it => this.selectedRepoIds.has(it.id));
    setTimeout(() => {
      this.isDropdownOpen = false;
      this.showRepoDetails = false;
    }, 0);
    if (!this.selectedFile) {
      this.impactResult = { error: true, message: 'No file selected for analysis' };
      return;
    }

    if (!this.selectedRepos || this.selectedRepos.length === 0) {
      this.impactResult = { error: true, message: 'No repositories selected for analysis' };
      return;
    }

    const repositoryUrls = this.selectedRepos.map(r => r.name);
    const targetFilename = this.selectedFile.name;
    const localFilePath = this.findPathForSelectedFile() || `/mock/path/${targetFilename}`;

    const payload = {
      status: 'success',
      repositoryUrls,
      localFilePath,
      targetFilename
    };

    
    this.ignoreNextClick = true;
    setTimeout(() => {
      this.ignoreNextClick = false;
    }, 450);
    setTimeout(() => {
      try { (document.activeElement as HTMLElement)?.blur(); } catch (e) { /* ignore */ }
    }, 0);
    const postPayload = {
      repositoryUrls,
      localFilePath: payload.localFilePath,
      targetFilename: payload.targetFilename,
    };

    this.http.post('/analyze-impact', postPayload).subscribe({
      next: (res: any) => {
        if (res && res.status === 'success') {
          this.analyzeResult = res;
          try { this.analyzeTreeData = this.buildAnalyzeTree(res); } catch (e) { this.analyzeTreeData = []; }
        } else {
          this.analyzeResult = { error: true, message: 'Analyze returned non-success', detail: res };
          this.analyzeTreeData = [];
        }
        this.showAnalyzeModal = true;
        this.isBlockingUI = false;
        console.log('Impacted Files', res);
      },
      error: (err) => {
        this.analyzeResult = { error: true, message: 'Failed to call analyze API', detail: err, payload };
        this.showAnalyzeModal = true;
        this.isBlockingUI = false;
        console.error('Analyze failed', err);
      }
    });
  }

  private buildAnalyzeTree(res: any): Array<{ name: string; children?: any[]; key?: string; count?: number }> {
    const out: Array<{ name: string; children?: any[]; key?: string; count?: number }> = [];
    if (!res) return out;
    const items = res.affectedClasses ?? res.affected ?? [];

    const convert = (val: any, parentPath = ''): any[] => {
      if (val == null) return [];
      if (Array.isArray(val)) {
        return val.map(v => {
          if (typeof v === 'string') return { name: v, key: parentPath ? `${parentPath}/${v}` : v, count: 1 };
          if (typeof v === 'object') {
            const keys = Object.keys(v);
            if (keys.length === 1) {
              const k = keys[0];
              const nodeKey = parentPath ? `${parentPath}/${k}` : k;
              const children = convert(v[k], nodeKey);
              const count = children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) || (children.length ? children.length : 0);
              return { name: k, key: nodeKey, children, count };
            }
            return keys.map(k => {
              const nodeKey = parentPath ? `${parentPath}/${k}` : k;
              const children = convert(v[k], nodeKey);
              const count = children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) || (children.length ? children.length : 0);
              return { name: k, key: nodeKey, children, count };
            });
          }
          return { name: String(v), key: parentPath ? `${parentPath}/${String(v)}` : String(v), count: 1 };
        }).flat();
      }
      if (typeof val === 'object') {
        return Object.keys(val).map(k => {
          const nodeKey = parentPath ? `${parentPath}/${k}` : k;
          const children = convert(val[k], nodeKey);
          const count = children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) || (children.length ? children.length : 0);
          return { name: k, key: nodeKey, children, count };
        });
      }
      const name = String(val);
      return [{ name, key: parentPath ? `${parentPath}/${name}` : name, count: 1 }];
    };

    if (Array.isArray(items)) {
      for (const it of items) {
        if (typeof it === 'string') {
          out.push({ name: it, key: it, count: 1 });
        } else if (typeof it === 'object') {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            const key = keys[0];
            const nodeKey = key;
            const children = convert(it[key], nodeKey);
            const count = children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) || (children.length ? children.length : 0);
            out.push({ name: key, key: nodeKey, children, count });
          } else {
            for (const k of keys) {
              const nodeKey = k;
              const children = convert(it[k], nodeKey);
              const count = children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) || (children.length ? children.length : 0);
              out.push({ name: k, key: nodeKey, children, count });
            }
          }
        } else {
          out.push({ name: String(it), key: String(it), count: 1 });
        }
      }
    }

    return out;
  }

  expandAllAnalyze() {
    const keys: string[] = [];
    const collect = (nodes: any[]) => {
      for (const n of nodes || []) {
        if (n.key) keys.push(n.key);
        if (n.children && n.children.length) collect(n.children);
      }
    };
    collect(this.analyzeTreeData);
    this.analyzeExpandedKeys = new Set(keys);
  }

  collapseAllAnalyze() {
    this.analyzeExpandedKeys.clear();
  }

  toggleAnalyzeNode(key: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!key) return;
    if (this.analyzeExpandedKeys.has(key)) this.analyzeExpandedKeys.delete(key);
    else this.analyzeExpandedKeys.add(key);
  }

  isAnalyzeNodeExpanded(key: string) {
    return !!key && this.analyzeExpandedKeys.has(key);
  }

  onAnalyzeNodeClick(node: any, event?: Event) {
    if (event) event.stopPropagation();
    if (node.children && node.children.length) {
      this.toggleAnalyzeNode(node.key);
      return;
    }
    const found = this.findFileByName(node.name);
    if (found) {
      this.selectedFile = found;
      if (this.isSplitView && this.selectedFile?.content) {
        this.secondaryContent = this.selectedFile.content;
        this.updateDiff();
      }
      try { (document.querySelector('.editor-section .panel-header') as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth' }); } catch (e) { }
    }
  }

  private findFileByName(name: string): FileNode | null {
    if (!this.fileTree) return null;
    let found: FileNode | null = null;
    const dfs = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (found) return true;
        if (n.type === 'file' && n.name === name) { found = n; return true; }
        if (n.children) {
          if (dfs(n.children as FileNode[])) return true;
        }
      }
      return false;
    };
    dfs(this.fileTree);
    return found;
  }

  private findPathForSelectedFile(): string | null {
    if (!this.selectedFile || !this.fileTree) return null;
    let foundPath: string[] | null = null;

    const dfs = (nodes: any[], ancestors: string[]) => {
      for (const n of nodes) {
        const nextAnc = [...ancestors, n.name];
        if (n === this.selectedFile || (n.name === this.selectedFile?.name && n.type === this.selectedFile?.type)) {
          foundPath = nextAnc;
          return true;
        }
        if (n.children) {
          const stop = dfs(n.children, nextAnc);
          if (stop) return true;
        }
      }
      return false;
    };

    dfs(this.fileTree, []);
    return foundPath ? '/' + (foundPath as string[]).join('/') : null;
  }

  private summarizeAnalyzeResult(res: any): string {
    if (!res) return '';
    const parts: string[] = [];
    const target = res.targetFilename ?? res.file ?? '';
    parts.push(`Analyze result${target ? ' for ' + target : ''}:`);
    if (res.localFilePath) parts.push(`Path: ${res.localFilePath}`);
    const items = res.affectedClasses ?? res.affected ?? [];
    const lines: string[] = [];
    const flatten = (val: any, prefix = '') => {
      if (val == null) return;
      if (Array.isArray(val)) {
        for (const v of val) flatten(v, prefix);
        return;
      }
      if (typeof val === 'string') {
        lines.push(prefix + val);
        return;
      }
      if (typeof val === 'object') {
        for (const k of Object.keys(val)) {
          const child = val[k];
          if (Array.isArray(child)) {
            for (const c of child) {
              if (typeof c === 'string') lines.push(`${k}/${c}`);
              else flatten(c, `${k}/`);
            }
          } else if (typeof child === 'string') {
            lines.push(`${k}/${child}`);
          } else {
            flatten(child, `${k}/`);
          }
        }
      }
    };
    flatten(items);
    if (lines.length === 0) parts.push('(no affected classes listed)');
    else {
      parts.push('Affected classes:');
      for (const l of lines) parts.push('- ' + l);
    }
    return parts.join('\n');
  }

  cancelAnalyze() {
    this.ignoreNextClick = true;
    setTimeout(() => (this.ignoreNextClick = false), 300);
    setTimeout(() => {
      try { (document.activeElement as HTMLElement)?.blur(); } catch (e) { /* ignore */ }
    }, 0);
    setTimeout(() => {
  this.showRepoDetails = false;
  this.isDropdownOpen = false;
  this.selectedRepoIds.clear();
    }, 0);
  }

  onCheckImpactClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.manualCheck = true;
    this.checkImpact();
  }

  resetSelection() {
    this.selectedItemId = '';
    this.fileTree = [];
    this.selectedFile = null;
    this.isDropdownOpen = false;
  }

  onOptionSelect(item: DropdownItem) {
    this.selectedItemId = String(item.id);
    this.selectedFile = null;
    this.isDropdownOpen = false;
    
    this.fileTree = [
      {
        name: 'src',
        type: 'folder',
        isExpanded: true,
        children: [
          {
            name: 'app',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'core',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'services',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      { name: 'auth.service.ts', type: 'file', content: 'import { Injectable } from \'@angular/core\';\n\n@Injectable({\n  providedIn: \'root\'\n})\nexport class AuthService {\n  // Authentication service implementation\n}' },
                      { name: 'api.service.ts', type: 'file', content: 'import { Injectable } from \'@angular/core\';\n\n@Injectable({\n  providedIn: \'root\'\n})\nexport class ApiService {\n  // API service implementation\n}' },
                      { name: 'storage.service.ts', type: 'file', content: 'import { Injectable } from \'@angular/core\';\n\n@Injectable({\n  providedIn: \'root\'\n})\nexport class StorageService {\n  // Storage service implementation\n}' }
                    ]
                  },
                  {
                    name: 'models',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      { name: 'user.model.ts', type: 'file', content: 'export interface User {\n  id: number;\n  name: string;\n  email: string;\n  role: string;\n}' },
                      { name: 'config.model.ts', type: 'file', content: 'export interface Config {\n  apiUrl: string;\n  version: string;\n  features: string[];\n}' }
                    ]
                  }
                ]
              },
              {
                name: 'features',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'dashboard',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      { name: 'dashboard.component.ts', type: 'file', content: 'import { Component } from \'@angular/core\';\n\n@Component({\n  selector: \'app-dashboard\',\n  templateUrl: \'./dashboard.component.html\',\n  styleUrls: [\'./dashboard.component.scss\']\n})\nexport class DashboardComponent { }' },
                      { name: 'dashboard.component.html', type: 'file', content: '<div class="dashboard">\n  <h1>Welcome to Dashboard</h1>\n  <div class="widgets">\n    <!-- Dashboard widgets -->\n  </div>\n</div>' },
                      { name: 'dashboard.component.scss', type: 'file', content: '.dashboard {\n  padding: 20px;\n  \n  .widgets {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n    gap: 20px;\n  }\n}' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            name: 'assets',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'images',
                type: 'folder',
                isExpanded: true,
                children: [
                  { name: 'logo.svg', type: 'file', content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <!-- Logo SVG content -->\n</svg>' },
                  { name: 'icons.svg', type: 'file', content: '<svg xmlns="http://www.w3.org/2000/svg">\n  <!-- Icon sprites -->\n</svg>' }
                ]
              },
              {
                name: 'styles',
                type: 'folder',
                isExpanded: true,
                children: [
                  { name: 'variables.scss', type: 'file', content: '// Colors\n$primary-color: #007bff;\n$secondary-color: #6c757d;\n$success-color: #28a745;\n\n// Typography\n$font-family-base: Arial, sans-serif;\n$font-size-base: 16px;' },
                  { name: 'themes.scss', type: 'file', content: '.theme-light {\n  --bg-color: #ffffff;\n  --text-color: #333333;\n}\n\n.theme-dark {\n  --bg-color: #333333;\n  --text-color: #ffffff;\n}' }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'config',
        type: 'folder',
        isExpanded: true,
        children: [
          { name: 'environment.ts', type: 'file', content: 'export const environment = {\n  production: false,\n  apiUrl: \'http://localhost:3000\',\n  version: \'1.0.0\'\n};' },
          {
            name: 'translations',
            type: 'folder',
            isExpanded: true,
            children: [
              { name: 'en.json', type: 'file', content: '{\n  "common": {\n    "welcome": "Welcome",\n    "login": "Login",\n    "logout": "Logout"\n  }\n}' },
              { name: 'es.json', type: 'file', content: '{\n  "common": {\n    "welcome": "Bienvenido",\n    "login": "Iniciar sesión",\n    "logout": "Cerrar sesión"\n  }\n}' }
            ]
          }
        ]
      }
    ];
    try {
      const key = item.name || `repo-${item.id}`;
      sessionStorage.setItem(key, JSON.stringify(this.fileTree));
    } catch (e) {
    }
  }

  getSelectedItemName(): string {
    const item = this.dropdownItems.find(it => it.id.toString() === this.selectedItemId);
    return item?.name || '';
  }

  getFileIcon(node: FileNode): string {
    if (node.type === 'folder') {
      return node.isExpanded ? '📂' : '📁';
    }
    
    const ext = node.name.split('.').pop()?.toLowerCase() || '';
    
    switch (ext) {
      case 'ts':
        return '📘'; 
      case 'html':
        return '📄'; // HTML files
      case 'scss':
      case 'css':
        return '🎨'; // Style files
      case 'json':
        return '📋'; // JSON files
      case 'md':
        return '📝'; // Markdown files
      case 'svg':
        return '🖼️'; // Image files
      default:
        return '📄'; // Default file icon
    }
  }

  toggleFolder(node: FileNode) {
    if (node.type !== 'folder') return;
    node.isExpanded = !node.isExpanded;
  }

  onNodeClick(node: FileNode) {
    if (node.type === 'folder') {
      this.toggleFolder(node);
      return;
    }
    this.selectedFile = node;
    if (this.isSplitView && node.content) {
      this.secondaryContent = node.content;
      this.updateDiff();
    }
  }

  toggleSplitView() {
    this.isSplitView = !this.isSplitView;
    if (this.isSplitView) {
      
      try {
        const afterMsg: any = this.afterAnalyzeResponse?.message ?? this.afterAnalyzeResponse?.received ?? null;
        if (afterMsg) {
          this.secondaryContent = String(afterMsg);
        } else {
          const a: any = this.analyzeResult ?? null;
          const analyzeMsg = a?.message ?? a?.summary ?? null;
          if (analyzeMsg) {
            this.secondaryContent = String(analyzeMsg);
          } else if (a) {
            // build a short human-readable summary of affected classes
            try {
              this.secondaryContent = this.summarizeAnalyzeResult(a);
            } catch (e) {
              this.secondaryContent = this.selectedFile?.content ?? '';
            }
          } else {
            this.secondaryContent = this.selectedFile?.content ?? '';
          }
        }
      } catch (e) {
        this.secondaryContent = this.selectedFile?.content ?? '';
      }
      this.updateDiff();
    }
  }

  syncEditors() {
    if (this.selectedFile?.content) {
      this.secondaryContent = this.selectedFile.content;
      this.updateDiff();
    }
  }

  updateDiff() {
  const original = (this.selectedFile?.content ?? '').split('\n');
  const modified = (this.secondaryContent || '').split('\n');
  const maxLen = Math.max(original.length, modified.length);
  this.diffLines = [];
  for (let i = 0; i < maxLen; i++) {
    const origLine = original[i] ?? '';
    const modLine = modified[i] ?? '';
    if (origLine === modLine) {
      this.diffLines.push({ type: 'unchanged', content: origLine });
    } else if (!origLine && modLine) {
      this.diffLines.push({ type: 'added', content: modLine });
    } else if (origLine && !modLine) {
      this.diffLines.push({ type: 'removed', content: origLine });
    } else {
      this.diffLines.push({ type: 'changed', content: `- ${origLine}\n+ ${modLine}` });
    }
  }
    if (this.isSplitView) {
      const hasRightContent = (this.secondaryContent || '').toString().trim().length > 0;
      const hasChange = this.diffLines.some(l => l.type !== 'unchanged');
      const shouldAnalyze = hasRightContent && hasChange;
      this.analyzePending = shouldAnalyze;
      if (shouldAnalyze && this.selectedItemId) {
        const idNum = parseInt(this.selectedItemId, 10);
        if (!isNaN(idNum)) {
          this.selectedRepoIds.add(idNum);
        }
      }
    } else {
      this.analyzePending = false;
    }
}

  onEditorScroll(event: Event, editor: 'primary' | 'secondary') {
    if (!this.isSplitView || this.isScrollSyncing) return;
  }

  checkImpact() {
    if (!this.manualCheck) {
      this.manualCheck = false;
      return;
    }
    this.manualCheck = false;
    if (this.ignoreNextClick) {
      this.ignoreNextClick = false;
      return;
    }
    if (!this.isSplitView) return;
    this.isChecking = true;
    this.isBlockingUI = true;
    this.impactResult = null;

    const sourceRepo = this.getSelectedItemName() || null;
    const compareRepoNames = Array.from(this.selectedRepoIds || []).map(id => this.dropdownItems.find(d => d.id === id)?.name ?? String(id));

    const afterMsg = (this.afterAnalyzeResponse && (this.afterAnalyzeResponse?.message ?? this.afterAnalyzeResponse?.received)) ? (this.afterAnalyzeResponse?.message ?? this.afterAnalyzeResponse?.received) : null;

    const payload = {
      sourceRepo,
      compareRepos: compareRepoNames,
      file: this.selectedFile?.name ?? (this.isSplitView ? 'comparison' : 'untitled'),
      filePath: this.afterAnalyzeResponse?.received ?? null,
      original: this.selectedFile?.content ?? '',
      modified: this.secondaryContent ?? '',
      message: afterMsg,
      timestamp: new Date().toISOString(),
      note: 'mock impact check'
    };

    this.http.post('/check-impact', payload).subscribe({
      next: (res) => {
        this.impactResult = res;
        this.isChecking = false;
        this.isBlockingUI = false;
        console.log('Impact check response', res);
      },
      error: (err) => {
        this.impactResult = { error: true, message: 'Failed to call mock API', detail: err };
        this.isChecking = false;
        this.isBlockingUI = false;
        console.error('Impact check failed', err);
      }
    });
  }

  downloadImpactReport() {
    try {
      const data = this.afterAnalyzeResponse ?? { message: 'no after-analyze response' };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `impact-report-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download impact report', e);
    }
  }

  downloadCheckImpactReport() {
    try {
      const data = this.impactResult ?? { message: 'no impact result' };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `check-impact-report-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download check impact report', e);
    }
  }

  downloadImpactReportHtml() {
    try {
      const after = this.afterAnalyzeResponse ?? { message: 'no after-analyze response' };
      const analyze = this.analyzeResult ?? null;
      const title = 'After Analyze Impact Report';
      const ts = new Date().toISOString();
      const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const body = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}pre{background:#f7f7f9;padding:12px;border-radius:6px;overflow:auto;max-height:60vh}h1,h2{color:#222}</style></head><body><h1>${title}</h1><p>Generated: ${ts}</p><h2>After-Analyze Response</h2><pre>${escapeHtml(JSON.stringify(after, null, 2))}</pre>` + (analyze ? `<h2>Analyze Result</h2><pre>${escapeHtml(JSON.stringify(analyze, null, 2))}</pre>` : '') + `</body></html>`;
      const blob = new Blob([body], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `after-analyze-report-${ts.replace(/[:.]/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download HTML impact report', e);
    }
  }

  downloadCheckImpactReportHtml() {
    try {
      const impact = this.impactResult ?? { message: 'no impact result' };
      const after = this.afterAnalyzeResponse ?? null;
      const title = 'Check Impact Report';
      const ts = new Date().toISOString();
      const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let svgHtml = '';
      try {
        const svgEl = document.querySelector('.impact-viz svg') as SVGElement | null;
        if (svgEl) {
          const serializer = new XMLSerializer();
          svgHtml = serializer.serializeToString(svgEl);
          svgHtml = `<h2>Visualization</h2><div class="viz-container">${svgHtml}</div>`;
        }
      } catch (e) {
        svgHtml = '';
      }

      const body = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}pre{background:#f7f7f9;padding:12px;border-radius:6px;overflow:auto;max-height:60vh}h1,h2{color:#222}.viz-container{border:1px solid #e6e6ea;padding:12px;border-radius:6px;margin:8px 0;background:#fff}</style></head><body><h1>${title}</h1><p>Generated: ${ts}</p>` + (after ? `<h2>After-Analyze</h2><pre>${escapeHtml(JSON.stringify(after, null, 2))}</pre>` : '') + svgHtml + `<h2>Impact Result</h2><pre>${escapeHtml(JSON.stringify(impact, null, 2))}</pre></body></html>`;
      const blob = new Blob([body], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `check-impact-report-${ts.replace(/[:.]/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download HTML check-impact report', e);
    }
  }

  downloadVisualizationSvg() {
    try {
      const svgEl = document.querySelector('.impact-viz svg') as SVGElement | null;
      if (!svgEl) {
        console.warn('No SVG visualization found to download');
        return;
      }
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgEl);
      if (!svgString.match(/^<svg[^>]+xmlns="http/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `impact-visualization-${ts}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download SVG', e);
    }
  }

}

