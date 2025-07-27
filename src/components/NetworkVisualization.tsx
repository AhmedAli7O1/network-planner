import { parseCidr } from '@/lib/subnet-utils';
import type { NetworkSegmentPlan } from '@/lib/subnet-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface NetworkVisualizationProps {
  baseNetwork: string;
  networkSegments: NetworkSegmentPlan[];
}

// Color palette for network segments - distinct colors that work well together
const NETWORK_SEGMENT_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F43F5E', // Rose
];

// Get color for network segment based on index
const getNetworkSegmentColor = (index: number): string => {
  return NETWORK_SEGMENT_COLORS[index % NETWORK_SEGMENT_COLORS.length];
};

export function NetworkVisualization({ baseNetwork, networkSegments }: NetworkVisualizationProps) {
  if (!baseNetwork || networkSegments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Network Visualization</CardTitle>
          <CardDescription>
            Visual representation of your network segment layout
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded-md flex items-center justify-center">
            <p className="text-muted-foreground">
              Add network segments to see the network visualization
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { network: baseNet, mask: baseMask } = parseCidr(baseNetwork);
  const baseStart = baseNet;
  const baseEnd = baseNet | (~baseMask >>> 0);
  const totalRange = baseEnd - baseStart + 1;

  // Sort network segments by network address
  const sortedSegments = [...networkSegments].sort((a, b) => {
    const { network: netA } = parseCidr(a.cidr);
    const { network: netB } = parseCidr(b.cidr);
    return netA - netB;
  });

  // Calculate network segment positions and widths
  const segmentVisualizations = sortedSegments.map((segment) => {
    const { network: segmentNet, mask: segmentMask } = parseCidr(segment.cidr);
    const segmentStart = segmentNet;
    const segmentEnd = segmentNet | (~segmentMask >>> 0);
    const segmentRange = segmentEnd - segmentStart + 1;

    const offset = ((segmentStart - baseStart) / totalRange) * 100;
    const width = (segmentRange / totalRange) * 100;

    return {
      ...segment,
      offset,
      width,
      segmentRange
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Visualization</CardTitle>
        <CardDescription>
          Visual representation of your network segment layout
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base Network Bar with Network Segment Overlays */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Base Network: {baseNetwork}</span>
            <span className="text-muted-foreground">
              {totalRange.toLocaleString()} total addresses
            </span>
          </div>
          <div className="w-full bg-muted rounded-md h-8 relative">
            {/* Base network background */}
            <div className="absolute inset-0 bg-primary/10 rounded-md"></div>
            
            {/* Network segment overlays */}
            {segmentVisualizations.map((segment, index) => {
              const segmentColor = getNetworkSegmentColor(index);
              const borderColor = segmentColor; // Same color for border
              
              return (
                <div
                  key={segment.id}
                  className="absolute h-full rounded-sm border-2 border-opacity-80"
                  style={{
                    left: `${segment.offset}%`,
                    width: `${Math.max(segment.width, 0.5)}%`, // Minimum width for visibility
                    backgroundColor: segmentColor,
                    borderColor: borderColor,
                  }}
                  title={`${segment.name}: ${segment.cidr} (${segment.segmentRange} addresses)`}
                >
                  {/* Show CIDR on larger network segments */}
                  {segment.width > 3 && (
                    <div className="text-xs text-white font-mono px-1 py-0.5 truncate">
                      {segment.cidr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Network Segment Details List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Network Segment Details</h4>
          {segmentVisualizations.map((segment, index) => {
            const segmentColor = getNetworkSegmentColor(index);
            
            return (
              <div key={segment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-sm"
                    style={{
                      backgroundColor: segmentColor
                    }}
                  ></div>
                  
                  {/* Network segment info */}
                  <div>
                    <div className="font-medium text-sm">{segment.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {segment.networkAddress} - {segment.broadcastAddress}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">{segment.cidr}</div>
                  <div className="text-xs text-muted-foreground">
                    {segment.segmentRange.toLocaleString()} addresses
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary/10 rounded"></div>
              <span>Base Network</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted rounded"></div>
              <span>Available Space</span>
            </div>
          </div>
          {segmentVisualizations.length > 0 && (
            <div className="text-xs text-muted-foreground mt-2">
              Each network segment has a unique color for easy identification
            </div>
          )}
        </div>

        {/* Usage Statistics */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Network Segments:</span>
              <div className="font-semibold">{networkSegments.length}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Used Addresses:</span>
              <div className="font-semibold">
                {segmentVisualizations.reduce((total, segment) => total + segment.segmentRange, 0).toLocaleString()} addresses
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Available Addresses:</span>
              <div className="font-semibold">
                {(totalRange - segmentVisualizations.reduce((total, segment) => total + segment.segmentRange, 0)).toLocaleString()} addresses
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Utilization:</span>
              <div className="font-semibold">
                {((segmentVisualizations.reduce((total, segment) => total + segment.segmentRange, 0) / totalRange) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 