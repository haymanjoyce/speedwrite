export default function ProviderToggle({ provider, onChange }) {
  return (
    <div className="inline-flex rounded-full overflow-hidden border border-gray-200">
      {['anthropic', 'ollama'].map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`text-xs px-3 py-0.5 transition-colors cursor-pointer capitalize ${
            provider === p
              ? 'text-white bg-blue-600'
              : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {p === 'anthropic' ? 'Anthropic' : 'Ollama'}
        </button>
      ))}
    </div>
  )
}
