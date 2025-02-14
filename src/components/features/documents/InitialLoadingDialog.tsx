import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from 'lucide-react';

interface InitialLoadingDialogProps {
  isLoading: boolean;
  loadingText?: string;  // Allow a customizable loading message
  progress?: number;       // Optional progress value (0-100)
}

export function InitialLoadingDialog({ isLoading, loadingText = "Loading...", progress }: InitialLoadingDialogProps) {
  return (
    <Dialog open={isLoading}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">{loadingText}</DialogTitle>
          <DialogDescription className="text-center">
            Please wait while we fetch your data...
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4">
          {progress !== undefined ? (
            <Progress value={progress} className="w-full max-w-xs" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 