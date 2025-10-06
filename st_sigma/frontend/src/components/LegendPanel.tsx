import React, { useState } from 'react';

export interface NodeType {
  type: string;
  color: string;
  description: string;
}

export interface RelationshipType {
  type: string;
  count: number;
}

export interface LegendPanelProps {
  nodeTypes: NodeType[];
  relationshipTypes: RelationshipType[];
  graphOrder: number;
  graphSize: number;
}

const LegendPanel: React.FC<LegendPanelProps> = ({ 
  nodeTypes, 
  relationshipTypes,
  graphOrder, 
  graphSize 
}) => {
  const [visible, setVisible] = useState(false);

  const toggleVisibility = () => {
    setVisible(prevVisible => !prevVisible);
  };

  return (
    <div className="legend-panel">
      <div className="legend-header">
        <h3>Legend</h3>
        <button onClick={toggleVisibility} className="legend-toggle-button">
          {visible ? '−' : '+'}
        </button>
      </div>

      {visible && (
        <>
          {/* 节点类型 - 紧凑版 */}
          <div className="legend-section">
            <h4 className="legend-section-title">Labels</h4>
            <div className="legend-items-compact">
              {nodeTypes.map((nodeType) => (
                <div key={nodeType.type} className="legend-item-compact">
                  <div className="legend-color-small" style={{ backgroundColor: nodeType.color }} />
                  <span className="legend-label">{nodeType.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 关系类型 - 紧凑版 */}
          <div className="legend-section">
            <h4 className="legend-section-title">Relations</h4>
            <div className="relationship-types-compact">
              {relationshipTypes.map((relType) => (
                <div key={relType.type} className="relationship-item-compact">
                  <span className="relationship-icon-small">→</span>
                  <span className="relationship-label">{relType.type}</span>
                  <span className="relationship-count-small">({relType.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* 统计信息 - 紧凑版 */}
          <div className="legend-stats-compact">
            <div className="stat-item-compact">
              <span className="stat-label">Nodes</span>
              <span className="stat-value">{graphOrder}</span>
            </div>
            <div className="stat-divider">|</div>
            <div className="stat-item-compact">
              <span className="stat-label">Edges</span>
              <span className="stat-value">{graphSize}</span>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default LegendPanel;