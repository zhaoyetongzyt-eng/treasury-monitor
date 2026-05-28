"use client";

import ModuleHeader from "@/components/layout/ModuleHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderModule({
  id,
  number,
  title,
  titleEn,
  description,
}: {
  id: string;
  number: string;
  title: string;
  titleEn: string;
  description: string;
}) {
  return (
    <section id={id} className="py-8 px-4 max-w-7xl mx-auto scroll-mt-16">
      <ModuleHeader number={number} title={title} titleEn={titleEn} description={description} />
      <Card className="border-dashed border-slate-600/40">
        <CardHeader>
          <CardTitle className="text-base text-slate-500">模块开发中</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            该模块将在后续迭代中补充数据和图表。如需优先开发此模块，请告知。
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
