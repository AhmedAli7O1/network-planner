import { NetworkPlanner } from "@/components/NetworkPlanner"

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">IP Network Planner</h1>
          <p className="text-xl text-muted-foreground">
            Plan and visualize your IP address space for networks, VPCs, and network segments without conflicts
          </p>
        </div>
        <NetworkPlanner />
      </div>
    </div>
  )
}

export default App
