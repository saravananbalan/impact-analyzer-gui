import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';

interface ImpactNode {
  name: string;
  type: string;
  children?: ImpactNode[];
  impact?: 'high' | 'medium' | 'low';
  risk?: number;
  description?: string;
  reasoning?: string;
}

@Component({
  selector: 'app-impact-visualization',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="impact-viz-container">
      <div class="viz-controls">
        <div class="impact-summary">
          <div class="impact-stat">
            <span class="label">High Impact:</span>
            <span class="count high">{{getImpactCount('high')}}</span>
          </div>
          <div class="impact-stat">
            <span class="label">Medium Impact:</span>
            <span class="count medium">{{getImpactCount('medium')}}</span>
          </div>
          <div class="impact-stat">
            <span class="label">Low Impact:</span>
            <span class="count low">{{getImpactCount('low')}}</span>
          </div>
        </div>
        <div class="impact-info">
          <div class="hover-info" *ngIf="hoveredReasoning">
            <strong>Reasoning (hover):</strong>
            <div class="reason-text">{{ hoveredReasoning }}</div>
          </div>
          <div class="selected-info" *ngIf="selectedDescription">
            <div class="selected-title"><strong>{{ selectedTitle }}</strong></div>
            <div class="selected-desc">{{ selectedDescription }}</div>
          </div>
        </div>
      </div>
      <div #vizContainer class="viz-container"></div>
    </div>
  `,
  styles: [`
    .impact-viz-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .viz-controls {
      padding: 16px;
      border-bottom: 1px solid #dee2e6;
    }
    .impact-summary {
      display: flex;
      gap: 24px;
      justify-content: center;
    }
    .impact-stat {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .impact-stat .label {
      font-weight: 500;
    }
    .impact-stat .count {
      padding: 2px 8px;
      border-radius: 12px;
      color: white;
    }
    .count.high { background-color: #dc3545; }
    .count.medium { background-color: #ffc107; }
    .count.low { background-color: #28a745; }
    .viz-container {
      flex: 1;
      overflow: hidden;
    }
    .impact-info { margin-top: 12px; text-align: center; }
    .hover-info, .selected-info { margin-top: 6px; font-size: 13px; }
    .selected-title { margin-bottom: 4px; }
    .reason-text { color: #333; max-height: 3.6em; overflow: hidden; text-overflow: ellipsis; }
    :host ::ng-deep {
      .node circle {
        fill: #fff;
        stroke-width: 2px;
      }
      .node text {
        font: 12px sans-serif;
      }
      .link {
        fill: none;
        stroke: #ccc;
        stroke-width: 1px;
      }
    }
  `]
})
export class ImpactVisualizationComponent implements OnChanges {
  @Input() impactData!: any;
  @ViewChild('vizContainer', { static: true }) private vizContainer!: ElementRef;
  private cdr = inject(ChangeDetectorRef);

  hoveredReasoning: string | null = null;
  selectedTitle: string | null = null;
  selectedDescription: string | null = null;
  
  private svg: any;
  private treeLayout: any;
  private root: any;
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['impactData']) {
      this.processDataAndRender();
    }
  }

  private processDataAndRender() {
    // Transform API response into hierarchical data
    const hierarchicalData = this.transformData(this.impactData);
    this.renderVisualization(hierarchicalData);
  }

  private transformData(data: any): ImpactNode {
    // If API provided affectedClasses, transform into a hierarchical tree
    if (data && data.affectedClasses && Array.isArray(data.affectedClasses)) {
      const rootName = data.targetFilename || data.localFilePath || 'Impact';
      const children = data.affectedClasses.map((repoObj: any) => {
        const repoName = Object.keys(repoObj)[0];
        const classList: string[] = repoObj[repoName] || [];
        return {
          name: repoName,
          type: 'repo',
          children: classList.map((c) => ({ name: c, type: 'class', impact: classList.length > 0 ? 'medium' : 'low' }))
        } as ImpactNode;
      });
      return { name: rootName, type: 'root', children };
    }

    if (Array.isArray(data)) {
      const rootName = 'LLM Impact Report';
      const children: ImpactNode[] = [];
      for (const item of data) {
        const changedMethod = item?.changedMethod ?? 'change';
        const report = item?.llmReport ?? {};
        const modules = Array.isArray(report?.impactedModules) ? report.impactedModules : [];
        const parentRisk = typeof report?.riskScore === 'number' ? report.riskScore : null;
        const methodNode: ImpactNode = {
          name: changedMethod,
          type: 'method',
          reasoning: typeof report?.reasoning === 'string' ? report.reasoning : (report?.reasoning ?? report?.reason ?? ''),
          children: modules.map((m: any) => ({
            name: m.moduleName,
            type: 'module',
            impact: (m.impactType === 'SYNTACTIC_BREAK') ? 'high' : ((m.impactType === 'SEMANTIC_RISK') ? 'medium' : 'low'),
           
            description: m.description || '',
            risk: (typeof m?.riskScore === 'number') ? m.riskScore : (parentRisk ?? 0)
          }))
        };
        children.push(methodNode);
      }
      return { name: rootName, type: 'root', children };
    }

    return {
      name: data.file || 'Root',
      type: 'file',
      children: [
        {
          name: 'Direct Dependencies',
          type: 'group',
          children: [
            { name: 'Service A', type: 'service', impact: 'high' },
            { name: 'Component B', type: 'component', impact: 'medium' },
            { name: 'Module C', type: 'module', impact: 'low' }
          ]
        },
        {
          name: 'Indirect Dependencies',
          type: 'group',
          children: [
            { name: 'Utility X', type: 'utility', impact: 'medium' },
            { name: 'Helper Y', type: 'helper', impact: 'low' }
          ]
        }
      ]
    };
  }

  private renderVisualization(data: ImpactNode) {
    const element = this.vizContainer.nativeElement;
    const width = Math.max(300, element.clientWidth);
    const height = Math.max(200, element.clientHeight);

    d3.select(element).select('svg').remove();

    const isLlmReport = data && data.children && data.children.some((c: any) => c.type === 'method');
    if (isLlmReport) {
      const nodes: any[] = [];
      const links: any[] = [];

      for (const method of data.children || []) {
        const methodId = `method:${method.name}`;
        nodes.push({ id: methodId, name: method.name, type: 'method' });
        for (const mod of method.children || []) {
          const modId = `module:${mod.name}`;
          if (!nodes.find(n => n.id === modId)) {
            nodes.push({ id: modId, name: mod.name, type: mod.type || 'module', impact: mod.impact, risk: mod.risk ?? 0, description: mod.description ?? '' });
          }
          links.push({ source: methodId, target: modId });
        }
      }

      const svg = d3.select(element).append('svg').attr('width', width).attr('height', height);

      const simulation = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links).id((d: any) => d.id).distance(140).strength(1))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40));

      const link = svg.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', '#999')
        .attr('stroke-width', 1.5);

      const node = svg.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .call((d3.drag() as any)
          .on('start', (event: any, d: any) => {
            if (!event.active) (simulation as any).alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event: any, d: any) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event: any, d: any) => { if (!event.active) (simulation as any).alphaTarget(0); d.fx = null; d.fy = null; })
        );

      node.filter((d: any) => d.type === 'method')
        .append('rect')
        .attr('x', -60)
        .attr('y', -18)
        .attr('width', 120)
        .attr('height', 36)
        .attr('rx', 6)
        .attr('fill', '#eef3ff')
        .attr('stroke', '#4b6cff');

      node.filter((d: any) => d.type === 'method')
        .append('text')
        .attr('dy', '.31em')
        .style('text-anchor', 'middle')
        .style('font-weight', '700')
        .text((d: any) => d.name);

      node.filter((d: any) => d.type === 'method')
        .append('title')
        .text((d: any) => d.reasoning ?? '');

      node.filter((d: any) => d.type === 'method')
        .on('mouseover', (event: any, d: any) => {
          try { this.hoveredReasoning = d.reasoning ?? ''; this.cdr.detectChanges(); } catch (e) { }
        })
        .on('mouseout', (event: any, d: any) => {
          try { this.hoveredReasoning = null; this.cdr.detectChanges(); } catch (e) { }
        });

      node.filter((d: any) => d.type === 'module' || d.type === 'module')
        .append('circle')
        .attr('r', 18)
        .attr('fill', (d: any) => this.getNodeColor(d))
        .attr('stroke', '#333')
        .attr('stroke-width', 1);

      node.filter((d: any) => d.type === 'module')
        .on('click', (event: any, d: any) => {
          try { this.selectedTitle = d.name; this.selectedDescription = d.description ?? ''; this.cdr.detectChanges(); } catch (e) { }
        })
        .style('cursor', 'pointer');

      node.filter((d: any) => d.type === 'module' || d.type === 'module')
        .append('text')
        .attr('dy', '.31em')
        .attr('x', 26)
        .style('text-anchor', 'start')
        .text((d: any) => d.name);

      node.append('title').text((d: any) => d.description ?? '');

      node.filter((d: any) => d.type === 'module')
        .append('text')
        .attr('class', 'risk-badge')
        .attr('dy', '-1.2em')
        .attr('x', 26)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', (d: any) => this.getRiskColor(d.risk ?? 0))
        .text((d: any) => (typeof d.risk === 'number' && d.risk > 0) ? `Risk ${d.risk}` : '');

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => (d.source as any).x)
          .attr('y1', (d: any) => (d.source as any).y)
          .attr('x2', (d: any) => (d.target as any).x)
          .attr('y2', (d: any) => (d.target as any).y);

        node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });

      return;
    }

    const svg = d3.select(element).append('svg').attr('width', width).attr('height', height).append('g').attr('transform', `translate(${width / 4},${height / 2})`);
    this.treeLayout = d3.tree().size([height * 0.8, width * 0.6]);
    this.root = d3.hierarchy(data);
    const treeNodes = this.treeLayout(this.root);

    const treeLink = svg.selectAll('.link')
      .data(treeNodes.links())
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => (d3.linkHorizontal().x((x: any) => x.y).y((x: any) => x.x) as any)(d));

    const treeNode = svg.selectAll('.node')
      .data(treeNodes.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

    treeNode.append('circle').attr('r', 6).style('stroke', (d: any) => this.getNodeColor(d.data));
    treeNode.append('text').attr('dy', '.31em').attr('x', (d: any) => d.children ? -8 : 8).style('text-anchor', (d: any) => d.children ? 'end' : 'start').text((d: any) => d.data.name);
    treeNode.append('title').text((d: any) => d.data.description ? `${d.data.description}` : '');
  }

  private getNodeColor(node: ImpactNode): string {
    switch (node.impact) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }

  private getRiskColor(risk: number): string {
    if (risk == null) return '#6c757d';
    if (risk >= 8) return '#dc3545';
    if (risk >= 5) return '#ffc107';
    if (risk > 0) return '#28a745';
    return '#6c757d';
  }

  getImpactCount(impact: 'high' | 'medium' | 'low'): number {
    const countImpact = (node: ImpactNode): number => {
      let count = node.impact === impact ? 1 : 0;
      if (node.children) {
        count += node.children.reduce((acc, child) => acc + countImpact(child), 0);
      }
      return count;
    };
    return this.impactData ? countImpact(this.transformData(this.impactData)) : 0;
  }
}