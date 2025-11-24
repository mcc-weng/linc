import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BuyerProfile } from "@shared/schema";

interface BuyerProfileCardProps {
  profile: BuyerProfile;
}

interface ProfileField {
  label: string;
  value: string | null;
  testId: string;
}

export default function BuyerProfileCard({ profile }: BuyerProfileCardProps) {
  const fields: ProfileField[] = [
    { label: "預算", value: profile.budget, testId: "text-budget" },
    { label: "想買地區", value: profile.location, testId: "text-location" },
    { label: "房型偏好", value: profile.propertyType, testId: "text-property-type" },
    { label: "買房目的", value: profile.purpose, testId: "text-purpose" },
    { label: "時間需求", value: profile.timeline, testId: "text-timeline" },
    { label: "特殊條件", value: profile.notes, testId: "text-notes" },
  ];

  return (
    <Card className="rounded-xl" data-testid="card-buyer-profile">
      <CardHeader>
        <CardTitle className="text-lg font-medium">買家資料</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.label} className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
              <p className="text-base" data-testid={field.testId}>
                {field.value || "--"}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
