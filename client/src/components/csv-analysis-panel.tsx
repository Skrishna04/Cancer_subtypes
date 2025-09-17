import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { CancerDataset } from "@shared/schema";

interface CsvAnalysisResult {
  filename: string;
  rows: number;
  columns: string[];
  column_count: number;
  has_target: boolean;
  target_column?: string;
  suggested_datasets: string[];
  error?: string;
}

interface CsvAnalysisPanelProps {
  selectedDataset: CancerDataset;
  onDatasetChange: (dataset: CancerDataset) => void;
}

export function CsvAnalysisPanel({ selectedDataset, onDatasetChange }: CsvAnalysisPanelProps) {
  const { toast } = useToast();
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const analysisMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/analyze-csv", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json() as CsvAnalysisResult;
    },
    onSuccess: (data) => {
      toast({
        title: "CSV Analysis Complete",
        description: `Analyzed ${data.filename} with ${data.rows} rows`,
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      analysisMutation.mutate(file);
    }
  };

  const analysisResult = analysisMutation.data;

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center">
          <i className="fas fa-chart-line text-primary mr-2"></i>
          CSV Dataset Analysis
        </h2>
        <p className="text-sm text-muted-foreground">Upload a CSV file to analyze and compare with available datasets</p>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* File Upload */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Button
              variant="outline"
              className="flex items-center w-full"
              disabled={analysisMutation.isPending}
            >
              <i className="fas fa-upload mr-2"></i>
              {analysisMutation.isPending ? "Analyzing..." : "Upload CSV for Analysis"}
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="space-y-4">
            <h3 className="text-md font-medium text-foreground">Analysis Results</h3>
            
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-accent/50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-muted-foreground">File:</span>
                <p className="text-sm text-foreground">{analysisResult.filename}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Rows:</span>
                <p className="text-sm text-foreground">{analysisResult.rows}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Columns:</span>
                <p className="text-sm text-foreground">{analysisResult.column_count}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Target Column:</span>
                <p className="text-sm text-foreground">
                  {analysisResult.has_target ? analysisResult.target_column : "None detected"}
                </p>
              </div>
            </div>

            {/* Suggested Datasets */}
            {analysisResult.suggested_datasets && analysisResult.suggested_datasets.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Compatible Datasets:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.suggested_datasets.map((dataset) => (
                    <Badge
                      key={dataset}
                      variant={selectedDataset === dataset ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => onDatasetChange(dataset as CancerDataset)}
                    >
                      {dataset.charAt(0).toUpperCase() + dataset.slice(1)} Cancer
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Column List */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Columns in CSV:</h4>
              <div className="max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {analysisResult.columns.map((col, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {analysisResult?.error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{analysisResult.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
