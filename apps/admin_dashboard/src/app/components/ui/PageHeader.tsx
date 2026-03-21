interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div>
      <h1 className="text-gray-900">{title}</h1>
      <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}
