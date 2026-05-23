interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-11 h-11 flex items-center justify-center border border-ds-outline-variant bg-ds-surface-mid text-ds-on-variant mb-4">
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold text-ds-on-surface mb-1.5">{title}</h3>
      <p className="text-[13px] text-ds-on-variant max-w-xs leading-relaxed mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-[12px] font-semibold text-ds-on-primary bg-ds-primary hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
