import { Card } from "@/components/ui/card";
import type { CancerDataset } from "@shared/schema";

interface DatasetSelectorProps {
  selectedDataset: CancerDataset;
  onDatasetChange: (dataset: CancerDataset) => void;
}

export function DatasetSelector({ selectedDataset, onDatasetChange }: DatasetSelectorProps) {
  const datasets = [
    {
      id: "breast" as CancerDataset,
      name: "Breast Cancer",
      icon: "fas fa-ribbon",
      models: "XGB+SVM, XGB+LR, XGB+RF"
    },
    {
      id: "gastric" as CancerDataset,
      name: "Gastric Cancer", 
      icon: "fas fa-stomach",
      models: "XGB+SVM, XGB+LR, XGB+RF"
    },
    {
      id: "lung" as CancerDataset,
      name: "Lung Cancer",
      icon: "fas fa-lungs", 
      models: "XGB+SVM, XGB+LR, XGB+RF"
    }
  ];

  return (
    <div className="mb-8">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Select Cancer Dataset</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {datasets.map((dataset) => (
            <button
              key={dataset.id}
              data-testid={`dataset-${dataset.id}`}
              onClick={() => onDatasetChange(dataset.id)}
              className={`relative p-4 border-2 rounded-lg transition-colors ${
                selectedDataset === dataset.id
                  ? "border-primary bg-primary/5 hover:bg-primary/10"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="flex items-center space-x-3">
                <i className={`${dataset.icon} text-xl ${
                  selectedDataset === dataset.id ? "text-primary" : "text-muted-foreground"
                }`}></i>
                <div className="text-left">
                  <h3 className="font-medium text-foreground">{dataset.name}</h3>
                  <p className="text-sm text-muted-foreground">{dataset.models}</p>
                </div>
              </div>
              {selectedDataset === dataset.id && (
                <div className="absolute top-2 right-2">
                  <i className="fas fa-check-circle text-primary"></i>
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
