# IP Network Planner

A modern web application for planning and visualizing IP address space, built with React, TypeScript, Vite, and shadcn/ui.

## Features

- **IP Network Planning**: Plan multiple network segments within your base network without conflicts
- **Conflict Detection**: Automatic validation to prevent overlapping network segments
- **Visual Network Layout**: Visual representation of network segment allocation within the base network
- **Template System**: Quick-start templates for common cloud networking patterns
- **Real-time Validation**: Instant feedback on network configuration validity
- **Export Configuration**: Export your network plan for use in cloud infrastructure

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Data Persistence**: Local Storage

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ip-network-planner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## Usage

1. **Define Base Network**: Set your base IP network (e.g., 10.0.0.0/16)
2. **Add Network Segments**: Plan individual network segments with custom names and descriptions
3. **Validate**: Check for conflicts and ensure all network segments fit within the base network
4. **Visualize**: See a visual representation of your network layout
5. **Export**: Use your validated configuration in your cloud infrastructure

## Project Structure

```
ip-network-planner/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
 │   │   ├── NetworkPlanner.tsx      # Main IP network planning component
│   │   └── NetworkVisualization.tsx # Network visualization component
│   ├── lib/
 │   │   ├── subnet-utils.ts        # IP network calculation utilities
│   │   └── presets.ts             # Template configurations
│   ├── App.tsx                    # Main application component
│   └── main.tsx                   # Application entry point
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Key Components

- **NetworkPlanner**: Main component handling IP network planning logic
- **NetworkVisualization**: Visual representation of network layout
- **subnet-utils**: Core IP networking calculations and utilities
- **presets**: Predefined network templates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
