import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  calculateSubnet, 
  isValidCidr, 
  findNextAvailableSubnet, 
  subnetsOverlap,
  subnetFitsInBase,
  parseCidr,
  COMMON_SUBNET_SIZES 
} from '@/lib/subnet-utils';
import type { SubnetPlan, BaseNetwork } from '@/lib/subnet-utils';
import { NetworkVisualization } from './NetworkVisualization';
import { PRESET_TEMPLATES } from '@/lib/presets';
import type { PresetTemplate } from '@/lib/presets';
import { X, FolderOpen } from 'lucide-react';

// Local storage keys
const STORAGE_KEYS = {
  BASE_NETWORK: 'ip-network-planner-base-network',
  SUBNETS: 'ip-network-planner-subnets',
} as const;

// Load data from local storage
const loadFromStorage = () => {
  try {
    const baseNetwork = localStorage.getItem(STORAGE_KEYS.BASE_NETWORK) || '10.0.0.0/16';
    const subnetsJson = localStorage.getItem(STORAGE_KEYS.SUBNETS);
    const subnets = subnetsJson ? JSON.parse(subnetsJson) : [];
    return { baseNetwork, subnets };
  } catch (error) {
    console.error('Error loading from local storage:', error);
    return { baseNetwork: '10.0.0.0/16', subnets: [] };
  }
};

// Save data to local storage
const saveToStorage = (baseNetwork: string, subnets: SubnetPlan[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.BASE_NETWORK, baseNetwork);
    localStorage.setItem(STORAGE_KEYS.SUBNETS, JSON.stringify(subnets));
  } catch (error) {
    console.error('Error saving to local storage:', error);
  }
};

