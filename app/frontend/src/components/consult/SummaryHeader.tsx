interface SummaryHeaderProps {
  clientName: string;
}

export default function SummaryHeader({ clientName }: SummaryHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-[Rubik] font-bold text-indigo-800">
        Consultation Summary
      </h1>
      <p className="text-gray-600 mt-1">
        Client: <span className="font-medium">{clientName}</span>
      </p>
    </div>
  );
}