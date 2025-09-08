import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CancerDataset, PredictionResponse, PredictionInput } from "@shared/schema";

interface PredictionPanelProps {
  selectedDataset: CancerDataset;
}

export function PredictionPanel({ selectedDataset }: PredictionPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [features, setFeatures] = useState<Record<string, number>>({
    mean_radius: 14.127,
    mean_texture: 19.289,
    mean_perimeter: 91.969,
    mean_area: 654.889,
    mean_smoothness: 0.096,
    mean_compactness: 0.104,
    mean_concavity: 0.089,
    mean_concave_points: 0.048,
  });

  const [csvFile, setCsvFile] = useState<File | null>(null);

  const predictionMutation = useMutation({
    mutationFn: async (input: PredictionInput) => {
      const response = await apiRequest("POST", "/api/predict", input);
      return response.json() as Promise<PredictionResponse>;
    },
    onSuccess: () => {
      toast({
        title: "Prediction Complete",
        description: "Successfully generated predictions from all models",
      });
    },
    onError: (error) => {
      toast({
        title: "Prediction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const csvUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dataset", selectedDataset);
      
      const response = await fetch("/api/predict/batch", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "CSV Processing Complete",
        description: "Successfully processed batch predictions",
      });
      setCsvFile(null);
    },
    onError: (error) => {
      toast({
        title: "CSV Upload Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFeatureChange = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setFeatures(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const handlePredict = () => {
    predictionMutation.mutate({
      dataset: selectedDataset,
      features
    });
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      csvUploadMutation.mutate(file);
    }
  };

  const prediction = predictionMutation.data;

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center">
          <i className="fas fa-calculator text-primary mr-2"></i>
          Model Predictions
        </h2>
        <p className="text-sm text-muted-foreground">Enter patient features to get predictions from all models</p>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Feature Input Form */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(features).map(([key, value]) => (
              <div key={key}>
                <Label className="block text-sm font-medium text-foreground mb-2">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                <Input
                  type="number"
                  data-testid={`input-${key}`}
                  value={value}
                  onChange={(e) => handleFeatureChange(key, e.target.value)}
                  step="0.001"
                  className="w-full"
                />
              </div>
            ))}
          </div>
          
          <div className="flex space-x-4">
            <Button
              data-testid="button-predict"
              onClick={handlePredict}
              disabled={predictionMutation.isPending}
              className="flex-1"
            >
              <i className="fas fa-brain mr-2"></i>
              {predictionMutation.isPending ? "Predicting..." : "Predict with All Models"}
            </Button>
            
            <div className="relative">
              <Button
                data-testid="button-upload-csv"
                variant="outline"
                className="flex items-center"
                disabled={csvUploadMutation.isPending}
              >
                <i className="fas fa-upload mr-2"></i>
                {csvUploadMutation.isPending ? "Processing..." : "Upload CSV"}
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                data-testid="input-csv"
              />
            </div>
          </div>
        </div>

        {/* Prediction Results */}
        {prediction && (
          <div className="space-y-4">
            <h3 className="text-md font-medium text-foreground">Prediction Results</h3>
            
            {prediction.predictions.map((pred) => (
              <div key={pred.model} className="border border-border rounded-lg p-4 bg-accent/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-foreground">
                    {pred.model.replace('_', ' + ').toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Confidence: {(pred.probability * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    pred.prediction === 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    pred.prediction === 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {pred.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    (Probability: {pred.probability.toFixed(3)})
                  </span>
                </div>
              </div>
            ))}

            {/* Consensus */}
            <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
              <div className="flex items-center space-x-2 mb-2">
                <i className="fas fa-check-circle text-primary"></i>
                <span className="font-semibold text-primary">Model Consensus</span>
              </div>
              <p className="text-sm text-foreground">
                Models predict <strong>{prediction.consensus.prediction === 0 ? "Benign" : "Malignant"}</strong> with{" "}
                {prediction.consensus.agreement ? "unanimous" : "majority"} agreement{" "}
                (avg confidence: {(prediction.consensus.confidence * 100).toFixed(1)}%)
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
