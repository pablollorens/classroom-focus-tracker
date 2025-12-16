interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="icon-container-lg icon-muted mb-4">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <h3 className="text-heading text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-body text-sm max-w-md mb-6">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary btn-md">
          {action.label}
        </button>
      )}
    </div>
  );
}
