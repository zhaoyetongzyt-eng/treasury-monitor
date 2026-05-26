import { Separator } from "@/components/ui/separator";

interface ModuleHeaderProps {
  number: string;
  title: string;
  titleEn: string;
  description: string;
}

export default function ModuleHeader({ number, title, titleEn, description }: ModuleHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          {number}
        </span>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-400">{titleEn}</span>
      </div>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      <Separator />
    </div>
  );
}
