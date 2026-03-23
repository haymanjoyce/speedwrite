export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded overflow-hidden border border-gray-200">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-3 py-1 cursor-pointer ${
            value === opt.value
              ? 'text-white bg-blue-600 hover:bg-blue-700'
              : 'text-gray-600 bg-white hover:bg-gray-50 transition-colors'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