export function SubnetPlanner() {
  const [baseNetwork, setBaseNetwork] = useState<string>('10.0.0.0/16');
  const [baseNetworkInfo, setBaseNetworkInfo] = useState<BaseNetwork | null>(null);
  const [subnets, setSubnets] = useState<SubnetPlan[]>([]);
  const [newSubnetName, setNewSubnetName] = useState<string>('');
  const [newSubnetSize, setNewSubnetSize] = useState<number>(24);
  const [newSubnetDescription, setNewSubnetDescription] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSaved, setShowSaved] = useState<boolean>(false);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [editingSubnet, setEditingSubnet] = useState<string | null>(null);
  const [editSubnetName, setEditSubnetName] = useState<string>('');
  const [editSubnetDescription, setEditSubnetDescription] = useState<string>('');
  const [editSubnetSize, setEditSubnetSize] = useState<number>(24);

  // Load data from local storage on component mount
  useEffect(() => {
    const { baseNetwork: savedBaseNetwork, subnets: savedSubnets } = loadFromStorage();
    setBaseNetwork(savedBaseNetwork);
    setSubnets(savedSubnets);
    setIsLoading(false);
  }, []);

  // Save data to local storage whenever baseNetwork or subnets change
  useEffect(() => {
    if (!isLoading) {
      saveToStorage(baseNetwork, subnets);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }
  }, [baseNetwork, subnets, isLoading]);

  // Calculate base network information
  useEffect(() => {
    if (isValidCidr(baseNetwork)) {
      try {
        const [networkAddress, cidr] = baseNetwork.split('/');
        const info = calculateSubnet(networkAddress, cidr);
        const usedHosts = subnets.reduce((total, subnet) => total + subnet.totalHosts, 0);
        
        setBaseNetworkInfo({
          networkAddress: info.networkAddress,
          cidr: baseNetwork,
          subnetMask: info.subnetMask,
          totalHosts: info.totalHosts,
          availableHosts: info.totalHosts - usedHosts,
          usedHosts,
          subnets: [...subnets]
        });
        setErrors([]);
      } catch {
        setErrors(['Invalid base network configuration']);
      }
    } else {
      setErrors(['Please enter a valid CIDR notation (e.g., 10.0.0.0/16)']);
    }
  }, [baseNetwork, subnets]);

  // Add new subnet
  const addSubnet = () => {
    if (!baseNetworkInfo) return;

    const newSubnet = findNextAvailableSubnet(baseNetwork, subnets, newSubnetSize);
    
    if (!newSubnet) {
      setErrors(['No space available for this subnet size']);
      return;
    }

    // Check for overlaps
    const hasOverlap = subnets.some(existing => subnetsOverlap(newSubnet, existing));
    if (hasOverlap) {
      setErrors(['This subnet would overlap with existing subnets']);
      return;
    }

         const subnetWithDetails: SubnetPlan = {
       ...newSubnet,
       name: newSubnetName || `Network Segment ${subnets.length + 1}`,
       description: newSubnetDescription
     };

    setSubnets([...subnets, subnetWithDetails]);
    setNewSubnetName('');
    setNewSubnetDescription('');
    setErrors([]);
  };

  // Remove subnet
  const removeSubnet = (id: string) => {
    setSubnets(subnets.filter(subnet => subnet.id !== id));
  };

  // Start editing subnet
  const startEditSubnet = (subnet: SubnetPlan) => {
    setEditingSubnet(subnet.id);
    setEditSubnetName(subnet.name);
    setEditSubnetDescription(subnet.description || '');
    setEditSubnetSize(subnet.size);
  };

  // Cancel editing subnet
  const cancelEditSubnet = () => {
    setEditingSubnet(null);
    setEditSubnetName('');
    setEditSubnetDescription('');
    setEditSubnetSize(24);
  };

  // Save edited subnet
  const saveEditSubnet = () => {
    if (!editingSubnet) return;

    const subnetIndex = subnets.findIndex(subnet => subnet.id === editingSubnet);
    if (subnetIndex === -1) return;

    const originalSubnet = subnets[subnetIndex];
    
    // If size changed, we need to recalculate the subnet
    if (editSubnetSize !== originalSubnet.size) {
      // Remove the original subnet temporarily
      const subnetsWithoutOriginal = subnets.filter(subnet => subnet.id !== editingSubnet);
      
      // Try to find a new subnet with the new size
      const newSubnet = findNextAvailableSubnet(baseNetwork, subnetsWithoutOriginal, editSubnetSize);
      
      if (!newSubnet) {
        setErrors(['No space available for this subnet size']);
        return;
      }

      // Check for overlaps
      const hasOverlap = subnetsWithoutOriginal.some(existing => subnetsOverlap(newSubnet, existing));
      if (hasOverlap) {
        setErrors(['This subnet would overlap with existing subnets']);
        return;
      }

             // Update the subnet with new details
       const updatedSubnet: SubnetPlan = {
         ...newSubnet,
         name: editSubnetName || `Network Segment ${subnetIndex + 1}`,
         description: editSubnetDescription
       };

      setSubnets([...subnetsWithoutOriginal, updatedSubnet]);
    } else {
             // Just update name and description
       const updatedSubnets = [...subnets];
       updatedSubnets[subnetIndex] = {
         ...originalSubnet,
         name: editSubnetName || `Network Segment ${subnetIndex + 1}`,
         description: editSubnetDescription
       };
      setSubnets(updatedSubnets);
    }

    // Clear editing state
    cancelEditSubnet();
    setErrors([]);
  };

  // Reset all configuration
  const resetConfiguration = () => {
    if (confirm('Are you sure you want to reset all configuration? This will clear all subnets and reset the base network.')) {
      setBaseNetwork('10.0.0.0/16');
      setSubnets([]);
      setNewSubnetName('');
      setNewSubnetDescription('');
      setErrors([]);
      
      // Clear local storage
      localStorage.removeItem(STORAGE_KEYS.BASE_NETWORK);
      localStorage.removeItem(STORAGE_KEYS.SUBNETS);
    }
  };

  // Load preset template
  const loadPreset = (preset: PresetTemplate) => {
    setBaseNetwork(preset.baseNetwork);
    
    const newSubnets: SubnetPlan[] = [];
    preset.subnets.forEach((subnetConfig) => {
      const newSubnet = findNextAvailableSubnet(preset.baseNetwork, newSubnets, subnetConfig.size);
      if (newSubnet) {
        newSubnets.push({
          ...newSubnet,
          name: subnetConfig.name,
          description: subnetConfig.description
        });
      }
    });
    
    setSubnets(newSubnets);
    setShowTemplates(false);
    setErrors([]);
  };

  // Validate all subnets
  const validateSubnets = () => {
    const newErrors: string[] = [];
    
    // Check for overlaps
    for (let i = 0; i < subnets.length; i++) {
      for (let j = i + 1; j < subnets.length; j++) {
        if (subnetsOverlap(subnets[i], subnets[j])) {
          newErrors.push(`Subnets "${subnets[i].name}" and "${subnets[j].name}" overlap`);
        }
      }
    }

    // Check if subnets fit in base network
    subnets.forEach(subnet => {
      if (!subnetFitsInBase(subnet, baseNetwork)) {
        newErrors.push(`Subnet "${subnet.name}" does not fit within the base network`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Optimize subnet layout for maximum efficiency
  const optimizeLayout = () => {
    if (subnets.length === 0) return;

    console.log('Starting optimization...');
    console.log('Original subnets:', subnets.map(s => `${s.name}: ${s.cidr} (${s.size})`));

    // Sort subnets by size (largest first) to minimize gaps
    // Note: Smaller size number = larger subnet (e.g., /20 is larger than /24)
    const sortedBySize = [...subnets].sort((a, b) => a.size - b.size);
    console.log('Sorted by size:', sortedBySize.map(s => `${s.name}: ${s.cidr} (${s.size})`));
    
    const optimizedSubnets: SubnetPlan[] = [];
    
    for (let i = 0; i < sortedBySize.length; i++) {
      const subnet = sortedBySize[i];
      console.log(`Processing ${subnet.name} (${subnet.cidr})...`);
      
      // Find the next available space for this subnet
      const newSubnet = findNextAvailableSubnet(baseNetwork, optimizedSubnets, subnet.size);
      
      if (newSubnet) {
        console.log(`  Placed at: ${newSubnet.cidr}`);
        // Create optimized subnet with original name and description, but new unique ID
        const optimizedSubnet: SubnetPlan = {
          ...newSubnet,
          id: `subnet-${Date.now()}-${i}`, // Ensure unique ID
          name: subnet.name,
          description: subnet.description
        };
        
        optimizedSubnets.push(optimizedSubnet);
      } else {
        console.log(`  Could not place, keeping original position`);
        // If we can't place the subnet, keep it in its original position
        optimizedSubnets.push(subnet);
      }
    }
    
    // Sort optimized subnets by network address for display
    const finalSubnets = optimizedSubnets.sort((a, b) => {
      const { network: netA } = parseCidr(a.cidr);
      const { network: netB } = parseCidr(b.cidr);
      return netA - netB;
    });
    
    console.log('Final optimized subnets:', finalSubnets.map(s => `${s.name}: ${s.cidr}`));
    
    setSubnets(finalSubnets);
    setErrors([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your saved configuration...</p>
        </div>
      </div>
    );
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
                      {preset.subnets.length} subnets • {preset.baseNetwork}
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
               <p className="text-muted-foreground">Plan your IP address space for networks, VPCs, and subnets</p>
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

          {/* Add New Subnet */}
          <Card>
                         <CardHeader>
               <CardTitle>Add New Network Segment</CardTitle>
               <CardDescription>
                 Plan a new network segment (subnet) within your base network
               </CardDescription>
             </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div>
                   <label className="block text-sm font-medium mb-2">Network Segment Name</label>
                   <Input
                     value={newSubnetName}
                     onChange={(e) => setNewSubnetName(e.target.value)}
                     placeholder="Public Network AZ-1"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-2">Network Segment Size</label>
                  <Select value={newSubnetSize.toString()} onValueChange={(value) => setNewSubnetSize(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SUBNET_SIZES.map((size) => (
                        <SelectItem key={size.size} value={size.size.toString()}>
                          {size.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                                 <div className="flex items-end">
                   <Button onClick={addSubnet} className="w-full">
                     Add Network Segment
                   </Button>
                 </div>
              </div>
                             <div>
                 <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                 <Textarea
                   value={newSubnetDescription}
                   onChange={(e) => setNewSubnetDescription(e.target.value)}
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

          {/* Subnet List */}
                     <Card>
             <CardHeader>
               <CardTitle>Planned Network Segments</CardTitle>
               <CardDescription>
                 {subnets.length} network segment{subnets.length !== 1 ? 's' : ''} planned
               </CardDescription>
             </CardHeader>
            <CardContent>
                             {subnets.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground">
                   No network segments planned yet. Add your first network segment above or use a template.
                 </div>
              ) : (
                <div className="space-y-4">
                  {subnets.map((subnet) => (
                    <div key={subnet.id} className="border rounded-lg p-4">
                      {editingSubnet === subnet.id ? (
                        // Edit mode
                        <div className="space-y-4">
                                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                               <label className="block text-sm font-medium mb-2">Network Segment Name</label>
                               <Input
                                 value={editSubnetName}
                                 onChange={(e) => setEditSubnetName(e.target.value)}
                                 placeholder="Network Segment Name"
                               />
                             </div>
                             <div>
                               <label className="block text-sm font-medium mb-2">Network Segment Size</label>
                              <Select value={editSubnetSize.toString()} onValueChange={(value) => setEditSubnetSize(parseInt(value))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COMMON_SUBNET_SIZES.map((size) => (
                                    <SelectItem key={size.size} value={size.size.toString()}>
                                      {size.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end gap-2">
                              <Button onClick={saveEditSubnet} size="sm" className="flex-1">
                                Save
                              </Button>
                              <Button onClick={cancelEditSubnet} variant="outline" size="sm">
                                Cancel
                              </Button>
                            </div>
                          </div>
                                                     <div>
                             <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                             <Textarea
                               value={editSubnetDescription}
                               onChange={(e) => setEditSubnetDescription(e.target.value)}
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
                              <h3 className="font-semibold">{subnet.name}</h3>
                              {subnet.description && (
                                <p className="text-sm text-muted-foreground">{subnet.description}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditSubnet(subnet)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeSubnet(subnet.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">CIDR:</span>
                              <div className="font-mono">{subnet.cidr}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Network:</span>
                              <div className="font-mono">{subnet.networkAddress}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Broadcast:</span>
                              <div className="font-mono">{subnet.broadcastAddress}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Hosts:</span>
                              <div className="font-mono">{subnet.totalHosts}</div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Host Range: {subnet.firstHost} - {subnet.lastHost}
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
          <NetworkVisualization baseNetwork={baseNetwork} subnets={subnets} />

          {/* Validation and Actions */}
          <div className="flex gap-4">
            <Button onClick={validateSubnets} variant="outline">
              Validate Configuration
            </Button>
            <Button 
              onClick={optimizeLayout}
              variant="outline"
              disabled={subnets.length === 0}
            >
              Optimize Layout
            </Button>
            <Button 
              onClick={() => {
                if (validateSubnets()) {
                  // Export or save configuration
                  const config = {
                    baseNetwork,
                    subnets,
                    timestamp: new Date().toISOString()
                  };
                  console.log('Valid configuration:', config);
                  alert('Configuration is valid! Check console for export.');
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