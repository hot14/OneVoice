import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { graphService } from "../services/graphService";

interface GraphViewProps {
  materialId: string;
}

export function GraphView({ materialId }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const graphData = await graphService.getGraph(materialId);
        setData(graphData);
      } catch (error) {
        console.error("Failed to load graph data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [materialId]);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom().on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    // typing fix
    (svg as any).call(zoom);

    // Color scale for node types
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Links
    const link = g.append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", (d: any) => Math.sqrt(d.confidence || 1) * 2);

    // Link labels
    const linkLabel = g.append("g")
      .selectAll("text")
      .data(data.links)
      .join("text")
      .attr("font-size", "8px")
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .text((d: any) => d.type);

    // Nodes
    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => color(d.type))
      .call(drag(simulation) as any);

    // Node labels
    const label = g.append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .text((d: any) => d.label);

    node.append("title").text((d: any) => `${d.label} (${d.type})\n${d.description || ""}`);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
    });

    function drag(sim: any) {
      function dragstarted(event: any) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => simulation.stop();
  }, [data]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy as any, factor);
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
        <Maximize2 className="w-12 h-12 mb-2 opacity-20" />
        <p>No knowledge graph data yet.</p>
        <p className="text-xs">Try running "Generate Graph" for this material.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden group">
      <svg ref={svgRef} width="100%" height="400" className="cursor-move" />
      
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => handleZoom(1.2)}
          className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50"
        >
          <ZoomIn className="w-4 h-4 text-slate-600" />
        </button>
        <button 
          onClick={() => handleZoom(0.8)}
          className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50"
        >
          <ZoomOut className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 text-[10px] space-y-1">
        <p className="font-bold mb-1 text-slate-700 uppercase tracking-wider">Legend</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#1f77b4]" /> <span>Concept</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ff7f0e]" /> <span>Entity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2ca02c]" /> <span>Function</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#d62728]" /> <span>Module</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#9467bd]" /> <span>Term</span>
        </div>
      </div>
    </div>
  );
}
