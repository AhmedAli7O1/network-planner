# IP Network Planner Tool

A modern web application for planning and visualizing network subnets, built with React, TypeScript, Vite, and shadcn/ui.

## Features

- **Base Network Configuration**: Define your VPC base network (e.g., 10.0.0.0/16)
- **Subnet Planning**: Plan multiple subnets within your base network without conflicts
- **Conflict Detection**: Automatic validation to prevent overlapping subnets
- **Visual Network Layout**: Visual representation of subnet allocation within the base network
- **Quick Start Templates**: Pre-configured templates for common cloud scenarios (AWS, GCP, multi-environment)
- **Real-time Validation**: Instant feedback on subnet configuration validity
- **Export Configuration**: Export your subnet plan for use in cloud infrastructure
- **Modern UI**: Clean, responsive interface built with shadcn/ui components
- **TypeScript**: Full type safety and better development experience

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible UI components
- **PostCSS** - CSS processing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd subnet-planning
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Usage

1. **Choose a Template**: Start with one of the pre-configured templates for common cloud scenarios
2. **Configure Base Network**: Set your VPC base network (e.g., 10.0.0.0/16)
3. **Add Subnets**: Plan individual subnets with custom names and descriptions
4. **Validate**: Check for conflicts and ensure all subnets fit within the base network
5. **Visualize**: See a visual representation of your subnet layout
6. **Export**: Export your configuration for use in cloud infrastructure

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
subnet-planning/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── SubnetPlanner.tsx      # Main subnet planning component
│   │   └── NetworkVisualization.tsx # Network layout visualization
│   ├── lib/
│   │   ├── utils.ts               # shadcn/ui utility functions
│   │   ├── subnet-utils.ts        # Subnet calculation utilities
│   │   └── presets.ts             # Pre-configured templates
│   ├── App.tsx                    # Main application component
│   ├── index.css                  # Global styles with Tailwind
│   └── main.tsx                   # Application entry point
├── public/                        # Static assets
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.js              # PostCSS configuration
├── vite.config.ts                 # Vite configuration
└── tsconfig.json                  # TypeScript configuration
```

## Development

### Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
npx shadcn@latest add <component-name>
```

### Styling

This project uses Tailwind CSS for styling. The design system is configured with CSS custom properties for consistent theming.

### TypeScript

The project is fully configured with TypeScript. All components and utilities are properly typed for better development experience.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
