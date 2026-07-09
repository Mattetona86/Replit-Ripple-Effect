import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-4 font-mono">404</h1>
      <p className="text-muted-foreground mb-8 text-lg">Page not found</p>
      <Button onClick={() => window.location.href = '/'}>
        Go Home
      </Button>
    </div>
  )
}
