interface ModuleHeaderProps {
  number: string;
  title: string;
  titleEn: string;
  description: string;
}

export default function ModuleHeader({ number, title, titleEn, description }: ModuleHeaderProps) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-3 mb-3">
        {/* 编号徽章 — 蓝色渐变 */}
        <span className="text-sm font-mono font-bold text-white px-2.5 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
          {number}
        </span>
        {/* 中文标题 */}
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        {/* 英文副标题 */}
        <span className="text-sm text-slate-500 font-light italic">{titleEn}</span>
      </div>
      {/* 描述文字 */}
      <p className="text-sm text-slate-400 mb-4 leading-relaxed max-w-3xl">{description}</p>
      {/* 渐变分隔线 */}
      <div className="h-px bg-gradient-to-r from-blue-500/40 via-slate-600/20 to-transparent" />
    </div>
  );
}
