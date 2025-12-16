interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <main className={`flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar ${className}`}>
      <div className="mx-auto max-w-[1400px] flex flex-col gap-8">
        {children}
      </div>
    </main>
  );
}
