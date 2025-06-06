import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to{" "}
          <span className="text-blue-600">MakeQuestions</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Generate high-quality questions using AI-powered tools. Perfect for educators, 
          trainers, and content creators who need engaging questions quickly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🤖 AI-Powered
            </CardTitle>
            <CardDescription>
              Generate questions using advanced AI models including OpenAI and Perplexity.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎨 Modern UI
            </CardTitle>
            <CardDescription>
              Built with shadcn/ui components and styled with Tailwind CSS for a beautiful experience.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔐 Secure
            </CardTitle>
            <CardDescription>
              User authentication with Clerk and secure payment processing with Stripe.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Try Question Generation</CardTitle>
          <CardDescription>
            Enter your content below and we&apos;ll help you generate relevant questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="topic">Topic or Content</Label>
            <Input
              id="topic"
              placeholder="Enter a topic or paste your content here..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Additional Context (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context or specific requirements..."
              className="mt-1"
              rows={3}
            />
          </div>
          <Button className="w-full" size="lg">
            Generate Questions
          </Button>
        </CardContent>
      </Card>

      <div className="text-center mt-12 text-sm text-muted-foreground">
        <p>Ready to get started? Create an account or sign in to begin generating questions.</p>
        <div className="flex justify-center gap-4 mt-4">
          <Button variant="outline">Sign In</Button>
          <Button>Get Started</Button>
        </div>
      </div>
    </main>
  )
}
