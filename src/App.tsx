import { SubnetPlanner } from "@/components/SubnetPlanner"

function App() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            IP Network Planner
          </h1>
          <p className="text-muted-foreground">
            Plan and visualize your network subnets for AWS/GCP VPCs without conflicts
          </p>
        </header>

        <main>
          <SubnetPlanner />
        </main>
      </div>
    </div>
  )
}

export default App
