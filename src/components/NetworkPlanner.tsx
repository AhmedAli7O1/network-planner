import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  calculateNetworkSegment, 
  isValidCidr, 
  findNextAvailableNetworkSegment, 
  networkSegmentsOverlap,
  networkSegmentFitsInBase,
  COMMON_NETWORK_SEGMENT_SIZES 
} from '@/lib/subnet-utils';
import type { NetworkSegmentPlan, BaseNetwork } from '@/lib/subnet-utils';
import { NetworkVisualization } from './NetworkVisualization';
import { PRESET_TEMPLATES } from '@/lib/presets';
import type { PresetTemplate } from '@/lib/presets';
import { X, FolderOpen, Upload } from 'lucide-react';

// Local storage keys
const STORAGE_KEYS = {
  BASE_NETWORK: 'ip-network-planner-base-network',
  NETWORK_SEGMENTS: 'ip-network-planner-network-segments',
} as const;

// Load data from local storage
const loadFromStorage = () => {
  try {
    const baseNetwork = localStorage.getItem(STORAGE_KEYS.BASE_NETWORK) || '10.0.0.0/16';
    const networkSegmentsJson = localStorage.getItem(STORAGE_KEYS.NETWORK_SEGMENTS);
    const networkSegments = networkSegmentsJson ? JSON.parse(networkSegmentsJson) : [];
    return { baseNetwork, networkSegments };
  } catch (error) {
    console.error('Error loading from local storage:', error);
    return { baseNetwork: '10.0.0.0/16', networkSegments: [] };
  }
};

// Save data to local storage
const saveToStorage = (baseNetwork: string, networkSegments: NetworkSegmentPlan[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.BASE_NETWORK, baseNetwork);
    localStorage.setItem(STORAGE_KEYS.NETWORK_SEGMENTS, JSON.stringify(networkSegments));
  } catch (error) {
    console.error('Error saving to local storage:', error);
  }
};

