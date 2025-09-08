import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { CancerDataset } from "@shared/schema";

interface PredictionPanelProps {
  selectedDataset: CancerDataset;
}

export function PredictionPanel({ selectedDataset }: PredictionPanelProps) {
  const { toast } = useToast();
  const [csvFile, setCsvFile] = useState<File | null>(null);

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

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      csvUploadMutation.mutate(file);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center">
          <i className="fas fa-upload text-primary mr-2"></i>
          CSV Data Upload
        </h2>
        <p className="text-sm text-muted-foreground">Upload CSV file for batch predictions</p>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* CSV Upload Section */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <div className="space-y-4">
              <div className="flex justify-center">
                <i className="fas fa-file-csv text-4xl text-muted-foreground"></i>
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Upload CSV File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a CSV file containing patient features for batch prediction analysis
                </p>
              </div>
              
              <div className="relative inline-block">
                <Button
                  data-testid="button-upload-csv"
                  variant="outline"
                  className="flex items-center"
                  disabled={csvUploadMutation.isPending}
                  size="lg"
                >
                  <i className="fas fa-upload mr-2"></i>
                  {csvUploadMutation.isPending ? "Processing..." : "Choose CSV File"}
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

          {/* Upload Status */}
          {csvFile && (
            <div className="bg-accent/50 border border-border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <i className="fas fa-file text-primary"></i>
                <span className="text-sm font-medium text-foreground">{csvFile.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(csvFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">CSV Format Requirements:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• First row should contain column headers</li>
              <li>• Each row represents one patient sample</li>
              <li>• All feature values should be numeric</li>
              <li>• Missing values will be ignored</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
