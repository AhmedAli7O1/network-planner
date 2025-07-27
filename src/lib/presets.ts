export interface PresetTemplate {
  name: string;
  description: string;
  baseNetwork: string;
  networkSegments: Array<{
    name: string;
    description: string;
    size: number;
  }>;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: "AWS VPC - Basic",
    description: "Basic AWS VPC with public and private network segments across 2 AZs",
    baseNetwork: "10.0.0.0/16",
    networkSegments: [
      {
        name: "Public Network Segment AZ-1",
        description: "Public network segment for internet-facing resources in Availability Zone 1",
        size: 24
      },
      {
        name: "Public Network Segment AZ-2", 
        description: "Public network segment for internet-facing resources in Availability Zone 2",
        size: 24
      },
      {
        name: "Private Network Segment AZ-1",
        description: "Private network segment for application servers in Availability Zone 1",
        size: 24
      },
      {
        name: "Private Network Segment AZ-2",
        description: "Private network segment for application servers in Availability Zone 2", 
        size: 24
      },
      {
        name: "Database Network Segment AZ-1",
        description: "Private network segment for databases in Availability Zone 1",
        size: 25
      },
      {
        name: "Database Network Segment AZ-2",
        description: "Private network segment for databases in Availability Zone 2",
        size: 25
      }
    ]
  },
  {
    name: "GCP VPC - Standard",
    description: "Standard GCP VPC with network segments for different environments",
    baseNetwork: "10.0.0.0/16",
    networkSegments: [
      {
        name: "Default Network Segment",
        description: "Default network segment for general compute resources",
        size: 24
      },
      {
        name: "Web Tier",
        description: "Network segment for web servers and load balancers",
        size: 25
      },
      {
        name: "App Tier",
        description: "Network segment for application servers",
        size: 25
      },
      {
        name: "Database Tier",
        description: "Network segment for database instances",
        size: 26
      },
      {
        name: "Management",
        description: "Network segment for management and monitoring tools",
        size: 27
      }
    ]
  },
  {
    name: "Multi-Environment",
    description: "VPC with network segments for development, staging, and production",
    baseNetwork: "10.0.0.0/16",
    networkSegments: [
      {
        name: "Dev Public",
        description: "Development public network segment",
        size: 25
      },
      {
        name: "Dev Private",
        description: "Development private network segment",
        size: 25
      },
      {
        name: "Staging Public",
        description: "Staging public network segment",
        size: 25
      },
      {
        name: "Staging Private",
        description: "Staging private network segment",
        size: 25
      },
      {
        name: "Prod Public",
        description: "Production public network segment",
        size: 24
      },
      {
        name: "Prod Private",
        description: "Production private network segment",
        size: 24
      },
      {
        name: "Prod Database",
        description: "Production database network segment",
        size: 25
      }
    ]
  },
  {
    name: "Microservices",
    description: "VPC optimized for microservices architecture with dedicated network segments",
    baseNetwork: "10.0.0.0/16",
    networkSegments: [
      {
        name: "API Gateway",
        description: "Network segment for API gateway and load balancers",
        size: 26
      },
      {
        name: "Frontend Services",
        description: "Network segment for frontend microservices",
        size: 25
      },
      {
        name: "Backend Services",
        description: "Network segment for backend microservices",
        size: 25
      },
      {
        name: "Data Services",
        description: "Network segment for data processing services",
        size: 25
      },
      {
        name: "Monitoring",
        description: "Network segment for monitoring and logging services",
        size: 27
      },
      {
        name: "Shared Services",
        description: "Network segment for shared infrastructure services",
        size: 26
      }
    ]
  }
]; 