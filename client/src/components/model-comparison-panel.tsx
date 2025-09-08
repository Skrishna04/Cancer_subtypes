import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import type { CancerDataset, MetricsResponse } from "@shared/schema";

interface ModelComparisonPanelProps {
  selectedDataset: CancerDataset;
}

export function ModelComparisonPanel({ selectedDataset }: ModelComparisonPanelProps) {
  const [activeTab, setActiveTab] = useState<CancerDataset>(selectedDataset);

  const { data: metricsData, isLoading } = useQuery<MetricsResponse>({
    queryKey: ["/api/metrics"],
  });

  const getDatasetMetrics = (dataset: CancerDataset) => {
    if (!metricsData) return [];
    return metricsData.metrics.filter(m => m.dataset === dataset);
  };

  const formatChartData = (dataset: CancerDataset) => {
    const metrics = getDatasetMetrics(dataset);
    return metrics.map(m => ({
      model: m.model.replace('_', '+').toUpperCase(),
      Accuracy: m.accuracy,
      Precision: m.precision,
      AUC: m.auc,
      Kappa: m.kappa,
    }));
  };

  const generateROCData = (dataset: CancerDataset) => {
    const fprValues = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const metrics = getDatasetMetrics(dataset);
    
    return fprValues.map(fpr => {
      const point: any = { fpr };
      
      metrics.forEach(m => {
        const auc = m.auc;
        // Approximate TPR from AUC for visualization
        const tpr = Math.min(1, fpr + (auc - 0.5) * 2 * (1 - fpr));
        point[m.model.replace('_', '+').toUpperCase()] = Math.max(0, tpr);
      });
      
      return point;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center">
          <i className="fas fa-chart-bar text-primary mr-2"></i>
          Model Performance Comparison
        </h2>
        <p className="text-sm text-muted-foreground">Compare metrics across all models and datasets</p>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CancerDataset)}>
        <div className="border-b border-border">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="breast" data-testid="tab-breast">Breast Cancer</TabsTrigger>
            <TabsTrigger value="gastric" data-testid="tab-gastric">Gastric Cancer</TabsTrigger>
            <TabsTrigger value="lung" data-testid="tab-lung">Lung Cancer</TabsTrigger>
          </TabsList>
        </div>

        {(["breast", "gastric", "lung"] as CancerDataset[]).map(dataset => (
          <TabsContent key={dataset} value={dataset} className="p-6">
            {/* Metrics Table */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-foreground mb-4">Performance Metrics</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Accuracy
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Precision
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        AUC
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Kappa
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-border">
                    {getDatasetMetrics(dataset).map((metric) => (
                      <tr key={metric.model} data-testid={`metric-row-${metric.model}`}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {metric.model.replace('_', ' + ').toUpperCase()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {metric.accuracy.toFixed(3)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {metric.precision.toFixed(3)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {metric.auc.toFixed(3)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {metric.kappa.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-foreground mb-4">Model Performance Comparison</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formatChartData(dataset)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="model" />
                    <YAxis domain={[0.8, 1]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Accuracy" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="AUC" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="Precision" fill="hsl(var(--chart-3))" />
                    <Bar dataKey="Kappa" fill="hsl(var(--chart-4))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ROC Curves */}
            <div>
              <h3 className="text-md font-medium text-foreground mb-4">ROC Curves</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateROCData(dataset)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="fpr" 
                      label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis 
                      label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="XGB+SVM" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="XGB+LR" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="XGB+RF" 
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
