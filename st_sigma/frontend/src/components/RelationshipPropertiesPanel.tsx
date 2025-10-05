import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface EdgeInfo {
  id: string;
  source: string;
  target: string;
  relType: string;
  color: string;
  properties: Record<string, any>;
}

export interface RelationshipPropertiesPanelProps {
  selectedEdge: EdgeInfo;
  onClose: () => void;
}

const RelationshipPropertiesPanel: React.FC<RelationshipPropertiesPanelProps> = ({ 
  selectedEdge, 
  onClose 
}) => {
  const filteredProperties = Object.entries(selectedEdge.properties).filter(
    ([key]) => !['size', 'baseSize', 'baseColor'].includes(key)
  );

  return (
    <div className="fixed top-10 right-10 bottom-10 w-[340px] backdrop-blur-md bg-[rgba(253,252,251,0.98)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08),0_0_0_1px_rgba(232,227,216,0.8)] border border-[rgba(232,227,216,0.6)] overflow-hidden animate-in slide-in-from-right-6 duration-300 flex flex-col">
      {/* Header - Sticky with gradient */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-[#e8e3d8] bg-gradient-to-r from-[#8B9D83] to-[#7D8B7F] rounded-t-2xl">
        <h3 className="m-0 text-white text-[17px] font-medium tracking-tight">
          Relationship Properties
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 rounded-lg hover:bg-[rgba(255,255,255,0.15)] text-white/90 hover:text-white"
        >
          <X className="h-[22px] w-[22px]" />
        </Button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-3">
          <h4 className="m-0 mb-3 text-[#4a4137] text-xs uppercase tracking-[0.8px] font-semibold">
            Basic Information
          </h4>
          
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5 p-[12px_14px] bg-[rgba(244,241,234,0.5)] rounded-[10px] border border-[rgba(232,227,216,0.6)] hover:bg-[rgba(244,241,234,0.8)] hover:border-[rgba(232,227,216,1)] transition-all duration-200">
              <span className="text-[#6b5d4f] text-[11px] font-semibold uppercase tracking-[0.5px]">
                ID
              </span>
              <span className="text-[#1a1715] text-[15px] break-words leading-[1.5]">
                {selectedEdge.id}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 p-[12px_14px] bg-[rgba(244,241,234,0.5)] rounded-[10px] border border-[rgba(232,227,216,0.6)] hover:bg-[rgba(244,241,234,0.8)] hover:border-[rgba(232,227,216,1)] transition-all duration-200">
              <span className="text-[#6b5d4f] text-[11px] font-semibold uppercase tracking-[0.5px]">
                Type
              </span>
              <Badge
                className="inline-block self-start px-[14px] py-2 rounded-[20px] text-[13px] font-medium tracking-tight mt-1 bg-transparent"
                style={{
                  color: selectedEdge.color,
                  border: `1.5px solid ${selectedEdge.color}`,
                }}
              >
                {selectedEdge.relType}
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5 p-[12px_14px] bg-[rgba(244,241,234,0.5)] rounded-[10px] border border-[rgba(232,227,216,0.6)] hover:bg-[rgba(244,241,234,0.8)] hover:border-[rgba(232,227,216,1)] transition-all duration-200">
              <span className="text-[#6b5d4f] text-[11px] font-semibold uppercase tracking-[0.5px]">
                Source
              </span>
              <span className="text-[#1a1715] text-[15px] break-words leading-[1.5]">
                {selectedEdge.source}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 p-[12px_14px] bg-[rgba(244,241,234,0.5)] rounded-[10px] border border-[rgba(232,227,216,0.6)] hover:bg-[rgba(244,241,234,0.8)] hover:border-[rgba(232,227,216,1)] transition-all duration-200">
              <span className="text-[#6b5d4f] text-[11px] font-semibold uppercase tracking-[0.5px]">
                Target
              </span>
              <span className="text-[#1a1715] text-[15px] break-words leading-[1.5]">
                {selectedEdge.target}
              </span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-[#e8e3d8]" />

        {/* Properties */}
        <div className="space-y-3">
          <h4 className="m-0 mb-3 text-[#4a4137] text-xs uppercase tracking-[0.8px] font-semibold">
            Properties
          </h4>
          
          {filteredProperties.length > 0 ? (
            <div className="space-y-3">
              {filteredProperties.map(([key, value]) => (
                <div
                  key={key}
                  className="flex flex-col gap-1.5 p-[12px_14px] bg-[rgba(244,241,234,0.5)] rounded-[10px] border border-[rgba(232,227,216,0.6)] hover:bg-[rgba(244,241,234,0.8)] hover:border-[rgba(232,227,216,1)] transition-all duration-200"
                >
                  <span className="text-[#6b5d4f] text-[11px] font-semibold uppercase tracking-[0.5px]">
                    {key}
                  </span>
                  <span className="text-[#1a1715] text-[15px] break-words leading-[1.5]">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#999] text-xs italic py-2.5">
              No properties available
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelationshipPropertiesPanel;