'use client';
import { useState } from 'react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdmissionStatistics } from '../../server/actions';
import { useGetAdmissionStats } from '../../hooks/use-get-admission-stats';

// Empty state component for when there's insufficient data
function InsufficientDataState() {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Calendar className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Need More Data</h3>
      <p className="text-sm text-gray-500 max-w-sm">
        We need more client admissions to show meaningful statistics. Start adding clients to see
        admission trends.
      </p>
    </div>
  );
}

type AdmissionOverviewProps = {
  initialData: AdmissionStatistics;
  initialMonths: number;
};

export function AdmissionOverviewCard({ initialData, initialMonths }: AdmissionOverviewProps) {
  const [selectedMonths, setSelectedMonths] = useState(initialMonths);

  const { data: admissionData, isLoading } = useGetAdmissionStats(initialMonths, initialData);

  // Handle dropdown change
  const handleMonthsChange = (value: string) => {
    const months = parseInt(value.replace('months', ''));
    setSelectedMonths(months);
  };

  // Check if we have meaningful data (at least 1 admission in the period)
  const totalAdmissions = admissionData.reduce((sum: number, item) => sum + item.users, 0);
  const hasInsufficientData = totalAdmissions < 1;

  // Calculate max value for Y-axis scaling
  const maxValue = Math.max(...admissionData.map((item) => item.users), 10);
  const yAxisMax = Math.ceil((maxValue * 1.2) / 10) * 10; // Round up to nearest 10 with 20% padding
  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Admission Overview</CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Calendar className="h-4 w-4" />
            </Button>
            <Select
              value={`${selectedMonths}months`}
              onValueChange={handleMonthsChange}
              disabled={isLoading}
            >
              <SelectTrigger className="max-w-40 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">Last 3 months</SelectItem>
                <SelectItem value="6months">Last 6 months</SelectItem>
                <SelectItem value="12months">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col h-full">
        {hasInsufficientData ? (
          <div className="flex-1 flex items-center justify-center">
            <InsufficientDataState />
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-gray-500">Loading admission data...</p>
          </div>
        ) : (
          <>
            <div className="min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={admissionData}
                  margin={{
                    top: 20,
                    right: 40,
                    left: 20,
                    bottom: 40,
                  }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 14, fill: '#6b7280' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    domain={[0, yAxisMax]}
                    label={{
                      value: 'No. of Admissions',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fontSize: '12px', fill: '#6b7280' },
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white px-3 py-2 rounded-lg shadow-lg border">
                            <p className="font-medium text-gray-900 mb-1">{data.fullMonth}</p>
                            <p className="text-sm text-gray-600">
                              {payload[0].value} admission
                              {Number(payload[0].value) !== 1 ? 's' : ''}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  />
                  <Bar dataKey="users" fill="#6366f1" radius={[2, 2, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Last {selectedMonths} months - {totalAdmissions} total admission
                {totalAdmissions !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
