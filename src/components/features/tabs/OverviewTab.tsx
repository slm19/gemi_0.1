import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Brain, CheckCircle2, Sun, Sparkles, ArrowRight, Clock, Play, PenTool, Trophy } from 'lucide-react'

export function OverviewTab() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Progress Overview Card */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Brain className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-center justify-between flex-1">
                <span className="text-sm font-medium">Learning Progress</span>
                <span className="text-sm text-muted-foreground">68%</span>
              </div>
            </div>
            <Progress value={68} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex items-center justify-between flex-1">
                <span className="text-sm font-medium">Reading Materials</span>
                <span className="text-sm text-muted-foreground">45%</span>
              </div>
            </div>
            <Progress value={45} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between flex-1">
                <span className="text-sm font-medium">Quiz Completion</span>
                <span className="text-sm text-muted-foreground">89%</span>
              </div>
            </div>
            <Progress value={89} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Learning Path Card */}
      <Card className="mb-4 md:row-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-yellow-500" />
            Learning Path
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Your personalized learning journey:</p>
            <ol className="space-y-6">
              <LearningPathItem
                title="Introduction to Nuclear Fission"
                description="Learn the basics of nuclear fission and its applications."
                duration="45 mins"
                type="Read"
                completed={true}
                resources={["Article", "Infographic"]}
              />
              <LearningPathItem
                title="Fission Chain Reactions"
                description="Understand how chain reactions work in nuclear fission."
                duration="1 hour"
                type="Video"
                completed={false}
                resources={["Video lecture", "Interactive simulation"]}
              />
              <LearningPathItem
                title="Nuclear Reactor Components"
                description="Explore the key components of a nuclear reactor."
                duration="1.5 hours"
                type="Interactive"
                completed={false}
                resources={["3D model", "Quiz"]}
              />
              <LearningPathItem
                title="Safety Measures in Nuclear Power Plants"
                description="Learn about crucial safety protocols in nuclear facilities."
                duration="1 hour"
                type="Read"
                completed={false}
                resources={["Case study", "Expert interview"]}
              />
              <LearningPathItem
                title="Advanced Concepts Quiz"
                description="Test your understanding of nuclear fission principles."
                duration="30 mins"
                type="Quiz"
                completed={false}
                resources={["Practice questions", "Instant feedback"]}
              />
            </ol>
            <Button className="w-full mt-6">
              Continue Learning
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Card */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Your recent accomplishments:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Completed "Basics of Nuclear Physics" module
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Achieved 100% on "Atomic Structure" quiz
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Earned "Nuclear Novice" badge
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LearningPathItem({ title, description, duration, type, completed, resources }: { 
  title: string; 
  description: string;
  duration: string; 
  type: string; 
  completed: boolean;
  resources: string[];
}) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'Read':
        return <BookOpen className="w-4 h-4" />;
      case 'Video':
        return <Play className="w-4 h-4" />;
      case 'Quiz':
        return <PenTool className="w-4 h-4" />;
      case 'Interactive':
        return <Brain className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <li className="flex items-start gap-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${completed ? 'bg-green-100' : 'bg-gray-100'}`}>
        {completed ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          getIcon(type)
        )}
      </div>
      <div className="flex-1 space-y-1">
        <h3 className={`text-sm font-medium ${completed ? 'text-muted-foreground' : ''}`}>{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {type}
          </Badge>
          <span className="text-xs text-muted-foreground">{duration}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {resources.map((resource, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {resource}
            </Badge>
          ))}
        </div>
      </div>
    </li>
  )
}

