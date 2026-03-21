import SegmentedControl from './SegmentedControl'

const PROVIDER_OPTIONS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama' },
]

export default function ProviderToggle({ provider, onChange }) {
  return <SegmentedControl options={PROVIDER_OPTIONS} value={provider} onChange={onChange} />
}
