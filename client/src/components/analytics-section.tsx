import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import type { CancerDataset, MetricsResponse } from "@shared/schema";

interface AnalyticsSectionProps {
  selectedDataset: CancerDataset;
}

export function AnalyticsSection({ selectedDataset }: AnalyticsSectionProps) {
  const { data: metricsData } = useQuery<MetricsResponse>({
    queryKey: ["/api/metrics"],
  });

  const getBestModel = () => {
    if (!metricsData) return null;
    
    const allMetrics = metricsData.metrics;
    const bestModel = allMetrics.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best
    );
    
    return bestModel;
  };

  const bestModel = getBestModel();

  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Best Model Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="fas fa-trophy text-2xl text-yellow-500"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Best Performing Model</p>
              <p className="text-lg font-semibold text-foreground" data-testid="text-best-model">
                {bestModel ? `${bestModel.model.replace('_', ' + ').toUpperCase()}` : "Loading..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {bestModel ? `${(bestModel.accuracy * 100).toFixed(1)}% Accuracy` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Datasets Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="fas fa-database text-2xl text-blue-500"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Datasets</p>
              <p className="text-lg font-semibold text-foreground" data-testid="text-total-datasets">
                3 Cancer Types
              </p>
              <p className="text-sm text-muted-foreground">Breast, Gastric, Lung</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Models Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="fas fa-cogs text-2xl text-green-500"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Active Models</p>
              <p className="text-lg font-semibold text-foreground" data-testid="text-active-models">
                9 Models
              </p>
              <p className="text-sm text-muted-foreground">3 per dataset</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
