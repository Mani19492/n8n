import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);
import { supabase } from '@/lib/supabase';
import { Loader2, Maximize2, Share2, ZoomIn, ZoomOut } from 'lucide-react';

interface GraphEngineProps {
  investigationId?: string;
  elements?: any[];
  onNodeClick?: (id: string) => void;
}

export default function GraphEngine({ investigationId, elements: externalElements, onNodeClick }: GraphEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAndBuildGraph = async () => {
      setIsLoading(true);
      try {
        let graphElements = externalElements;

        if (!graphElements && investigationId) {
          const { data: records } = await supabase
            .from('forensic_records')
            .select('a_party, b_party')
            .eq('investigation_id', investigationId)
            .limit(1000);

          if (!records) return;

          const nodes = new Set<string>();
          const edgeMap = new Map<string, number>();

          records.forEach(r => {
            if (!r.a_party || !r.b_party) return;
            nodes.add(r.a_party);
            nodes.add(r.b_party);

            const edgeId = [r.a_party, r.b_party].sort().join('-');
            edgeMap.set(edgeId, (edgeMap.get(edgeId) || 0) + 1);
          });

          graphElements = [
            ...Array.from(nodes).map(node => ({
              data: { id: node, label: node }
            })),
            ...Array.from(edgeMap.entries()).map(([id, weight]) => {
              const [source, target] = id.split('-');
              return {
                data: { id, source, target, weight }
              };
            })
          ];
        }

        if (!graphElements) return;

        if (containerRef.current) {
          cyRef.current = cytoscape({
            container: containerRef.current,
            elements: graphElements,
            style: [
              {
                selector: 'node',
                style: {
                  'shape': 'round-rectangle',
                  'background-color': '#151521',
                  'label': 'data(label)',
                  'color': '#00d1ff',
                  'font-size': '10px',
                  'font-weight': 'bold',
                  'width': '120px',
                  'height': '40px',
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'border-width': '1px',
                  'border-color': '#2B2B40',
                  'overlay-opacity': 0,
                  'shadow-blur': 10,
                  'shadow-color': '#00d1ff',
                  'shadow-opacity': 0.1
                } as any
              },
              {
                selector: 'edge',
                style: {
                  'width': 2,
                  'line-color': '#B524DB',
                  'opacity': 0.4,
                  'curve-style': 'bezier',
                  'target-arrow-shape': 'triangle',
                  'target-arrow-color': '#B524DB',
                  'overlay-opacity': 0
                }
              }
            ],
            layout: {
              name: 'dagre',
              rankDir: 'LR',
              nodeSep: 60,
              edgeSep: 20,
              rankSep: 100,
              animate: true,
            } as any
          });

          cyRef.current.on('tap', 'node', (evt: any) => {
            const node = evt.target;
            if (onNodeClick) onNodeClick(node.id());
          });
        }
      } catch (error) {
        console.error('Graph Engine Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndBuildGraph();

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [investigationId, externalElements, onNodeClick]);

  return (
    <div className="relative h-full w-full bg-[#151521] overflow-hidden group rounded-xl">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#020617]/80">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="text-[#00d1ff] animate-spin" size={32} />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Constructing Relationship Neural Map</p>
          </div>
        </div>
      )}
      
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
         <button onClick={() => cyRef.current?.fit()} className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
            <Maximize2 size={16} />
         </button>
         <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)} className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
            <ZoomIn size={16} />
         </button>
         <button onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)} className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
            <ZoomOut size={16} />
         </button>
         <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
            <Share2 size={16} />
         </button>
      </div>
    </div>
  );
}
