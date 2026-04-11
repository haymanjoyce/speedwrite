export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-3 py-1 border border-gray-200 font-medium cursor-pointer ${
            i === 0 ? 'rounded-l' : 'rounded-r border-l-0'
          } ${
            value === opt.value
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
