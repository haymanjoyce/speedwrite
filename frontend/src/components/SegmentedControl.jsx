export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded overflow-hidden border border-gray-200">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-3 py-1 cursor-pointer ${
            value === opt.value
              ? 'font-medium text-white bg-blue-600 hover:bg-blue-700'
              : 'font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
