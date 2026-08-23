export default function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-surface space-y-4 p-4 sm:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-warmgray-700">{title}</h3>
      {children}
    </div>
  );
}
