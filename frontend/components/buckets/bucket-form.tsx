'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import {
  RiGraduationCapLine,
  RiSchoolLine,
  RiPassportLine,
  RiBriefcaseLine,
  RiFolder3Line,
  RiAddLine,
  RiDeleteBinLine,
} from '@remixicon/react';
import { useCreateBucket } from '@/lib/api/hooks/use-buckets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type DocType = 'aadhaar' | 'pan' | 'passport' | 'marksheet' | 'certificate' | 'income_proof' | 'photo' | 'other';
type BucketType = 'scholarship' | 'admission' | 'visa' | 'job_application' | 'custom';

const defaultChecklists: Record<Exclude<BucketType, 'custom'>, { docType: DocType; required: boolean }[]> = {
  scholarship: [
    { docType: 'marksheet', required: true },
    { docType: 'income_proof', required: true },
    { docType: 'photo', required: true },
    { docType: 'aadhaar', required: true },
    { docType: 'certificate', required: false },
  ],
  admission: [
    { docType: 'marksheet', required: true },
    { docType: 'photo', required: true },
    { docType: 'aadhaar', required: true },
    { docType: 'certificate', required: false },
  ],
  visa: [
    { docType: 'passport', required: true },
    { docType: 'photo', required: true },
    { docType: 'aadhaar', required: true },
    { docType: 'income_proof', required: false },
  ],
  job_application: [
    { docType: 'marksheet', required: true },
    { docType: 'certificate', required: true },
    { docType: 'photo', required: true },
    { docType: 'aadhaar', required: false },
  ],
};

const bucketTypeOptions: { value: BucketType; label: string; icon: React.ElementType }[] = [
  { value: 'scholarship', label: 'Scholarship', icon: RiGraduationCapLine },
  { value: 'admission', label: 'Admission', icon: RiSchoolLine },
  { value: 'visa', label: 'Visa', icon: RiPassportLine },
  { value: 'job_application', label: 'Job App', icon: RiBriefcaseLine },
  { value: 'custom', label: 'Custom', icon: RiFolder3Line },
];

const bucketSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150, 'Name is too long'),
  type: z.enum(['scholarship', 'admission', 'visa', 'job_application', 'custom']),
  description: z.string().max(500, 'Description is too long').optional(),
  checklistTemplate: z.array(z.object({
    docType: z.string(),
    required: z.boolean(),
  })).optional(),
});

type BucketFormValues = z.infer<typeof bucketSchema>;

interface BucketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BucketForm({ open, onOpenChange }: BucketFormProps) {
  const { mutate: createBucket, isPending } = useCreateBucket();

  const form = useForm<BucketFormValues>({
    resolver: zodResolver(bucketSchema),
    defaultValues: {
      name: '',
      type: 'scholarship',
      description: '',
      checklistTemplate: defaultChecklists.scholarship,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'checklistTemplate',
  });

  const watchType = form.watch('type');

  useEffect(() => {
    if (watchType !== 'custom') {
      replace(defaultChecklists[watchType]);
    } else {
      replace([]);
    }
  }, [watchType, replace]);

  const onSubmit = (data: BucketFormValues) => {
    createBucket(data, {
      onSuccess: () => {
        toast.success('Bucket created successfully');
        form.reset();
        onOpenChange(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create bucket');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Create New Bucket</DialogTitle>
          <DialogDescription>
            Create a bucket to organize documents for a specific purpose.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <form id="bucket-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="bucket-name">Bucket Name</Label>
              <Input
                id="bucket-name"
                placeholder="e.g., Fall 2024 University Admissions"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Type selector */}
            <div className="space-y-3">
              <Label>Purpose / Type</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {bucketTypeOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = field.value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-md border-2 p-3 transition-colors cursor-pointer',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-muted bg-transparent hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <Icon className="mb-2 h-5 w-5" />
                          <span className="text-xs font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="bucket-description">Description (Optional)</Label>
              <Textarea
                id="bucket-description"
                placeholder="Brief notes about what this bucket is for..."
                className="resize-none"
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Checklist Requirements</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ docType: 'other', required: false })}
                  className="h-8"
                >
                  <RiAddLine className="w-4 h-4 mr-1" /> Add Requirement
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center p-4 border rounded-md border-dashed text-sm text-muted-foreground">
                  No checklist items defined. Add items to track required documents.
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-3 p-3 border rounded-md bg-secondary/20">
                      <Controller
                        control={form.control}
                        name={`checklistTemplate.${index}.docType`}
                        render={({ field: selectField }) => (
                          <div className="flex-1">
                            <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select document type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                                <SelectItem value="pan">PAN Card</SelectItem>
                                <SelectItem value="passport">Passport</SelectItem>
                                <SelectItem value="marksheet">Marksheet</SelectItem>
                                <SelectItem value="certificate">Certificate</SelectItem>
                                <SelectItem value="income_proof">Income Proof</SelectItem>
                                <SelectItem value="photo">Photograph</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      />

                      <Controller
                        control={form.control}
                        name={`checklistTemplate.${index}.required`}
                        render={({ field: switchField }) => (
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Switch
                              checked={switchField.value}
                              onCheckedChange={switchField.onChange}
                            />
                            <Label className="text-sm font-normal cursor-pointer">
                              Required
                            </Label>
                          </div>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <RiDeleteBinLine className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="bucket-form" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Bucket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
