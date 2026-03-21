export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-full overflow-hidden border border-gray-200">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-3 py-0.5 transition-colors cursor-pointer ${
            value === opt.value
              ? 'text-white bg-blue-600'
              : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
