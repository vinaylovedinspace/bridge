'use client';

import { useMemo, useCallback, useState } from 'react';
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

// ==================== Constants ====================
const CHART_CONFIG = {
  HEIGHT: 250,
  BAR_CATEGORY_GAP: '25%',
  MAX_BAR_SIZE: 12,
  BAR_RADIUS: [2, 2, 0, 0] as [number, number, number, number],
  MARGIN: {
    top: 20,
    right: 40,
    left: 20,
    bottom: 40,
  },
  MIN_Y_AXIS: 10,
  Y_AXIS_PADDING: 1.2,
  Y_AXIS_ROUND_TO: 10,
} as const;

const COLORS = {
  BAR: '#6366f1',
  GRID: '#e5e7eb',
  TEXT_PRIMARY: '#6b7280',
  TEXT_DARK: '#111827',
  CURSOR: 'rgba(0, 0, 0, 0.05)',
} as const;

const TIME_PERIODS = [
  { value: '3months', label: 'Last 3 months', months: 3 },
  { value: '6months', label: 'Last 6 months', months: 6 },
  { value: '12months', label: 'Last 12 months', months: 12 },
] as const;

const MIN_DATA_THRESHOLD = 1;

// ==================== Types ====================
type AdmissionOverviewProps = {
  initialData: AdmissionStatistics;
  initialMonths: number;
};

type ChartDataItem = {
  month: string;
  fullMonth: string;
  users: number;
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataItem;
    value: number;
  }>;
};

// ==================== Sub-Components ====================

/**
 * Empty state component displayed when there's insufficient admission data
 */
function InsufficientDataState() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      role="status"
      aria-label="Insufficient data to display chart"
    >
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Calendar className="h-8 w-8 text-gray-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Need More Data</h3>
      <p className="text-sm text-gray-500 max-w-sm">
        We need more client admissions to show meaningful statistics. Start adding clients to see
        admission trends.
      </p>
    </div>
  );
}

/**
 * Custom tooltip for the bar chart
 */
function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const value = payload[0].value;
  const isPlural = Number(value) !== 1;

  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border">
      <p className="font-medium text-gray-900 mb-1">{data.fullMonth}</p>
      <p className="text-sm text-gray-600">
        {value} admission{isPlural ? 's' : ''}
      </p>
    </div>
  );
}

/**
 * Chart statistics summary
 */
type ChartSummaryProps = {
  selectedMonths: number;
  totalAdmissions: number;
};

function ChartSummary({ selectedMonths, totalAdmissions }: ChartSummaryProps) {
  const isPlural = totalAdmissions !== 1;

  return (
    <div className="text-center">
      <p className="text-sm font-medium text-muted-foreground">
        Last {selectedMonths} months - {totalAdmissions} total admission{isPlural ? 's' : ''}
      </p>
    </div>
  );
}

// ==================== Helper Functions ====================

/**
 * Calculates the maximum Y-axis value with padding
 */
function calculateYAxisMax(data: ChartDataItem[]): number {
  const maxValue = Math.max(...data.map((item) => item.users), CHART_CONFIG.MIN_Y_AXIS);

  const paddedMax = maxValue * CHART_CONFIG.Y_AXIS_PADDING;
  return Math.ceil(paddedMax / CHART_CONFIG.Y_AXIS_ROUND_TO) * CHART_CONFIG.Y_AXIS_ROUND_TO;
}

/**
 * Calculates total admissions from chart data
 */
function calculateTotalAdmissions(data: ChartDataItem[]): number {
  return data.reduce((sum, item) => sum + item.users, 0);
}

/**
 * Formats period value for select component
 */
function formatPeriodValue(months: number): string {
  return `${months}months`;
}

/**
 * Extracts months from period value string
 */
function parseMonthsFromValue(value: string): number {
  return parseInt(value.replace('months', ''), 10);
}

// ==================== Main Component ====================

export function AdmissionOverviewCard({ initialData, initialMonths }: AdmissionOverviewProps) {
  const [months, setMonths] = useState(initialMonths);
  const { data: admissionData = initialData } = useGetAdmissionStats(months, initialData);

  // Memoized calculations
  const totalAdmissions = useMemo(() => calculateTotalAdmissions(admissionData), [admissionData]);

  const yAxisMax = useMemo(() => calculateYAxisMax(admissionData), [admissionData]);

  const hasInsufficientData = totalAdmissions < MIN_DATA_THRESHOLD;

  // Event handlers
  const handleMonthsChange = useCallback((value: string) => {
    const months = parseMonthsFromValue(value);
    setMonths(months);
  }, []);

  // Render helpers
  const renderChartContent = () => {
    if (hasInsufficientData) {
      return (
        <div className="flex-1 flex items-center justify-center h-60">
          <InsufficientDataState />
        </div>
      );
    }

    return (
      <>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHT}>
            <BarChart
              data={admissionData}
              margin={CHART_CONFIG.MARGIN}
              barCategoryGap={CHART_CONFIG.BAR_CATEGORY_GAP}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRID} vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 14, fill: COLORS.TEXT_PRIMARY }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: COLORS.TEXT_PRIMARY }}
                domain={[0, yAxisMax]}
                allowDecimals={false}
                label={{
                  value: 'No. of Admissions',
                  angle: -90,
                  position: 'insideLeft',
                  style: {
                    textAnchor: 'middle',
                    fontSize: '12px',
                    fill: COLORS.TEXT_PRIMARY,
                  },
                }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: COLORS.CURSOR }} />
              <Bar
                dataKey="users"
                fill={COLORS.BAR}
                radius={CHART_CONFIG.BAR_RADIUS}
                maxBarSize={CHART_CONFIG.MAX_BAR_SIZE}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ChartSummary selectedMonths={initialMonths} totalAdmissions={totalAdmissions} />
      </>
    );
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Admission Overview</CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Calendar view">
              <Calendar className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Select value={formatPeriodValue(initialMonths)} onValueChange={handleMonthsChange}>
              <SelectTrigger className="max-w-40 h-8 text-sm" aria-label="Select time period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col h-full">{renderChartContent()}</CardContent>
    </Card>
  );
}
