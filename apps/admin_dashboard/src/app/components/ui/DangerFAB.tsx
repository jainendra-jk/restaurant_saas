interface DangerFABProps {
  icon: React.ReactNode;
  onClick: () => void;
  title?: string;
  visible?: boolean;
}

export function DangerFAB({ icon, onClick, title, visible = true }: DangerFABProps) {
  if (!visible) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-10 z-20 w-12 h-12 rounded-full bg-danger text-white shadow-lg hover:brightness-90 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center"
      title={title}
    >
      {icon}
    </button>
  );
}
