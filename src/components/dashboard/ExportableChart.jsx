export default function ExportableChart({ title, children, className = '' }) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}