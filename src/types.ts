export interface Resource {
  title: string;
  url?: string;
  youtubeSearchQuery?: string;
  type: 'youtube' | 'article' | 'documentation';
  completed: boolean;
}

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  stage: "FUNDAMENTALS" | "CORE_SKILLS" | "APPLIED_PROJECTS" | "ADVANCED_CONCEPTS" | "CAREER_PREP";
  estimatedHours: number;
  resources: Resource[];
  dependencies: string[];
  completed?: boolean;
}

export interface Roadmap {
  title: string;
  description: string;
  nodes: RoadmapNode[];
}
