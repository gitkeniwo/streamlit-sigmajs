import React, { useState } from 'react';
import { List, ChevronsLeft, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- 类型定义 (与您提供的一致) ---
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

// --- 重构后的 LegendPanel 组件 ---
const LegendPanel: React.FC<LegendPanelProps> = ({ 
  nodeTypes, 
  relationshipTypes,
  graphOrder, 
  graphSize 
}) => {
  const [isOpen, setIsOpen] = useState(true);


  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button 
          onClick={() => setIsOpen(true)} 
          size="icon" 
          variant="outline" 
          className="rounded-full shadow-lg bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-900/80"
        >
          <List className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
          <span className="sr-only">Open Legend</span>
        </Button>
      </div>
    );
  }

  // 展开状态：显示完整的图例卡片
  return (
    <Card className="font-space-grotesk fixed bottom-4 left-4 z-50 w-52 max-h-[calc(100vh-4rem)] flex flex-col backdrop-blur-lg bg-white/80 dark:bg-zinc-900/80 shadow-2xl shadow-black/10 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 transition-all duration-300 ease-in-out">
      {/* 卡片头部：标题和关闭按钮 */}
      <CardHeader className="flex flex-row items-center justify-between p-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 pl-1">Legend</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setIsOpen(false)}>
          <ChevronsLeft className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="sr-only">Close Legend</span>
        </Button>
      </CardHeader>
      

      <ScrollArea className="flex-1">
        <CardContent className="p-2 text-sm">

          <div className="space-y-1.5">
            <h4 className="font-medium text-2xs text-zinc-500 dark:text-zinc-400 tracking-wider px-1">Nodes</h4>
            <div className="flex flex-col gap-1">
              {nodeTypes.map((nodeType) => (
                <div key={nodeType.type} className="flex items-center gap-2 group cursor-default p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/50" title={nodeType.description}>
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border dark:border-white/20" 
                    style={{ backgroundColor: nodeType.color }} 
                  />
                  <span className="text-zinc-700 dark:text-zinc-300 text-xs group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    {nodeType.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-2 bg-zinc-200/80 dark:bg-zinc-800/80" />



          <div className="space-y-1.5">
            <h4 className="font-medium text-tiny text-zinc-500 dark:text-zinc-400 tracking-wider px-1">Relationships</h4>
            <div className="flex flex-col gap-1">
              {relationshipTypes.map((relType) => (
                <div key={relType.type} className="flex items-center justify-between group cursor-default p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-zinc-700 dark:text-zinc-300 text-xs group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                      {relType.type}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 rounded-sm px-1 py-0.5">
                    {relType.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </ScrollArea>
      

      <CardFooter className="p-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center justify-around w-full text-center">
            <div className="flex flex-col">
                <span className="text-base font-bold text-zinc-800 dark:text-zinc-200">{graphOrder}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Nodes</span>
            </div>
            <div className="h-6 w-px bg-zinc-200/80 dark:bg-zinc-800/80" />
            <div className="flex flex-col">
                <span className="text-base font-bold text-zinc-800 dark:text-zinc-200">{graphSize}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Edges</span>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default LegendPanel;

