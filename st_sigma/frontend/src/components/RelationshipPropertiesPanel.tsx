import React from 'react';

export interface EdgeInfo {
  id: string;
  source: string;
  target: string;
  relType: string;
  color: string;
  properties: Record<string, any>;
}

// 动态属性显示组件
interface DynamicPropertiesProps {
  properties: Record<string, any>;
}

const DynamicProperties: React.FC<DynamicPropertiesProps> = ({ properties }) => {
  const filteredProperties = Object.entries(properties).filter(
    ([key]) => !['size', 'baseSize', 'baseColor'].includes(key)
  );

  if (filteredProperties.length === 0) {
    return <p className="no-properties">No properties available</p>;
  }

  return (
    <>
      {filteredProperties.map(([key, value]) => (
        <div key={key} className="property-item">
          <span className="property-label">{key}</span>
          <span className="property-value">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </>
  );
};

// 基本信息子组件
interface BasicInfoProps {
  id: string;
  source: string;
  target: string;
  relType: string;
  color: string;
}

const BasicInfo: React.FC<BasicInfoProps> = ({ id, source, target, relType, color }) => {
  return (
    <div className="property-group">
      <h4>Basic Information</h4>
      <div className="property-item">
        <span className="property-label">ID</span>
        <span className="property-value">{id}</span>
      </div>
      <div className="property-item">
        <span className="property-label">Type</span>
        <span
          className="property-badge"
          style={{
            backgroundColor: color + '20',
            color: color,
            border: `1.5px solid ${color}`,
          }}
        >
          {relType}
        </span>
      </div>
      <div className="property-item">
        <span className="property-label">Source</span>
        <span className="property-value">{source}</span>
      </div>
      <div className="property-item">
        <span className="property-label">Target</span>
        <span className="property-value">{target}</span>
      </div>
    </div>
  );
};

// 属性组件
interface PropertiesGroupProps {
  properties: Record<string, any>;
}

const PropertiesGroup: React.FC<PropertiesGroupProps> = ({ properties }) => {
  return (
    <div className="property-group">
      <h4>Properties</h4>
      <DynamicProperties properties={properties} />
    </div>
  );
};

// RelationshipPropertiesPanel 主组件
export interface RelationshipPropertiesPanelProps {
  selectedEdge: EdgeInfo;
  onClose: () => void;
}

const RelationshipPropertiesPanel: React.FC<RelationshipPropertiesPanelProps> = ({ 
  selectedEdge, 
  onClose 
}) => {
  return (
    <div className="properties-panel relationship-panel">
      <div className="properties-header">
        <h3>Relationship Properties</h3>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="properties-content">
        <BasicInfo
          id={selectedEdge.id}
          source={selectedEdge.source}
          target={selectedEdge.target}
          relType={selectedEdge.relType}
          color={selectedEdge.color}
        />
        <PropertiesGroup properties={selectedEdge.properties} />
      </div>
    </div>
  );
};

export default RelationshipPropertiesPanel;