import { PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  youtubeId: string;
}

interface VideoTutorialCardProps {
  video: VideoTutorial;
  onClick: (video: VideoTutorial) => void;
}

export function VideoTutorialCard({ video, onClick }: VideoTutorialCardProps) {
  const thumbnailUrl = `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;

  return (
    <Card 
      className="overflow-hidden rounded-xl border-none bg-background shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onClick(video)}
    >
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={thumbnailUrl} 
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // Fallback to hqdefault if maxresdefault is not available
            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
        </div>
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground border-muted-foreground/20">
            {video.category}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-bold">
            {video.duration}
          </Badge>
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm line-clamp-1">{video.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {video.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
