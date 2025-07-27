export interface NetworkSegmentInfo {
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  subnetMask: string;
  cidr: string;
}

export interface NetworkSegmentPlan {
  id: string;
  name: string;
  description?: string;
  cidr: string;
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  subnetMask: string;
  size: number; // Number of bits for subnet mask
}

export interface BaseNetwork {
  networkAddress: string;
  cidr: string;
  subnetMask: string;
  totalHosts: number;
  availableHosts: number;
  usedHosts: number;
  networkSegments: NetworkSegmentPlan[];
}

// Convert IP address to number
export function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

// Convert number to IP address
export function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}

// Parse CIDR notation
export function parseCidr(cidr: string): { network: number; mask: number; size: number } {
  const [ip, prefix] = cidr.split('/');
  const network = ipToNumber(ip);
  const size = parseInt(prefix);
  const mask = size === 32 ? 0xFFFFFFFF : (0xFFFFFFFF << (32 - size)) >>> 0;
  return { network: network & mask, mask, size };
}

// Calculate network segment information
export function calculateNetworkSegment(networkAddress: string, cidr: string): NetworkSegmentInfo {
  const { network, mask, size } = parseCidr(`${networkAddress}/${cidr}`);
  const totalHosts = Math.pow(2, 32 - size) - 2;
  const broadcast = network | (~mask >>> 0);
  
  return {
    networkAddress: numberToIp(network),
    broadcastAddress: numberToIp(broadcast),
    firstHost: numberToIp(network + 1),
    lastHost: numberToIp(broadcast - 1),
    totalHosts,
    subnetMask: numberToIp(mask),
    cidr: `${networkAddress}/${cidr}`
  };
}

// Check if two network segments overlap
export function networkSegmentsOverlap(segment1: NetworkSegmentPlan, segment2: NetworkSegmentPlan): boolean {
  const { network: net1 } = parseCidr(segment1.cidr);
  const { network: net2, mask: mask2 } = parseCidr(segment2.cidr);
  
  const segment1Start = net1;
  const segment1End = net1 | (~parseCidr(segment1.cidr).mask >>> 0);
  const segment2Start = net2;
  const segment2End = net2 | (~mask2 >>> 0);
  
  return !(segment1End < segment2Start || segment2End < segment1Start);
}

// Check if a network segment fits within a base network
export function networkSegmentFitsInBase(segment: NetworkSegmentPlan, baseNetwork: string): boolean {
  const { network: baseNet, mask: baseMask } = parseCidr(baseNetwork);
  const { network: segmentNet, mask: segmentMask } = parseCidr(segment.cidr);
  
  // Check if network segment is within base network range
  const baseStart = baseNet;
  const baseEnd = baseNet | (~baseMask >>> 0);
  const segmentStart = segmentNet;
  const segmentEnd = segmentNet | (~segmentMask >>> 0);
  
  return segmentStart >= baseStart && segmentEnd <= baseEnd;
}

