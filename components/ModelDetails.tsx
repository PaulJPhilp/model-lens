'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import type { Model } from '../lib/types';

interface ModelDetailsProps {
  model: Model | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModelDetails({ model, open, onOpenChange }: ModelDetailsProps) {
  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{model.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Provider</h3>
              <p className="text-lg">{model.provider}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Context Window</h3>
              <p className="text-lg">{model.contextWindow.toLocaleString()} tokens</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Input Cost</h3>
              <p className="text-lg">${model.inputCost}/1K tokens</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">Release Date</h3>
              <p className="text-lg">{new Date(model.releaseDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Modalities */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Modalities</h3>
            <div className="flex flex-wrap gap-2">
              {model.modalities.map((modality) => (
                <span
                  key={modality}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {modality}
                </span>
              ))}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {model.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Additional Information</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Model ID:</strong> {model.name.toLowerCase().replace(/\s+/g, '-')}</p>
              <p><strong>Last Updated:</strong> {model.releaseDate}</p>
              <p><strong>Provider:</strong> {model.provider}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
