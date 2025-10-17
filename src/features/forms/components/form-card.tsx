import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Printer } from 'lucide-react';

type FormItem = {
  id: string;
  name: string;
  title: string;
  description: string;
  sections: string[];
};

type FormCardProps = {
  form: FormItem;
  selectedClient: string | null;
  onPrint: () => void;
  onDownload: () => void;
};

export function FormCard({ form, selectedClient, onPrint, onDownload }: FormCardProps) {
  return (
    <Card
      className={`flex flex-col justify-between transition-all duration-200 ${
        selectedClient
          ? 'hover:shadow-lg border-border'
          : 'opacity-50 cursor-not-allowed border-dashed'
      }`}
      data-testid={`form-card-${form.id}`}
    >
      <CardHeader className="px-6 w-5/6 gap-y-2">
        <div className="flex gap-2 items-center">
          <FileText className="h-4 w-4 text-blue-600" />
          <Badge variant="outline" className="text-xs">
            {form.name}
          </Badge>
        </div>
        <CardTitle>{form.title}</CardTitle>

        <CardDescription className="text-xs text-muted-foreground">
          {form.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex gap-2 flex-wrap">
          {form.sections.map((section, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {section}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2 justify-between pt-4">
          <Button
            onClick={() => onPrint()}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!selectedClient}
            data-testid={`print-${form.id}`}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={() => onDownload()}
            size="sm"
            className="flex-1"
            disabled={!selectedClient}
            data-testid={`download-${form.id}`}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