// Find next available network segment within base network
export function findNextAvailableNetworkSegment(
  baseNetwork: string,
  existingSegments: NetworkSegmentPlan[],
  requestedSize: number
): NetworkSegmentPlan | null {
  const { network: baseNet, mask: baseMask } = parseCidr(baseNetwork);
  const baseStart = baseNet;
  const baseEnd = baseNet | (~baseMask >>> 0);
  
  // Sort existing network segments by network address
  const sortedSegments = [...existingSegments].sort((a, b) => {
    const { network: netA } = parseCidr(a.cidr);
    const { network: netB } = parseCidr(b.cidr);
    return netA - netB;
  });
  
  let currentAddress = baseStart;
  
  for (const segment of sortedSegments) {
    const { network: segmentNet, mask: segmentMask } = parseCidr(segment.cidr);
    const segmentEnd = segmentNet | (~segmentMask >>> 0);
    
    // Align currentAddress to the requested network segment size boundary
    const segmentMaskForRequestedSize = (0xFFFFFFFF << (32 - requestedSize)) >>> 0;
    const alignedAddress = currentAddress & segmentMaskForRequestedSize;
    if (alignedAddress < currentAddress) {
      currentAddress = alignedAddress + Math.pow(2, 32 - requestedSize);
    } else {
      currentAddress = alignedAddress;
    }
    
    // Check if there's enough space before this network segment
    const requestedSegmentSize = Math.pow(2, 32 - requestedSize);
    const requestedSegmentEnd = currentAddress + requestedSegmentSize - 1;
    
    if (requestedSegmentEnd <= segmentNet) {
      return {
        id: `network-segment-${Date.now()}`,
        name: `Network Segment ${existingSegments.length + 1}`,
        cidr: `${numberToIp(currentAddress)}/${requestedSize}`,
        networkAddress: numberToIp(currentAddress),
        broadcastAddress: numberToIp(requestedSegmentEnd),
        firstHost: numberToIp(currentAddress + 1),
        lastHost: numberToIp(requestedSegmentEnd - 1),
        totalHosts: requestedSegmentSize - 2,
        subnetMask: numberToIp((0xFFFFFFFF << (32 - requestedSize)) >>> 0),
        size: requestedSize
      };
    }
    
    currentAddress = segmentEnd + 1;
  }
  
  // Check if there's space at the end
  // Align currentAddress to the requested network segment size boundary
  const segmentMaskForRequestedSize = (0xFFFFFFFF << (32 - requestedSize)) >>> 0;
  const alignedAddress = currentAddress & segmentMaskForRequestedSize;
  if (alignedAddress < currentAddress) {
    currentAddress = alignedAddress + Math.pow(2, 32 - requestedSize);
  } else {
    currentAddress = alignedAddress;
  }
  
  const requestedSegmentSize = Math.pow(2, 32 - requestedSize);
  const requestedSegmentEnd = currentAddress + requestedSegmentSize - 1;
  
  if (requestedSegmentEnd <= baseEnd) {
    return {
      id: `network-segment-${Date.now()}`,
      name: `Network Segment ${existingSegments.length + 1}`,
      cidr: `${numberToIp(currentAddress)}/${requestedSize}`,
      networkAddress: numberToIp(currentAddress),
      broadcastAddress: numberToIp(requestedSegmentEnd),
      firstHost: numberToIp(currentAddress + 1),
      lastHost: numberToIp(requestedSegmentEnd - 1),
      totalHosts: requestedSegmentSize - 2,
      subnetMask: numberToIp((0xFFFFFFFF << (32 - requestedSize)) >>> 0),
      size: requestedSize
    };
  }
  
  return null;
}

// Validate IP address format
export function isValidIpAddress(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  
  return parts.every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255 && part === num.toString();
  });
}

// Validate CIDR notation
export function isValidCidr(cidr: string): boolean {
  const parts = cidr.split('/');
  if (parts.length !== 2) return false;
  
  const ip = parts[0];
  const prefix = parseInt(parts[1]);
  
  return isValidIpAddress(ip) && prefix >= 0 && prefix <= 32;
}

// Get common network segment sizes for quick selection
export const COMMON_NETWORK_SEGMENT_SIZES = [
  { size: 16, name: '/16 (65,536 hosts)', hosts: 65534 },
  { size: 17, name: '/17 (32,768 hosts)', hosts: 32766 },
  { size: 18, name: '/18 (16,384 hosts)', hosts: 16382 },
  { size: 19, name: '/19 (8,192 hosts)', hosts: 8190 },
  { size: 20, name: '/20 (4,096 hosts)', hosts: 4094 },
  { size: 21, name: '/21 (2,048 hosts)', hosts: 2046 },
  { size: 22, name: '/22 (1,024 hosts)', hosts: 1022 },
  { size: 23, name: '/23 (512 hosts)', hosts: 510 },
  { size: 24, name: '/24 (256 hosts)', hosts: 254 },
  { size: 25, name: '/25 (128 hosts)', hosts: 126 },
  { size: 26, name: '/26 (64 hosts)', hosts: 62 },
  { size: 27, name: '/27 (32 hosts)', hosts: 30 },
  { size: 28, name: '/28 (16 hosts)', hosts: 14 },
  { size: 29, name: '/29 (8 hosts)', hosts: 6 },
  { size: 30, name: '/30 (4 hosts)', hosts: 2 },
]; 