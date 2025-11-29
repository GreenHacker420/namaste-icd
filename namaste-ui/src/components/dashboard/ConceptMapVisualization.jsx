'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Download,
  Info
} from 'lucide-react';

/**
 * Interactive Concept Map Visualization Component
 * Shows the NAMASTE-ICD to ICD-11 TM2 mapping architecture
 */
export function ConceptMapVisualization() {
  const canvasRef = useRef(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Graph data structure
  const nodes = [
    { id: 'namaste', label: 'NAMASTE\nCodes', type: 'source', x: 100, y: 300, color: '#4CAF50' },
    { id: 'ayurveda', label: 'Ayurveda\n(~2,500)', type: 'system', x: 250, y: 150, color: '#66BB6A' },
    { id: 'siddha', label: 'Siddha\n(~1,800)', type: 'system', x: 250, y: 300, color: '#66BB6A' },
    { id: 'unani', label: 'Unani\n(~1,600)', type: 'system', x: 250, y: 450, color: '#66BB6A' },
    
    { id: 'preprocess', label: 'Preprocess', type: 'workflow', x: 450, y: 200, color: '#FF9800' },
    { id: 'embed', label: 'Embedding', type: 'workflow', x: 450, y: 300, color: '#FF9800' },
    { id: 'search', label: 'Semantic\nSearch', type: 'workflow', x: 450, y: 400, color: '#FF9800' },
    
    { id: 'ai', label: 'AI Validation\n(Gemini)', type: 'ai', x: 650, y: 300, color: '#FFA726' },
    
    { id: 'mapping', label: 'Mapping\nStorage', type: 'storage', x: 850, y: 300, color: '#9C27B0' },
    
    { id: 'tm2', label: 'ICD-11 TM2', type: 'target', x: 1050, y: 300, color: '#2196F3' },
    { id: 'tm2-a', label: 'TM2.A\nAyurveda', type: 'icd', x: 1200, y: 150, color: '#42A5F5' },
    { id: 'tm2-s', label: 'TM2.S\nSiddha', type: 'icd', x: 1200, y: 300, color: '#42A5F5' },
    { id: 'tm2-u', label: 'TM2.U\nUnani', type: 'icd', x: 1200, y: 450, color: '#42A5F5' },
    
    { id: 'fhir', label: 'FHIR R4\nTerminology', type: 'fhir', x: 850, y: 500, color: '#AB47BC' },
  ];

  const links = [
    { source: 'namaste', target: 'ayurveda', label: '' },
    { source: 'namaste', target: 'siddha', label: '' },
    { source: 'namaste', target: 'unani', label: '' },
    
    { source: 'ayurveda', target: 'preprocess', label: '' },
    { source: 'siddha', target: 'preprocess', label: '' },
    { source: 'unani', target: 'preprocess', label: '' },
    
    { source: 'preprocess', target: 'embed', label: 'normalize' },
    { source: 'embed', target: 'search', label: 'vector' },
    { source: 'search', target: 'ai', label: 'candidates' },
    { source: 'ai', target: 'mapping', label: 'validated' },
    
    { source: 'mapping', target: 'tm2', label: '' },
    { source: 'tm2', target: 'tm2-a', label: '' },
    { source: 'tm2', target: 'tm2-s', label: '' },
    { source: 'tm2', target: 'tm2-u', label: '' },
    
    { source: 'mapping', target: 'fhir', label: 'ConceptMap' },
  ];

  const stats = [
    { value: '~6,000', label: 'NAMASTE Codes' },
    { value: '80%', label: 'High/Medium Confidence' },
    { value: '3', label: 'Traditional Systems' },
    { value: 'FHIR R4', label: 'Standards Compliant' },
  ];

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Apply transformations
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw links
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    links.forEach(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
        const arrowSize = 10;
        ctx.beginPath();
        ctx.moveTo(targetNode.x - 40 * Math.cos(angle), targetNode.y - 40 * Math.sin(angle));
        ctx.lineTo(
          targetNode.x - 40 * Math.cos(angle) - arrowSize * Math.cos(angle - Math.PI / 6),
          targetNode.y - 40 * Math.sin(angle) - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          targetNode.x - 40 * Math.cos(angle) - arrowSize * Math.cos(angle + Math.PI / 6),
          targetNode.y - 40 * Math.sin(angle) - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = '#999';
        ctx.fill();

        // Draw label
        if (link.label) {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          ctx.fillStyle = '#666';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(link.label, midX, midY - 5);
        }
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const isSelected = selectedNode?.id === node.id;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 40, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#000' : '#333';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Draw label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const lines = node.label.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, node.x, node.y - 6 + i * 14);
      });
    });

    ctx.restore();
  }, [zoom, pan, selectedNode]);

  // Handle mouse events
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check if clicking on a node
    const clickedNode = nodes.find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= 40;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'examples', label: 'Examples' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-0">
            <CardContent className="py-6">
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm opacity-90">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-600" />
            NAMASTE-ICD Concept Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                  selectedTab === tab.id
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-500 border-transparent hover:text-indigo-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 ml-2">
                  Zoom: {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Canvas */}
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <canvas
                  ref={canvasRef}
                  width={1300}
                  height={600}
                  className="cursor-move"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#4CAF50] border-2 border-gray-800"></div>
                  <span className="text-sm">NAMASTE Codes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#2196F3] border-2 border-gray-800"></div>
                  <span className="text-sm">ICD-11 TM2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#FF9800] border-2 border-gray-800"></div>
                  <span className="text-sm">AI Mapping Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#9C27B0] border-2 border-gray-800"></div>
                  <span className="text-sm">FHIR Terminology</span>
                </div>
              </div>

              {/* Selected Node Info */}
              {selectedNode && (
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-indigo-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-indigo-900 mb-1">
                          {selectedNode.label.replace('\n', ' ')}
                        </h4>
                        <p className="text-sm text-indigo-700">
                          Type: <Badge variant="info">{selectedNode.type}</Badge>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Architecture Tab */}
          {selectedTab === 'architecture' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">System Components</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><strong>Frontend:</strong> Next.js 16 + Tailwind CSS + React Query</li>
                  <li><strong>Backend:</strong> Hono (Node.js) + PostgreSQL + Prisma ORM</li>
                  <li><strong>AI Engine:</strong> LangChain.js + Google Gemini (Pro/Flash)</li>
                  <li><strong>Embeddings:</strong> text-embedding-004 (768 dimensions)</li>
                  <li><strong>Vector Search:</strong> PostgreSQL pgvector extension</li>
                  <li><strong>Standards:</strong> FHIR R4 Terminology Service</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Database Schema</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><strong>NamasteCode:</strong> Ayurveda, Siddha, Unani morbidity codes</li>
                  <li><strong>Tm2Code:</strong> WHO ICD-11 TM2 classification codes</li>
                  <li><strong>Mapping:</strong> FHIR ConceptMap relationships</li>
                  <li><strong>Embedding:</strong> Vector embeddings for semantic search</li>
                  <li><strong>AuditLog:</strong> DISHA-compliant audit trail</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">FHIR ConceptMap Equivalence Types</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><strong>EQUIVALENT:</strong> Exact semantic match (1:1)</li>
                  <li><strong>WIDER:</strong> ICD-11 concept is broader than NAMASTE</li>
                  <li><strong>NARROWER:</strong> ICD-11 concept is more specific</li>
                  <li><strong>INEXACT:</strong> Related but not equivalent</li>
                  <li><strong>UNMATCHED:</strong> No suitable ICD-11 match found</li>
                </ul>
              </div>
            </div>
          )}

          {/* Workflow Tab */}
          {selectedTab === 'workflow' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">
                AI-Powered Mapping Pipeline (LangGraph)
              </h3>
              
              {[
                { step: 1, title: 'Preprocess Node', desc: 'Normalizes NAMASTE code text (Sanskrit/Tamil/Arabic → English)' },
                { step: 2, title: 'Embed Node', desc: 'Generates 768-dim vector embedding using text-embedding-004' },
                { step: 3, title: 'Semantic Search Node', desc: 'PostgreSQL full-text search + vector similarity (pgvector)' },
                { step: 4, title: 'Confidence Check', desc: 'Routes to AI validation or high-confidence path' },
                { step: 5, title: 'AI Validation Node', desc: 'Gemini Pro analyzes candidates and assigns equivalence type' },
                { step: 6, title: 'Store Mapping', desc: 'Saves FHIR ConceptMap with confidence score and reasoning' },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-lg">
                    <div className="font-semibold mb-1">{item.step}. {item.title}</div>
                    <div className="text-sm opacity-90">{item.desc}</div>
                  </div>
                  {i < 5 && (
                    <div className="flex justify-center my-2">
                      <div className="text-2xl text-indigo-600">↓</div>
                    </div>
                  )}
                </div>
              ))}

              <div className="bg-gray-50 p-4 rounded-lg mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Workflow Features</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><strong>Semantic Matching:</strong> Vector embeddings capture clinical meaning</li>
                  <li><strong>AI Reasoning:</strong> Gemini Pro provides explainable mappings</li>
                  <li><strong>Confidence Scoring:</strong> 0.0-1.0 scale for quality assurance</li>
                  <li><strong>Human Validation:</strong> Expert review for low-confidence mappings</li>
                  <li><strong>Batch Processing:</strong> Concurrent mapping of multiple codes</li>
                </ul>
              </div>
            </div>
          )}

          {/* Examples Tab */}
          {selectedTab === 'examples' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Example: Ayurveda → ICD-11 TM2</h3>
                
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">NAMASTE Code:</p>
                  <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                    <pre>{`{
  "code": "AYU-001",
  "system": "AYURVEDA",
  "term": "वात व्याधि",
  "englishName": "Vata Disorder",
  "shortDefinition": "Disorder caused by vitiation of Vata dosha"
}`}</pre>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">ICD-11 TM2 Mapping:</p>
                  <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                    <pre>{`{
  "code": "TM2.A01.AA",
  "title": "Vata disorder",
  "definition": "Disorders attributed to imbalance of Vata dosha"
}`}</pre>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Mapping Result:</p>
                  <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs overflow-x-auto">
                    <pre>{`{
  "equivalence": "EQUIVALENT",
  "confidence": 0.95,
  "mappingSource": "AI_VALIDATED",
  "reasoning": "Exact semantic match - both refer to Vata dosha disorders"
}`}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
