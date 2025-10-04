import React, { useState } from 'react';

export interface NodeType {
  type: string;
  color: string;
  description: string;
}

export interface LegendPanelProps {
  nodeTypes: NodeType[];
  graphOrder: number;
  graphSize: number;
}

const LegendPanel: React.FC<LegendPanelProps> = ({ nodeTypes, graphOrder, graphSize }) => {
  const [visible, setVisible] = useState(true);

  const toggleVisibility = () => {
    setVisible(prevVisible => !prevVisible);
  };

  return (
    <div className="legend-panel">
      <div className="legend-header">
        <h3>Legend</h3>
        <button 
            onClick={toggleVisibility} 
            className="legend-toggle-button"
            // 再小一点
            style={{ 
                backgroundColor: visible ? '#f0f0f0' : '#d9d8c9ff',
                border: 'none',
                padding: '5px 10px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '0.8rem',
            }}
        >
          {visible ? 'Hide' : 'Show Legend'}
        </button>
      </div>
      {visible && (
        <>
          <div className="legend-items">
            {nodeTypes.map((nodeType) => (
              <div key={nodeType.type} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: nodeType.color }} />
                <div className="legend-text">
                  <strong>{nodeType.type}</strong>
                  <span>{nodeType.description}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="legend-stats">
            <div className="stat-item">
              <strong>Nodes:</strong> <span>{graphOrder}</span>
            </div>
            <div className="stat-item">
              <strong>Edges:</strong> <span>{graphSize}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LegendPanel;