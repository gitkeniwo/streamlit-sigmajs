import React from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';


export interface NodeInfo {
  id: string;
  labels: string[];
  color: string;
  properties: Record<string, any>;
}

export interface PropertiesPanelProps {
  selectedNode: NodeInfo | null;
  onClose: () => void;
}


const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedNode, onClose }) => {

  if (!selectedNode) {
    return null;
  }
  

  const filteredProperties = Object.entries(selectedNode.properties).filter(
    ([key]) => !['size', 'baseSize', 'baseColor', 'x', 'y'].includes(key)
  );

  return (
    <Card className="fixed top-4 right-4 bottom-4 z-50 w-72 flex flex-col backdrop-blur-xl bg-[#fdfcfb]/90 shadow-2xl shadow-black/10 rounded-2xl border border-[#e8e3d8]/80 animate-in slide-in-from-right-4 duration-300">

      <CardHeader className="flex flex-row items-center justify-between p-3 border-b border-[#e8e3d8]">
        <h3 className="font-semibold text-sm text-[#1a1715]">Node Properties</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-[#6b5d4f] hover:bg-[#f4f1ea] hover:text-[#1a1715]" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close Properties</span>
        </Button>
      </CardHeader>


      <ScrollArea className="flex-1">
        <CardContent className="p-3 text-sm space-y-4">

          <div className="space-y-3">
            <div>
              <div className="text-xs text-[#6b5d4f] font-medium mb-1">ID</div>
              <div className="text-xs font-mono text-[#1a1715] bg-[#f4f1ea] rounded-md p-1.5 break-all">
                {selectedNode.id}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6b5d4f] font-medium mb-1.5">label</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedNode.labels.map((label, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="font-normal text-xs border-[#dcd6c9] text-[#4a4137] bg-[#f4f1ea]/60"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator className="bg-[#e8e3d8]" />


          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-[#1a1715]">Properties</h4>
            {filteredProperties.length > 0 ? (
              <div className="space-y-1 text-xs">
                {filteredProperties.map(([key, value], index) => (
                  <div 
                    key={key} 
                    className={`grid grid-cols-3 gap-2 items-start p-1.5 rounded-lg transition-colors ${
                      index % 2 === 0 ? 'bg-transparent' : 'bg-[#f4f1ea]/60'
                    } hover:bg-[#f4f1ea]`}
                  >
                    <div className="text-[#6b5d4f] truncate col-span-1" title={key}>
                      {key}
                    </div>
                    <div className="text-[#1a1715] font-medium break-words col-span-2">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#6b5d4f] italic">
                No additional properties
              </p>
            )}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default PropertiesPanel;

