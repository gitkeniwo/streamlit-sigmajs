import React from 'react';

export interface NodeInfo {
  id: string;
  labels: string[];
  color: string;
  properties: Record<string, any>;
}

// 动态属性显示组件
interface DynamicPropertiesProps {
  properties: Record<string, any>;
}

const DynamicProperties: React.FC<DynamicPropertiesProps> = ({ properties }) => {
  // 过滤掉一些内部属性（如果需要）
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

// 基本信息子组件（更新版）
interface BasicInfoProps {
  id: string;
  labels: string[];
  color: string;
  properties: Record<string, any>;
}

const BasicInfo: React.FC<BasicInfoProps> = ({ id, labels, color, properties }) => {
  return (
    <div className="property-group">
      <h4>Basic Information</h4>
      <div className="property-item">
        <span className="property-label">ID</span>
        <span className="property-value">{id}</span>
      </div>
      <div className="property-item">
        <span className="property-label">Labels</span>
        <div className="labels-container">
          {labels.map((label, index) => (
            <span
              key={index}
              className="property-badge"
              style={{
                backgroundColor: color + '20',
                color: color,
                border: `1.5px solid ${color}`,
                marginRight: '5px',
              }}
            >
              {label}
            </span>
          ))}
        </div>
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

// PropertiesPanel 主组件
export interface PropertiesPanelProps {
  selectedNode: NodeInfo;
  onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedNode, onClose }) => {
  return (
    <div className="properties-panel">
      <div className="properties-header">
        <h3>Node Properties</h3>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="properties-content">
        <BasicInfo
          id={selectedNode.id}
          labels={selectedNode.labels}
          color={selectedNode.color}
          properties={selectedNode.properties}
        />
        <PropertiesGroup properties={selectedNode.properties} />
      </div>
    </div>
  );
};

export default PropertiesPanel;