export function NetworkPlanner() {
  const [baseNetwork, setBaseNetwork] = useState<string>('10.0.0.0/16');
  const [baseNetworkInfo, setBaseNetworkInfo] = useState<BaseNetwork | null>(null);
  const [networkSegments, setNetworkSegments] = useState<NetworkSegmentPlan[]>([]);
  const [newNetworkSegmentName, setNewNetworkSegmentName] = useState<string>('');
  const [newNetworkSegmentSize, setNewNetworkSegmentSize] = useState<number>(24);
  const [newNetworkSegmentDescription, setNewNetworkSegmentDescription] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSaved, setShowSaved] = useState<boolean>(false);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [editingNetworkSegment, setEditingNetworkSegment] = useState<string | null>(null);
  const [editNetworkSegmentName, setEditNetworkSegmentName] = useState<string>('');
  const [editNetworkSegmentDescription, setEditNetworkSegmentDescription] = useState<string>('');
  const [editNetworkSegmentSize, setEditNetworkSegmentSize] = useState<number>(24);

  // Load data from local storage on component mount
  useEffect(() => {
    const { baseNetwork: savedBaseNetwork, networkSegments: savedNetworkSegments } = loadFromStorage();
    setBaseNetwork(savedBaseNetwork);
    setNetworkSegments(savedNetworkSegments);
    setIsLoading(false);
  }, []);

  // Save data to local storage whenever baseNetwork or networkSegments change
  useEffect(() => {
    if (!isLoading) {
      saveToStorage(baseNetwork, networkSegments);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }
  }, [baseNetwork, networkSegments, isLoading]);

  // Calculate base network information
  useEffect(() => {
    if (isValidCidr(baseNetwork)) {
      try {
        const [networkAddress, cidr] = baseNetwork.split('/');
        const info = calculateNetworkSegment(networkAddress, cidr);
        const usedHosts = networkSegments.reduce((total, segment) => total + segment.totalHosts, 0);
        
        setBaseNetworkInfo({
          networkAddress: info.networkAddress,
          cidr: baseNetwork,
          subnetMask: info.subnetMask,
          totalHosts: info.totalHosts,
          availableHosts: info.totalHosts - usedHosts,
          usedHosts,
          networkSegments: [...networkSegments]
        });
      } catch (error) {
        console.error('Error calculating base network info:', error);
        setBaseNetworkInfo(null);
      }
    } else {
      setBaseNetworkInfo(null);
    }
  }, [baseNetwork, networkSegments]);

  const addNetworkSegment = () => {
    if (!newNetworkSegmentName.trim()) {
      setErrors(['Please enter a name for the network segment']);
      return;
    }

    const newNetworkSegment = findNextAvailableNetworkSegment(baseNetwork, networkSegments, newNetworkSegmentSize);
    
    if (!newNetworkSegment) {
      setErrors(['No available space for this network segment size']);
      return;
    }

    // Check for overlaps
    const hasOverlap = networkSegments.some(existing => networkSegmentsOverlap(newNetworkSegment, existing));
    if (hasOverlap) {
      setErrors(['This network segment overlaps with an existing one']);
      return;
    }

    const networkSegmentWithDetails: NetworkSegmentPlan = {
      ...newNetworkSegment,
      name: newNetworkSegmentName.trim(),
      description: newNetworkSegmentDescription.trim() || undefined
    };

    setNetworkSegments([...networkSegments, networkSegmentWithDetails]);
    setNewNetworkSegmentName('');
    setNewNetworkSegmentDescription('');
    setErrors([]);
  };

  const removeNetworkSegment = (id: string) => {
    setNetworkSegments(networkSegments.filter(segment => segment.id !== id));
  };

  const startEditNetworkSegment = (networkSegment: NetworkSegmentPlan) => {
    setEditingNetworkSegment(networkSegment.id);
    setEditNetworkSegmentName(networkSegment.name);
    setEditNetworkSegmentDescription(networkSegment.description || '');
    setEditNetworkSegmentSize(networkSegment.size);
  };

  const cancelEditNetworkSegment = () => {
    setEditingNetworkSegment(null);
    setEditNetworkSegmentName('');
    setEditNetworkSegmentDescription('');
    setEditNetworkSegmentSize(24);
  };

  const saveEditNetworkSegment = () => {
    if (!editingNetworkSegment) return;

    const originalSegment = networkSegments.find(segment => segment.id === editingNetworkSegment);
    if (!originalSegment) return;

    // If size changed, we need to recalculate the network segment
    if (editNetworkSegmentSize !== originalSegment.size) {
      const networkSegmentsWithoutOriginal = networkSegments.filter(segment => segment.id !== editingNetworkSegment);
      const newNetworkSegment = findNextAvailableNetworkSegment(baseNetwork, networkSegmentsWithoutOriginal, editNetworkSegmentSize);
      
      if (!newNetworkSegment) {
        setErrors(['No available space for this network segment size']);
        return;
      }

      // Check for overlaps
      const hasOverlap = networkSegmentsWithoutOriginal.some(existing => networkSegmentsOverlap(newNetworkSegment, existing));
      if (hasOverlap) {
        setErrors(['This network segment overlaps with an existing one']);
        return;
      }

      const updatedNetworkSegment: NetworkSegmentPlan = {
        ...newNetworkSegment,
        name: editNetworkSegmentName.trim(),
        description: editNetworkSegmentDescription.trim() || undefined
      };

      setNetworkSegments(networkSegments.map(segment => 
        segment.id === editingNetworkSegment ? updatedNetworkSegment : segment
      ));
    } else {
      // Just update name and description
      setNetworkSegments(networkSegments.map(segment => 
        segment.id === editingNetworkSegment 
          ? { ...segment, name: editNetworkSegmentName.trim(), description: editNetworkSegmentDescription.trim() || undefined }
          : segment
      ));
    }

    cancelEditNetworkSegment();
    setErrors([]);
  };

  const resetConfiguration = () => {
    setBaseNetwork('10.0.0.0/16');
    setNetworkSegments([]);
    setNewNetworkSegmentName('');
    setNewNetworkSegmentDescription('');
    setNewNetworkSegmentSize(24);
    setErrors([]);
    setShowTemplates(false);
    setEditingNetworkSegment(null);
  };

  const loadPreset = (preset: PresetTemplate) => {
    setBaseNetwork(preset.baseNetwork);
    const newNetworkSegments: NetworkSegmentPlan[] = [];
    
    for (const segmentConfig of preset.networkSegments) {
      const newNetworkSegment = findNextAvailableNetworkSegment(preset.baseNetwork, newNetworkSegments, segmentConfig.size);
      if (newNetworkSegment) {
        newNetworkSegments.push({
          ...newNetworkSegment,
          name: segmentConfig.name,
          description: segmentConfig.description
        });
      }
    }
    
    setNetworkSegments(newNetworkSegments);
    setShowTemplates(false);
    setErrors([]);
  };

  const validateNetworkSegments = () => {
    const newErrors: string[] = [];

    // Check for overlaps
    for (let i = 0; i < networkSegments.length; i++) {
      for (let j = i + 1; j < networkSegments.length; j++) {
        if (networkSegmentsOverlap(networkSegments[i], networkSegments[j])) {
          newErrors.push(`Network segments "${networkSegments[i].name}" and "${networkSegments[j].name}" overlap`);
        }
      }
    }

    // Check if all network segments fit within base network
    for (const segment of networkSegments) {
      if (!networkSegmentFitsInBase(segment, baseNetwork)) {
        newErrors.push(`Network segment "${segment.name}" does not fit within the base network`);
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const optimizeLayout = () => {
    console.log('Starting layout optimization...');
    console.log('Original network segments:', networkSegments.map(s => `${s.name}: ${s.cidr} (${s.size})`));
    
    // Sort network segments by size (largest first) to minimize gaps
    // Note: Smaller size number = larger network segment (e.g., /20 is larger than /24)
    const sortedBySize = [...networkSegments].sort((a, b) => a.size - b.size);
    console.log('Sorted by size:', sortedBySize.map(s => `${s.name}: ${s.cidr} (${s.size})`));
    
    const optimizedNetworkSegments: NetworkSegmentPlan[] = [];
    
    for (let i = 0; i < sortedBySize.length; i++) {
      const segment = sortedBySize[i];
      const newNetworkSegment = findNextAvailableNetworkSegment(baseNetwork, optimizedNetworkSegments, segment.size);
      
      if (newNetworkSegment) {
        const optimizedNetworkSegment: NetworkSegmentPlan = {
          ...newNetworkSegment,
          id: segment.id, // Preserve the original ID
          name: segment.name,
          description: segment.description
        };
        optimizedNetworkSegments.push(optimizedNetworkSegment);
        console.log(`Placed ${segment.name} at ${newNetworkSegment.cidr}`);
      } else {
        console.log(`Could not place ${segment.name}`);
      }
    }
    
    console.log('Optimized network segments:', optimizedNetworkSegments.map(s => `${s.name}: ${s.cidr}`));
    setNetworkSegments(optimizedNetworkSegments);
    setErrors([]);
  };

  const importConfiguration = async () => {
    try {
      // Try to use File System Access API for file picker (modern browsers)
      if ('showOpenFilePicker' in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const [fileHandle] = await (window as Window & { showOpenFilePicker: any }).showOpenFilePicker({
            types: [{
              description: 'JSON Configuration File',
              accept: { 'application/json': ['.json'] }
            }],
            multiple: false
          });
          
          const file = await fileHandle.getFile();
          const content = await file.text();
          const config = JSON.parse(content);
          
          // Validate the imported configuration
          if (config.baseNetwork && Array.isArray(config.networkSegments)) {
            setBaseNetwork(config.baseNetwork);
            setNetworkSegments(config.networkSegments);
            setErrors([]);
          } else {
            setErrors(['Invalid configuration file format']);
          }
        } catch {
          // User cancelled or API failed
          return;
        }
      } else {
        // Fallback for older browsers - create a hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        
        input.onchange = (event) => {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const content = e.target?.result as string;
                const config = JSON.parse(content);
                
                // Validate the imported configuration
                if (config.baseNetwork && Array.isArray(config.networkSegments)) {
                  setBaseNetwork(config.baseNetwork);
                  setNetworkSegments(config.networkSegments);
                  setErrors([]);
                } else {
                  setErrors(['Invalid configuration file format']);
                }
                             } catch {
                 setErrors(['Failed to parse configuration file']);
               }
            };
            reader.readAsText(file);
          }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      }
         } catch {
       setErrors(['Failed to import configuration']);
     }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="relative">
      {/* Saved Indicator */}
      {showSaved && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-in slide-in-from-right">
          Configuration saved!
        </div>
      )}

      {/* Templates Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${showTemplates ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Quick Start Templates</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplates(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Templates Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose from common cloud networking patterns to get started quickly
            </p>
            <div className="space-y-4">
              {PRESET_TEMPLATES.map((preset) => (
                <div key={preset.name} className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <h3 className="font-semibold mb-2">{preset.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{preset.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {preset.networkSegments.length} network segments • {preset.baseNetwork}
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => loadPreset(preset)}
                      variant="outline"
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {showTemplates && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setShowTemplates(false)}
        />
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${showTemplates ? 'mr-96' : ''}`}>
        <div className="space-y-6">
          {/* Header with Templates Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">IP Network Planner</h1>
              <p className="text-muted-foreground">Plan your IP address space for networks, VPCs, and network segments</p>
            </div>
            <Button
              onClick={() => setShowTemplates(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Templates
            </Button>
          </div>

          {/* Base Network Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Base Network Configuration</CardTitle>
              <CardDescription>
                Define your base IP network (e.g., 10.0.0.0/16 for VPC or on-premises network)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Base Network (CIDR)</label>
                <Input
                  value={baseNetwork}
                  onChange={(e) => setBaseNetwork(e.target.value)}
                  placeholder="10.0.0.0/16"
                  className="font-mono"
                />
              </div>
              
              {baseNetworkInfo && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Network:</span>
                    <div className="font-mono">{baseNetworkInfo.networkAddress}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subnet Mask:</span>
                    <div className="font-mono">{baseNetworkInfo.subnetMask}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Hosts:</span>
                    <div className="font-mono">{baseNetworkInfo.totalHosts.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Available:</span>
                    <div className="font-mono">{baseNetworkInfo.availableHosts.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add New Network Segment */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Network Segment</CardTitle>
              <CardDescription>
                Plan a new network segment within your base network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Network Segment Name</label>
                  <Input
                    value={newNetworkSegmentName}
                    onChange={(e) => setNewNetworkSegmentName(e.target.value)}
                    placeholder="Public Network Segment AZ-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Network Segment Size</label>
                  <Select value={newNetworkSegmentSize.toString()} onValueChange={(value) => setNewNetworkSegmentSize(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_NETWORK_SEGMENT_SIZES.map((size) => (
                        <SelectItem key={size.size} value={size.size.toString()}>
                          {size.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={addNetworkSegment} className="w-full">
                    Add Network Segment
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <Textarea
                  value={newNetworkSegmentDescription}
                  onChange={(e) => setNewNetworkSegmentDescription(e.target.value)}
                  placeholder="e.g., Public network segment for web servers in Availability Zone 1"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {errors.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-destructive space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm">• {error}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Planned Network Segments */}
          <Card>
            <CardHeader>
              <CardTitle>Planned Network Segments</CardTitle>
              <CardDescription>
                {networkSegments.length} network segment{networkSegments.length !== 1 ? 's' : ''} planned
              </CardDescription>
            </CardHeader>
            <CardContent>
              {networkSegments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No network segments planned yet. Add your first network segment above or use a template.
                </div>
              ) : (
                <div className="space-y-4">
                  {networkSegments.map((segment) => (
                    <div key={segment.id} className="border rounded-lg p-4">
                      {editingNetworkSegment === segment.id ? (
                        // Edit mode
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Network Segment Name</label>
                              <Input
                                value={editNetworkSegmentName}
                                onChange={(e) => setEditNetworkSegmentName(e.target.value)}
                                placeholder="Network Segment Name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">Network Segment Size</label>
                              <Select value={editNetworkSegmentSize.toString()} onValueChange={(value) => setEditNetworkSegmentSize(parseInt(value))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COMMON_NETWORK_SEGMENT_SIZES.map((size) => (
                                    <SelectItem key={size.size} value={size.size.toString()}>
                                      {size.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end gap-2">
                              <Button onClick={saveEditNetworkSegment} size="sm" className="flex-1">
                                Save
                              </Button>
                              <Button onClick={cancelEditNetworkSegment} variant="outline" size="sm">
                                Cancel
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                            <Textarea
                              value={editNetworkSegmentDescription}
                              onChange={(e) => setEditNetworkSegmentDescription(e.target.value)}
                              placeholder="e.g., Public network segment for web servers"
                              rows={2}
                            />
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold">{segment.name}</h3>
                              {segment.description && (
                                <p className="text-sm text-muted-foreground">{segment.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditNetworkSegment(segment)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeNetworkSegment(segment.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">CIDR:</span>
                              <div className="font-mono">{segment.cidr}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Network:</span>
                              <div className="font-mono">{segment.networkAddress}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Broadcast:</span>
                              <div className="font-mono">{segment.broadcastAddress}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Hosts:</span>
                              <div className="font-mono">{segment.totalHosts}</div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Host Range: {segment.firstHost} - {segment.lastHost}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Network Visualization */}
          <NetworkVisualization baseNetwork={baseNetwork} networkSegments={networkSegments} />

                     {/* Validation and Actions */}
           <div className="flex gap-4">
             <Button onClick={validateNetworkSegments} variant="outline">
               Validate Configuration
             </Button>
             <Button 
               onClick={optimizeLayout}
               variant="outline"
               disabled={networkSegments.length === 0}
             >
               Optimize Layout
             </Button>
             <Button 
               onClick={importConfiguration}
               variant="outline"
               className="flex items-center gap-2"
             >
               <Upload className="h-4 w-4" />
               Import Configuration
             </Button>
             <Button 
               onClick={async () => {
                 if (validateNetworkSegments()) {
                   // Export configuration as JSON file
                   const config = {
                     baseNetwork,
                     networkSegments,
                     timestamp: new Date().toISOString()
                   };
                   
                   // Create a more descriptive filename
                   const dateStr = new Date().toISOString().split('T')[0];
                   const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
                   const filename = `ip-network-config-${dateStr}-${timeStr}.json`;
                   
                   const jsonString = JSON.stringify(config, null, 2);
                   const blob = new Blob([jsonString], { type: 'application/json' });
                   
                   // Try to use File System Access API for save dialog (modern browsers)
                   if ('showSaveFilePicker' in window) {
                     try {
                       // eslint-disable-next-line @typescript-eslint/no-explicit-any
                       const handle = await (window as Window & { showSaveFilePicker: any }).showSaveFilePicker({
                         suggestedName: filename,
                         types: [{
                           description: 'JSON Configuration File',
                           accept: { 'application/json': ['.json'] }
                         }]
                       });
                       const writable = await handle.createWritable();
                       await writable.write(jsonString);
                       await writable.close();
                     } catch {
                       // Fallback to traditional download if user cancels or API fails
                       const url = URL.createObjectURL(blob);
                       const link = document.createElement('a');
                       link.href = url;
                       link.download = filename;
                       document.body.appendChild(link);
                       link.click();
                       document.body.removeChild(link);
                       URL.revokeObjectURL(url);
                     }
                   } else {
                     // Fallback for older browsers
                     const url = URL.createObjectURL(blob);
                     const link = document.createElement('a');
                     link.href = url;
                     link.download = filename;
                     document.body.appendChild(link);
                     link.click();
                     document.body.removeChild(link);
                     URL.revokeObjectURL(url);
                   }
                 }
               }}
             >
               Export Configuration
             </Button>
             <Button 
               onClick={resetConfiguration}
               variant="outline"
               className="text-destructive hover:text-destructive"
             >
               Reset All
             </Button>
           </div>
        </div>
      </div>
    </div>
  );
} 