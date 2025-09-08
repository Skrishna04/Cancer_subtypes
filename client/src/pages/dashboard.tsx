import { useState } from "react";
import { DatasetSelector } from "@/components/dataset-selector";
import { PredictionPanel } from "@/components/prediction-panel";
import { ModelComparisonPanel } from "@/components/model-comparison-panel";
import { AnalyticsSection } from "@/components/analytics-section";
import type { CancerDataset } from "@shared/schema";

export default function Dashboard() {
  const [selectedDataset, setSelectedDataset] = useState<CancerDataset>("breast");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-microscope text-primary text-2xl"></i>
                <h1 className="text-xl font-bold text-foreground">Cancer Classification Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Connected to ML Models</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dataset Selector */}
        <DatasetSelector 
          selectedDataset={selectedDataset}
          onDatasetChange={setSelectedDataset}
        />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PredictionPanel selectedDataset={selectedDataset} />
          <ModelComparisonPanel selectedDataset={selectedDataset} />
        </div>

        {/* Analytics Section */}
        <AnalyticsSection selectedDataset={selectedDataset} />
      </div>
    </div>
  );
}
