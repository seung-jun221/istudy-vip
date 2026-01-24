export default function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  error,
  ...props
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`
          px-4 py-3 border rounded-lg outline-none transition-all bg-white
          ${error ? 'border-red-500' : 'border-gray-300 focus:border-primary'}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
}
