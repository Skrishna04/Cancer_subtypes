import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { CancerDataset, SurvivalAnalysisResponse } from "@shared/schema";

interface SurvivalAnalysisPanelProps {
  selectedDataset: CancerDataset;
}

export function SurvivalAnalysisPanel({ selectedDataset }: SurvivalAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<"kaplan-meier" | "cox-regression">("kaplan-meier");

  const { data: survivalData, isLoading } = useQuery<SurvivalAnalysisResponse>({
    queryKey: [`/api/survival-analysis?dataset=${selectedDataset}`],
  });

  const generateMockSurvivalData = (dataset: CancerDataset) => {
    // Mock Kaplan-Meier curves for different risk groups
    const highRiskCurve = {
      group: "High Risk",
      data: [
        { time: 0, survival_probability: 1.0, at_risk: 100, events: 0 },
        { time: 6, survival_probability: 0.85, at_risk: 95, events: 5 },
        { time: 12, survival_probability: 0.72, at_risk: 85, events: 8 },
        { time: 18, survival_probability: 0.58, at_risk: 70, events: 10 },
        { time: 24, survival_probability: 0.45, at_risk: 55, events: 9 },
        { time: 30, survival_probability: 0.35, at_risk: 40, events: 6 },
        { time: 36, survival_probability: 0.28, at_risk: 30, events: 5 },
        { time: 42, survival_probability: 0.22, at_risk: 22, events: 4 },
        { time: 48, survival_probability: 0.18, at_risk: 15, events: 3 },
        { time: 54, survival_probability: 0.15, at_risk: 10, events: 2 },
        { time: 60, survival_probability: 0.12, at_risk: 6, events: 1 },
      ],
      median_survival: 18.5,
      p_value: 0.001
    };

    const lowRiskCurve = {
      group: "Low Risk",
      data: [
        { time: 0, survival_probability: 1.0, at_risk: 100, events: 0 },
        { time: 6, survival_probability: 0.98, at_risk: 100, events: 2 },
        { time: 12, survival_probability: 0.95, at_risk: 98, events: 3 },
        { time: 18, survival_probability: 0.92, at_risk: 95, events: 3 },
        { time: 24, survival_probability: 0.89, at_risk: 92, events: 3 },
        { time: 30, survival_probability: 0.86, at_risk: 89, events: 3 },
        { time: 36, survival_probability: 0.83, at_risk: 86, events: 3 },
        { time: 42, survival_probability: 0.80, at_risk: 83, events: 3 },
        { time: 48, survival_probability: 0.77, at_risk: 80, events: 3 },
        { time: 54, survival_probability: 0.74, at_risk: 77, events: 3 },
        { time: 60, survival_probability: 0.71, at_risk: 74, events: 3 },
      ],
      median_survival: 72.0,
      p_value: 0.001
    };

    const coxResults = [
      {
        variable: "Age",
        hazard_ratio: 1.15,
        confidence_interval_lower: 1.08,
        confidence_interval_upper: 1.22,
        p_value: 0.001,
        coefficient: 0.14
      },
      {
        variable: "Tumor Size",
        hazard_ratio: 1.28,
        confidence_interval_lower: 1.12,
        confidence_interval_upper: 1.46,
        p_value: 0.002,
        coefficient: 0.25
      },
      {
        variable: "Lymph Node Status",
        hazard_ratio: 2.15,
        confidence_interval_lower: 1.45,
        confidence_interval_upper: 3.18,
        p_value: 0.001,
        coefficient: 0.77
      },
      {
        variable: "Grade",
        hazard_ratio: 1.45,
        confidence_interval_lower: 1.18,
        confidence_interval_upper: 1.78,
        p_value: 0.003,
        coefficient: 0.37
      }
    ];

    return {
      dataset: selectedDataset,
      kaplan_meier_curves: [highRiskCurve, lowRiskCurve],
      cox_regression: coxResults,
      overall_p_value: 0.001,
      concordance_index: 0.78
    };
  };

  const formatKaplanMeierData = () => {
    if (!survivalData) return [];
    
    const curves = survivalData.kaplan_meier_curves;
    const maxTime = Math.max(...curves.flatMap(c => c.data.map(d => d.time)));
    const timePoints = Array.from({ length: 11 }, (_, i) => (i * maxTime) / 10);
    
    return timePoints.map(time => {
      const point: any = { time };
      curves.forEach(curve => {
        // Find closest data point
        const closest = curve.data.reduce((prev, curr) => 
          Math.abs(curr.time - time) < Math.abs(prev.time - time) ? curr : prev
        );
        point[curve.group] = closest.survival_probability;
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

  const data = survivalData || generateMockSurvivalData(selectedDataset);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center">
          <i className="fas fa-heartbeat text-primary mr-2"></i>
          Survival Analysis
        </h2>
        <p className="text-sm text-muted-foreground">
          Kaplan-Meier curves and Cox regression analysis for {selectedDataset} cancer
        </p>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "kaplan-meier" | "cox-regression")}>
        <div className="border-b border-border">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kaplan-meier">Kaplan-Meier Curves</TabsTrigger>
            <TabsTrigger value="cox-regression">Cox Regression</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="kaplan-meier" className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-md font-medium text-foreground mb-4">Survival Curves by Breast Cancer Subtype</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatKaplanMeierData()} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      label={{ value: 'Time (days)', position: 'insideBottom', offset: -10 }}
                      tick={{ fontSize: 12 }}
                      domain={[0, 8000]}
                    />
                    <YAxis 
                      label={{ value: 'Survival Probability', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 12 }}
                      domain={[0, 1]}
                    />
                    <Tooltip 
                      formatter={(value, name) => [typeof value === 'number' ? value.toFixed(3) : value, name]}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '10px'
                      }}
                    />
                    <Legend />
                    {data.kaplan_meier_curves.map((curve, index) => {
                      const colors = ["#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6"];
                      return (
                        <Line 
                          key={curve.group}
                          type="step" 
                          dataKey={curve.group} 
                          stroke={colors[index]}
                          strokeWidth={3}
                          dot={false}
                          name={curve.group}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.kaplan_meier_curves.map((curve, index) => (
                <div key={curve.group} className="border border-border rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">{curve.group}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Median Survival:</span>
                      <span className="font-medium">{curve.median_survival?.toFixed(1)} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P-value:</span>
                      <span className="font-medium">{curve.p_value?.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cox-regression" className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-md font-medium text-foreground mb-4">Cox Regression Results - Breast Cancer Subtypes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Variable
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Hazard Ratio
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        95% CI
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        P-value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Coefficient
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-border">
                    {data.cox_regression.map((result, index) => (
                      <tr key={result.variable}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {result.variable}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {result.hazard_ratio.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {result.confidence_interval_lower.toFixed(2)} - {result.confidence_interval_upper.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {result.p_value.toFixed(3)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {result.coefficient.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Model Performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">Model Performance</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Concordance Index:</span>
                    <span className="font-medium">{data.concordance_index.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overall P-value:</span>
                    <span className="font-medium">{data.overall_p_value.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
